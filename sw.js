/* CardioPed - Service Worker.
   Estrategia: el documento principal (index.html) se pide SIEMPRE a la red primero, para que
   una actualización de la app llegue de inmediato en cuanto haya internet; solo se usa la copia
   guardada cuando de verdad no hay conexión. Los archivos que casi nunca cambian (íconos,
   manifest) sí se sirven directo del caché para que la app abra rápido. */
const CACHE_NAME = 'cardioped-v2';
const ARCHIVOS_APP = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ARCHIVOS_APP))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((nombres) =>
      Promise.all(nombres.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

function esPeticionCacheable(request){
  // Solo http/https; ignora chrome-extension:// y otros esquemas que no se pueden cachear.
  return request.url.startsWith('http://') || request.url.startsWith('https://');
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const esNavegacion = req.mode === 'navigate' || req.destination === 'document';

  if (esNavegacion) {
    // Documento principal: red primero (para tomar actualizaciones), caché como respaldo offline.
    event.respondWith(
      fetch(req).then((respuestaRed) => {
        if (esPeticionCacheable(req)) {
          const copia = respuestaRed.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copia));
        }
        return respuestaRed;
      }).catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
    );
    return;
  }

  // Resto de archivos: caché primero, red como respaldo.
  event.respondWith(
    caches.match(req).then((respuestaCache) => {
      if (respuestaCache) return respuestaCache;
      return fetch(req).then((respuestaRed) => {
        if (esPeticionCacheable(req)) {
          const copia = respuestaRed.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copia));
        }
        return respuestaRed;
      }).catch(() => respuestaCache);
    })
  );
});

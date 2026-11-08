// バージョンを変更するだけで旧キャッシュが完全に吹き飛びます
const CACHE_NAME = 'onsite-photo-verification-v1.5';

const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icon_onsite-photo-verification.jpg'
];

// インストール処理：即座に待機状態をスキップ
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

// アクティベート処理：古いキャッシュを絶対に残さず全消去する
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[ServiceWorker] 古いキャッシュを削除:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // コントロールを即座に奪取
      return self.clients.claim();
    })
  );
});

// フェッチ処理：Network First（ネットワークを優先し、失敗したらキャッシュを返す）
self.addEventListener('fetch', (event) => {
  // GETリクエスト以外はそのままネットワークへ
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // ネットワーク通信成功時はキャッシュを最新版で上書き
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // オフライン時はキャッシュから返す
        return caches.match(event.request);
      })
  );
});

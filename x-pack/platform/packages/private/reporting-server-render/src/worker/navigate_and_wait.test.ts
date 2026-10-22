/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import http from 'http';
import type { AddressInfo } from 'net';
import { LoopbackHttpClient } from '../services/loopback_http_client';
import { createHeadlessDomEnvironment } from './headless_dom_environment';
import {
  injectScreenshotContextScript,
  installScreenshotContextBridge,
  runDocumentScripts,
  waitForGridRows,
  waitForQuiescence,
  waitForRenderComplete,
} from './navigate_and_wait';

/**
 * Exercises the full Phase 2 navigation mechanism end to end -- screenshot-context
 * injection, running a real `<script src>` fetched over loopback, and polling for
 * render-complete -- against a tiny local HTTP server standing in for Kibana, since none of
 * this can be meaningfully unit tested against a mock DOM (it IS the "boot a real page"
 * mechanism). The live-Kibana proof (a real saved `lnsXY` dashboard) is Phase 2's dev-server
 * exit criterion, tracked separately; this test proves the mechanism is sound.
 */
describe('navigate_and_wait', () => {
  let server: http.Server;
  let baseUrl: string;

  const pageHtml = `<!doctype html><html><head></head><body>
    <div data-shared-items-container data-shared-items-count="2"></div>
    <script src="/bundle.js"></script>
  </body></html>`;

  // Simulates a real panel bundle: reads the screenshot context (as `redirect_app.tsx`'s
  // `share.navigate(locatorParams)` flow and a real embeddable would), and renders two
  // panels asynchronously (as real panels render after their own data fetch resolves).
  const bundleJs = `
    var ctx = window.__KBN_SCREENSHOT_CONTEXT__.locatorParams;
    var container = document.querySelector('[data-shared-items-container]');
    setTimeout(function () {
      for (var i = 0; i < 2; i++) {
        var el = document.createElement('div');
        el.setAttribute('data-shared-item', '');
        el.setAttribute('data-locator-id', ctx.id);
        container.appendChild(el);
      }
    }, 20);
  `;

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      if (req.url === '/bundle.js') {
        res.writeHead(200, { 'content-type': 'application/javascript' });
        res.end(bundleJs);
        return;
      }
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end(pageHtml);
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('injects screenshot context, runs the real bundle, and waits for render completion', async () => {
    const client = new LoopbackHttpClient({ baseUrl, forwardedHeaders: {} });
    const html = injectScreenshotContextScript(pageHtml, {
      locatorParams: { id: 'TEST_DASHBOARD_LOCATOR' },
    });

    const env = createHeadlessDomEnvironment({
      loopbackHttpClient: client,
      html,
      url: `${baseUrl}/`,
    });
    try {
      installScreenshotContextBridge(env);
      await runDocumentScripts(env, env.usageLog);

      const { renderErrors } = await waitForRenderComplete(env.document, {
        timeoutMs: 2000,
        pollIntervalMs: 20,
      });

      expect(renderErrors).toEqual([]);
      const items = Array.from(env.document.querySelectorAll('[data-shared-item]'));
      expect(items).toHaveLength(2);
      expect(items[0].getAttribute('data-locator-id')).toBe('TEST_DASHBOARD_LOCATOR');
    } finally {
      env.dispose();
    }
  });

  it('still injects screenshot context on a strict-CSP page (our own bootstrap script is exempt)', async () => {
    // Real Kibana pages declare strict CSP via this marker; a real browser would block any
    // un-nonced inline `<script>` the page itself authors, but our own injected
    // screenshot-context script is the jsdom equivalent of a CDP `evaluateOnNewDocument` hook
    // (see `injectScreenshotContextScript`'s doc comment) and must still run.
    const strictCspHtml = `<!doctype html><html><head>
      <kbn-csp data="${JSON.stringify({ strictCsp: true }).replace(/"/g, '&quot;')}"></kbn-csp>
    </head><body>
      <div data-shared-items-container data-shared-items-count="1"></div>
      <script src="/bundle.js"></script>
    </body></html>`;

    const client = new LoopbackHttpClient({ baseUrl, forwardedHeaders: {} });
    const html = injectScreenshotContextScript(strictCspHtml, {
      locatorParams: { id: 'STRICT_CSP_LOCATOR' },
    });

    const env = createHeadlessDomEnvironment({
      loopbackHttpClient: client,
      html,
      url: `${baseUrl}/`,
    });
    try {
      installScreenshotContextBridge(env);
      await runDocumentScripts(env, env.usageLog);

      const { renderErrors } = await waitForRenderComplete(env.document, {
        timeoutMs: 2000,
        pollIntervalMs: 20,
      });

      expect(renderErrors).toEqual([]);
      const items = Array.from(env.document.querySelectorAll('[data-shared-item]'));
      expect(items[0].getAttribute('data-locator-id')).toBe('STRICT_CSP_LOCATOR');
    } finally {
      env.dispose();
    }
  });

  it('waits for a data-render-complete="false" element to flip before resolving (Phase 4 Tier 5 finding)', async () => {
    // Simulates an embeddable (e.g. Lens's lnsDatatable) that mounts its wrapper element
    // synchronously but marks it still-rendering, then finishes asynchronously later --
    // counting `[data-shared-item]` elements alone (this function's pre-Phase-4 behavior)
    // would resolve immediately, before the panel's real content ever appears.
    const slowRenderHtml = `<!doctype html><html><head></head><body>
      <div data-shared-items-container data-shared-items-count="1"></div>
      <script src="/bundle.js"></script>
    </body></html>`;
    const slowRenderBundle = `
      var container = document.querySelector('[data-shared-items-container]');
      var el = document.createElement('div');
      el.setAttribute('data-shared-item', '');
      el.setAttribute('data-render-complete', 'false');
      container.appendChild(el);
      setTimeout(function () {
        el.setAttribute('data-render-complete', 'true');
      }, 60);
    `;
    const slowServer = http.createServer((req, res) => {
      if (req.url === '/bundle.js') {
        res.writeHead(200, { 'content-type': 'application/javascript' });
        res.end(slowRenderBundle);
        return;
      }
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end(slowRenderHtml);
    });
    await new Promise<void>((resolve) => slowServer.listen(0, '127.0.0.1', resolve));
    const { port } = slowServer.address() as AddressInfo;
    const slowBaseUrl = `http://127.0.0.1:${port}`;

    try {
      const client = new LoopbackHttpClient({ baseUrl: slowBaseUrl, forwardedHeaders: {} });
      const env = createHeadlessDomEnvironment({
        loopbackHttpClient: client,
        html: slowRenderHtml,
        url: `${slowBaseUrl}/`,
      });
      try {
        await runDocumentScripts(env, env.usageLog);

        const startedAt = Date.now();
        await waitForRenderComplete(env.document, { timeoutMs: 2000, pollIntervalMs: 10 });
        // Resolved only once the attribute flipped (~60ms later), not immediately on mount.
        expect(Date.now() - startedAt).toBeGreaterThanOrEqual(50);

        const item = env.document.querySelector('[data-shared-item]')!;
        expect(item.getAttribute('data-render-complete')).toBe('true');
      } finally {
        env.dispose();
      }
    } finally {
      await new Promise<void>((resolve) => slowServer.close(() => resolve()));
    }
  });

  it(
    'flushes window.requestAnimationFrame each poll so a RAF-deferred render-complete ' +
      "resolves (confirmed live: Elastic Charts' xyVis/metricVis panels schedule the " +
      '`onRenderChange` callback that flips `data-render-complete` inside a ' +
      '`requestAnimationFrame` callback -- without flushing the fake RAF queue here, those ' +
      'panels reached `Panel:<type>:renderStart` and then hung forever, while ' +
      "`lens_datatable_renderer`, which doesn't defer through RAF, completed normally)",
    async () => {
      const rafRenderHtml = `<!doctype html><html><head></head><body>
      <div data-shared-items-container data-shared-items-count="1"></div>
      <script src="/bundle.js"></script>
    </body></html>`;
      const rafRenderBundle = `
      var container = document.querySelector('[data-shared-items-container]');
      var el = document.createElement('div');
      el.setAttribute('data-shared-item', '');
      el.setAttribute('data-render-complete', 'false');
      container.appendChild(el);
      requestAnimationFrame(function () {
        el.setAttribute('data-render-complete', 'true');
      });
    `;
      const rafServer = http.createServer((req, res) => {
        if (req.url === '/bundle.js') {
          res.writeHead(200, { 'content-type': 'application/javascript' });
          res.end(rafRenderBundle);
          return;
        }
        res.writeHead(200, { 'content-type': 'text/html' });
        res.end(rafRenderHtml);
      });
      await new Promise<void>((resolve) => rafServer.listen(0, '127.0.0.1', resolve));
      const { port } = rafServer.address() as AddressInfo;
      const rafBaseUrl = `http://127.0.0.1:${port}`;

      try {
        const client = new LoopbackHttpClient({ baseUrl: rafBaseUrl, forwardedHeaders: {} });
        const env = createHeadlessDomEnvironment({
          loopbackHttpClient: client,
          html: rafRenderHtml,
          url: `${rafBaseUrl}/`,
        });
        try {
          await runDocumentScripts(env, env.usageLog);

          // Without `flushAnimationFrames`, this would time out: nothing else in this
          // environment ever drains the fake RAF queue `requestAnimationFrame` pushed onto.
          await waitForRenderComplete(env.document, {
            timeoutMs: 500,
            pollIntervalMs: 10,
            flushAnimationFrames: env.flushAnimationFrames,
          });

          const item = env.document.querySelector('[data-shared-item]')!;
          expect(item.getAttribute('data-render-complete')).toBe('true');
        } finally {
          env.dispose();
        }
      } finally {
        await new Promise<void>((resolve) => rafServer.close(() => resolve()));
      }
    }
  );

  it('throws a clear error when render-complete never happens before the timeout', async () => {
    const client = new LoopbackHttpClient({ baseUrl, forwardedHeaders: {} });
    const env = createHeadlessDomEnvironment({
      loopbackHttpClient: client,
      html: pageHtml, // no bundle executed -> items never appear
      url: `${baseUrl}/`,
    });
    try {
      await expect(
        waitForRenderComplete(env.document, { timeoutMs: 150, pollIntervalMs: 20 })
      ).rejects.toThrow(/Timed out/);
    } finally {
      env.dispose();
    }
  });
});

describe('waitForQuiescence / waitForGridRows', () => {
  const makeEnv = () => createHeadlessDomEnvironment();

  it('waitForQuiescence resolves only after content stops changing', async () => {
    const env = makeEnv();
    try {
      env.document.body.innerHTML = '<div data-shared-item data-render-complete="true"></div>';
      const item = env.document.querySelector('[data-shared-item]')!;
      // Content keeps arriving for ~250ms after "renderComplete".
      const timer = setInterval(() => {
        item.appendChild(env.document.createElement('p'));
      }, 50);
      setTimeout(() => clearInterval(timer), 250);

      const start = Date.now();
      await waitForQuiescence(env, { idleMs: 150, maxMs: 3000 });

      expect(Date.now() - start).toBeGreaterThanOrEqual(350);
      expect(item.children.length).toBeGreaterThan(3);
    } finally {
      env.dispose();
    }
  });

  it('waitForQuiescence is bounded by maxMs and logs instead of throwing', async () => {
    const env = makeEnv();
    try {
      env.document.body.innerHTML = '<div data-shared-item data-render-complete="false"></div>';
      await waitForQuiescence(env, { idleMs: 50, maxMs: 200 });
      expect(env.usageLog.getEntries().map((e) => e.name)).toContain('quiescence.timeout');
    } finally {
      env.dispose();
    }
  });

  it('waitForGridRows waits for a late row, and accepts a header-only grid as empty', async () => {
    const env = makeEnv();
    try {
      env.document.body.innerHTML =
        '<div class="euiDataGrid" id="late"><div class="euiDataGrid__content" aria-rowcount="5"></div></div>' +
        '<div class="euiDataGrid"><div class="euiDataGrid__content" aria-rowcount="1"></div></div>';
      const late = env.document.getElementById('late')!;
      setTimeout(() => {
        const cell = env.document.createElement('div');
        cell.className = 'euiDataGridRowCell';
        late.appendChild(cell);
      }, 150);

      const start = Date.now();
      await waitForGridRows(env, { timeoutMs: 2000 });

      expect(Date.now() - start).toBeGreaterThanOrEqual(100);
      expect(env.usageLog.getEntries().map((e) => e.name)).not.toContain('gridRows.timeout');
    } finally {
      env.dispose();
    }
  });
});

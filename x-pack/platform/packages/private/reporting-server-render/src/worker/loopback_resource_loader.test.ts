/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import http from 'http';
import type { AddressInfo } from 'net';
import { LoopbackHttpClient } from '../services/loopback_http_client';
import {
  LoopbackResourceLoader,
  installLoopbackFetch,
  installLoopbackXhr,
} from './loopback_resource_loader';
import { ShimUsageLog } from './shim_usage_log';

describe('loopback_resource_loader', () => {
  let server: http.Server;
  let baseUrl: string;
  let lastRequest: { headers: http.IncomingHttpHeaders; url?: string } | undefined;

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      lastRequest = { headers: req.headers, url: req.url };
      if (req.url === '/not-found') {
        res.writeHead(404);
        res.end();
        return;
      }
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true, url: req.url }));
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  const makeClient = () =>
    new LoopbackHttpClient({ baseUrl, forwardedHeaders: { cookie: 'sid=test' } });

  describe('LoopbackResourceLoader', () => {
    it('routes a loopback script URL through the client with forwarded headers', async () => {
      const client = makeClient();
      const usageLog = new ShimUsageLog();
      const loader = new LoopbackResourceLoader(client, usageLog);

      const buffer = await loader.fetch(`${baseUrl}/bundles/kibana.bundle.js`, {});
      const parsed = JSON.parse((buffer as Buffer).toString());

      expect(parsed).toEqual({ ok: true, url: '/bundles/kibana.bundle.js' });
      expect(lastRequest?.headers.cookie).toBe('sid=test');
      expect(usageLog.getEntries().map((e) => e.name)).toContain('resourceLoader.loopbackFetch');
    });

    it('falls back to the default loader for a non-loopback URL (data:)', async () => {
      const client = makeClient();
      const usageLog = new ShimUsageLog();
      const loader = new LoopbackResourceLoader(client, usageLog);

      const buffer = await loader.fetch('data:text/plain,hello');
      expect((buffer as Buffer).toString()).toBe('hello');
      expect(usageLog.getEntries().map((e) => e.name)).toContain('resourceLoader.passthrough');
    });

    it('rejects when the loopback server responds with a non-2xx status', async () => {
      const client = makeClient();
      const loader = new LoopbackResourceLoader(client, new ShimUsageLog());
      await expect(loader.fetch(`${baseUrl}/not-found`, {})).rejects.toThrow(/404/);
    });
  });

  describe('installLoopbackFetch', () => {
    it('resolves a relative path against the client and forwards headers', async () => {
      const client = makeClient();
      const win: { fetch?: unknown } = {};
      installLoopbackFetch(win, client, new ShimUsageLog());

      const response = await (win.fetch as typeof fetch)('/internal/some/route');
      const body = await response.json();

      expect(body).toEqual({ ok: true, url: '/internal/some/route' });
      expect(lastRequest?.headers.cookie).toBe('sid=test');
    });

    it('reads method/headers/body off a `Request` passed as the sole argument', async () => {
      // `@kbn/core`'s own HTTP fetch interceptor calls `fetch(new Request(url, init))` rather
      // than `fetch(url, init)` -- without reading the method/body off the `Request` object
      // itself, this previously silently downgraded every such call to a bodyless GET.
      const received = new Promise<{ method?: string; body: string }>((resolve) => {
        server.once('request', (req) => {
          let data = '';
          req.on('data', (chunk) => (data += chunk));
          req.on('end', () => resolve({ method: req.method, body: data }));
        });
      });
      const client = makeClient();
      const win: { fetch?: unknown } = {};
      installLoopbackFetch(win, client, new ShimUsageLog());

      const request = new Request(`${baseUrl}/internal/post-route`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ hello: 'world' }),
      });
      await (win.fetch as typeof fetch)(request);

      expect(await received).toEqual({ method: 'POST', body: JSON.stringify({ hello: 'world' }) });
    });

    it('refuses a non-loopback absolute URL', async () => {
      const client = makeClient();
      const win: { fetch?: unknown } = {};
      const usageLog = new ShimUsageLog();
      installLoopbackFetch(win, client, usageLog);

      await expect((win.fetch as typeof fetch)('https://evil.example/x')).rejects.toThrow(
        /refusing non-loopback origin/
      );
    });
  });

  describe('installLoopbackXhr', () => {
    it('performs a GET and populates status/responseText via onload', async () => {
      const client = makeClient();
      const win: { XMLHttpRequest?: unknown } = {};
      installLoopbackXhr(win, client, new ShimUsageLog());

      const XHR = win.XMLHttpRequest as typeof XMLHttpRequest;
      const xhr = new XHR();
      const loaded = new Promise<void>((resolve) => {
        xhr.onload = () => resolve();
      });
      xhr.open('GET', '/internal/xhr-route');
      xhr.send();
      await loaded;

      expect(xhr.status).toBe(200);
      expect(JSON.parse(xhr.responseText)).toEqual({ ok: true, url: '/internal/xhr-route' });
    });
  });
});

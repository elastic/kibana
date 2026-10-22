/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import http from 'http';
import zlib from 'zlib';
import type { AddressInfo } from 'net';
import { LoopbackHttpClient } from './loopback_http_client';

describe('Spike B: LoopbackHttpClient', () => {
  let server: http.Server;
  let baseUrl: string;
  let lastRequest: { headers: http.IncomingHttpHeaders; url?: string; body: string } | undefined;

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', () => {
        lastRequest = { headers: req.headers, url: req.url, body };
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      });
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('forwards the report job headers, basePath, kbn-xsrf, and internal origin', async () => {
    const client = new LoopbackHttpClient({
      baseUrl,
      basePath: '/abc123',
      forwardedHeaders: {
        cookie: 'sid=test-session',
        authorization: 'Bearer test-token',
      },
    });

    const result = await client.fetchJson<{ ok: boolean }>('/internal/some/route');

    expect(result).toEqual({ ok: true });
    expect(lastRequest?.url).toBe('/abc123/internal/some/route');
    expect(lastRequest?.headers.cookie).toBe('sid=test-session');
    expect(lastRequest?.headers.authorization).toBe('Bearer test-token');
    expect(lastRequest?.headers['kbn-xsrf']).toBe('reporting-server-render');
    expect(lastRequest?.headers['x-elastic-internal-origin']).toBe('kibana');
  });

  it("never double-prefixes basePath for a path that's already basePath-qualified", async () => {
    // Regression test for a real failure: `LoopbackResourceLoader`/`installLoopbackFetch`
    // extract the path straight off an *absolute* URL the page itself produced (a `<link
    // href>`/`<script src>`, or `window.fetch`'s own URL target) -- Kibana's own
    // rendering/asset code already bakes `basePath` into those, so passing that path to
    // `fetch`/`fetchJson` must not prefix it a second time. Confirmed live: with
    // `basePath: '/mje'`, every bundle/asset/API request doubled to `/mje/mje/...` and
    // 404'd until `resolveUrl` became idempotent here.
    const client = new LoopbackHttpClient({
      baseUrl,
      basePath: '/abc123',
      forwardedHeaders: {},
    });

    await client.fetchJson('/abc123/internal/some/route');

    expect(lastRequest?.url).toBe('/abc123/internal/some/route');
  });

  it('never leans on raw socket headers from the forwarded set (host/connection/content-length)', async () => {
    const client = new LoopbackHttpClient({
      baseUrl,
      forwardedHeaders: {
        host: 'should-not-be-forwarded.example',
        connection: 'should-not-be-forwarded',
        'content-length': '999',
      },
    });

    await client.fetchJson('/internal/some/route');

    expect(lastRequest?.headers.host).not.toBe('should-not-be-forwarded.example');
    expect(lastRequest?.headers.connection).not.toBe('should-not-be-forwarded');
  });

  it("never forwards the originating POST's body-framing headers onto this client's own requests", async () => {
    // Regression test for a real failure: a report job's decrypted headers are the
    // *original* browser POST that created the job (`content-type: application/json`,
    // `transfer-encoding: chunked`). Forwarding those onto this client's own bodyless GETs
    // (fetching the redirect page/bundles/APIs) made a live dev Kibana 404 every one of
    // those requests -- the exact same routes 200 without the stale headers riding along.
    const client = new LoopbackHttpClient({
      baseUrl,
      forwardedHeaders: {
        'content-type': 'application/json',
        'transfer-encoding': 'chunked',
      },
    });

    await client.fetch('/internal/some/route');

    expect(lastRequest?.headers['content-type']).not.toBe('application/json');
    expect(lastRequest?.headers['transfer-encoding']).toBeUndefined();
  });

  it('accepts a gzip-compressed, chunked response (the combo global `fetch` rejects)', async () => {
    // Regression test for a real failure: an authenticated, gzip-compressed 200 from a dev
    // Kibana's `/api/saved_objects/...` route sends both `content-encoding: gzip` and
    // `transfer-encoding: chunked`. Node's global `fetch` (undici) throws
    // `TypeError: fetch failed` / `cause: invalid transfer-encoding header` for this exact,
    // legitimate response shape, which is why `LoopbackHttpClient` defaults to
    // `nodeHttpFetch` instead. This test exercises that default end-to-end against a real
    // gzip'd, chunked HTTP response.
    const gzipServer = http.createServer((req, res) => {
      const payload = zlib.gzipSync(Buffer.from(JSON.stringify({ ok: true, gz: true })));
      res.writeHead(200, { 'content-type': 'application/json', 'content-encoding': 'gzip' });
      res.end(payload);
    });
    await new Promise<void>((resolve) => gzipServer.listen(0, '127.0.0.1', resolve));
    const { port } = gzipServer.address() as AddressInfo;

    try {
      const client = new LoopbackHttpClient({
        baseUrl: `http://127.0.0.1:${port}`,
        forwardedHeaders: {},
      });

      const result = await client.fetchJson<{ ok: boolean; gz: boolean }>('/internal/some/route');

      expect(result).toEqual({ ok: true, gz: true });
    } finally {
      await new Promise<void>((resolve) => gzipServer.close(() => resolve()));
    }
  });
});

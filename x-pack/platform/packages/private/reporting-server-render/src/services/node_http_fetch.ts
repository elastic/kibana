/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import http from 'node:http';
import https from 'node:https';
import zlib from 'node:zlib';
import { Readable } from 'node:stream';

/**
 * A `fetch`-compatible function backed by Node's classic `http`/`https` client instead of
 * the global `fetch` (undici). `LoopbackHttpClient` uses this as its default transport.
 *
 * Why not just use `fetch`: undici's HTTP/1.1 parser (`llhttp`, in strict mode) rejects any
 * response carrying both a `Transfer-Encoding` and a `Content-Length` header with
 * `TypeError: fetch failed` / `cause: invalid transfer-encoding header` -- a defensible
 * anti-request-smuggling stance for a general-purpose client talking to an untrusted
 * server, but one that broke every authenticated, compressed (`content-encoding: gzip`)
 * response from this *same-host* dev Kibana instance (confirmed live: an unauthenticated,
 * uncompressed 401 from `/api/saved_objects/...` fetches fine with undici; the
 * authenticated, gzip-compressed 200 for the same route does not, while Chrome's own
 * `fetch` happily accepts the identical response). Node's older `http`/`https` client has
 * never enforced this and transparently handles the exact responses Chromium-based
 * Reporting already trusts implicitly today -- this restores that same leniency for a
 * client whose only job is to replicate what a navigated browser page does.
 */
export const nodeHttpFetch = async (url: string, init: RequestInit = {}): Promise<Response> => {
  const parsed = new URL(url);
  const transport = parsed.protocol === 'https:' ? https : http;
  const headers: Record<string, string> = {};
  if (init.headers) {
    new Headers(init.headers).forEach((value, key) => {
      headers[key] = value;
    });
  }

  const body =
    init.body == null
      ? undefined
      : typeof init.body === 'string'
      ? init.body
      : init.body instanceof Uint8Array
      ? Buffer.from(init.body)
      : String(init.body);

  return new Promise<Response>((resolve, reject) => {
    const req = transport.request(parsed, { method: init.method ?? 'GET', headers }, (res) => {
      const chunks: Buffer[] = [];
      const encoding = (res.headers['content-encoding'] || '').toLowerCase();
      const decompressed: NodeJS.ReadableStream =
        encoding === 'gzip'
          ? res.pipe(zlib.createGunzip())
          : encoding === 'br'
          ? res.pipe(zlib.createBrotliDecompress())
          : encoding === 'deflate'
          ? res.pipe(zlib.createInflate())
          : res;
      decompressed.on('data', (chunk: Buffer) => chunks.push(chunk));
      decompressed.on('end', () => {
        const bodyBuffer = Buffer.concat(chunks);
        const responseHeaders = new Headers();
        for (const [key, value] of Object.entries(res.headers)) {
          if (value === undefined) continue;
          responseHeaders.set(key, Array.isArray(value) ? value.join(', ') : value);
        }
        resolve(
          new Response(bodyBuffer.length > 0 ? bodyBuffer : null, {
            status: res.statusCode ?? 0,
            statusText: res.statusMessage,
            headers: responseHeaders,
          })
        );
      });
      decompressed.on('error', reject);
    });
    req.on('error', reject);
    if (body !== undefined) {
      if (typeof body === 'string' || Buffer.isBuffer(body)) {
        req.end(body);
      } else {
        Readable.from(body as unknown as Iterable<unknown>).pipe(req);
      }
    } else {
      req.end();
    }
  });
};

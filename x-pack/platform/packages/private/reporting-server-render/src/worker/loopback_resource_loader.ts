/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FetchOptions } from 'jsdom';
import type { LoopbackHttpClient } from '../services/loopback_http_client';
import { nodeHttpFetch } from '../services/node_http_fetch';
import type { ShimUsageLog } from './shim_usage_log';

// eslint-disable-next-line @typescript-eslint/no-var-requires, import/order
const { ResourceLoader } = require('jsdom') as typeof import('jsdom');

/**
 * jsdom's `ResourceLoader` is what fetches everything a `<script src>`/`<link rel=
 * stylesheet>`/`@font-face` tag asks for -- this is how the real Kibana bundles, their CSS,
 * and their fonts get loaded into the worker, over the same loopback connection and with
 * the same forwarded user headers {@link LoopbackHttpClient} already applies for API calls
 * (see that file's doc comment on why this stays a real HTTP hop rather than bypassing
 * Kibana's HTTP layer). Non-loopback URLs (a `data:` URL inline source map, for instance)
 * fall back to jsdom's default implementation unchanged.
 */
export class LoopbackResourceLoader extends ResourceLoader {
  /**
   * Bodies of every stylesheet fetched for a `<link rel="stylesheet">`, by URL. jsdom parses
   * them with `cssom`, which silently drops syntax it doesn't understand; the raw text is
   * what `collect_page_css.ts` hands to the CSS lowering instead.
   */
  readonly stylesheets = new Map<string, string>();

  constructor(
    private readonly client: LoopbackHttpClient,
    private readonly usageLog: ShimUsageLog
  ) {
    super();
  }

  fetch(urlString: string, options: FetchOptions = {}) {
    // `blob:` URLs here are only ever ones this environment's own `window.URL.createObjectURL`
    // shim created (see `headless_dom_environment.ts`), backed by Node's native Object URL
    // registry -- jsdom's default resource loader has no concept of `blob:` URLs at all, so
    // resolving them needs Node's own global `fetch`, which (uniquely) knows how to look them
    // back up. This is how a `<img src="blob:...">` created by MapLibre GL JS's tile decoder
    // actually gets its bytes.
    if (urlString.startsWith('blob:')) {
      this.usageLog.record('resourceLoader.blobFetch', urlString);
      return fetch(urlString).then(async (response) =>
        Buffer.from(await response.arrayBuffer())
      ) as ReturnType<InstanceType<typeof ResourceLoader>['fetch']>;
    }

    if (!this.isLoopbackUrl(urlString)) {
      this.usageLog.record('resourceLoader.passthrough', urlString);
      return super.fetch(urlString, options);
    }

    this.usageLog.record('resourceLoader.loopbackFetch', urlString);

    const controller = new AbortController();
    const promise = this.client
      .fetch(this.toPath(urlString), {
        headers: options?.accept ? { accept: options.accept } : undefined,
        signal: controller.signal,
      })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Resource was not loaded. Status: ${response.status}`);
        }
        const body = Buffer.from(await response.arrayBuffer());
        const isStylesheet =
          (options?.element as { localName?: string } | undefined)?.localName === 'link' ||
          (response.headers.get('content-type') ?? '').includes('text/css');
        if (isStylesheet) {
          this.stylesheets.set(urlString, body.toString('utf8'));
        }
        return body;
      }) as ReturnType<InstanceType<typeof ResourceLoader>['fetch']>;

    (promise as unknown as { abort: () => void }).abort = () => controller.abort();
    return promise;
  }

  private isLoopbackUrl(urlString: string): boolean {
    try {
      return new URL(urlString).origin === new URL(this.client.resolveUrl('/')).origin;
    } catch {
      return false;
    }
  }

  private toPath(urlString: string): string {
    const url = new URL(urlString);
    return `${url.pathname}${url.search}`;
  }
}

/**
 * Installs `window.fetch` routed through the same {@link LoopbackHttpClient}, for
 * application code (Kibana's own `core.http` service, and any plugin that calls `fetch`
 * directly) rather than only tag-driven resource loading. Deliberately rejects any URL that
 * doesn't resolve to the loopback origin instead of falling through to a real network
 * fetch: a report render has no legitimate reason to reach a third-party origin, and
 * silently allowing it would be a bigger risk than a render failing loudly.
 */
/**
 * Elastic Maps Service: the one third-party origin a report may reach. Kibana's own map
 * (and so the Chromium pipeline) loads the basemap manifest, style, sprite, tiles and fonts
 * from here; without it the EMS basemap layer never bootstraps in the booted client.
 * Allow-listed explicitly, never by wildcard, and fetched *without* the report's forwarded
 * user headers.
 */
export const DEFAULT_ALLOWED_EXTERNAL_ORIGINS: readonly string[] = [
  'https://tiles.maps.elastic.co',
  'https://vector.maps.elastic.co',
];

export const installLoopbackFetch = (
  window: { fetch?: unknown },
  client: LoopbackHttpClient,
  usageLog: ShimUsageLog,
  allowedExternalOrigins: readonly string[] = DEFAULT_ALLOWED_EXTERNAL_ORIGINS
): void => {
  window.fetch = async (input: unknown, init?: RequestInit) => {
    // A caller may pass a `Request` object as the sole argument (as `@kbn/core`'s HTTP fetch
    // interceptor does, `fetch(new Request(url, { method, body, headers }))`) rather than a
    // URL plus a separate `init`. In that case `init` is `undefined` here, so the request's
    // own method/headers/body must be read off the `Request` instance itself -- otherwise
    // every such call silently degrades to a bodyless GET, regardless of the real method.
    const isRequestLike = typeof input === 'object' && input !== null && 'url' in input;
    const urlString =
      typeof input === 'string'
        ? input
        : input instanceof URL
        ? input.toString()
        : (input as Request).url;

    const resolved = urlString.startsWith('http') ? urlString : client.resolveUrl(urlString);
    let origin: string;
    try {
      origin = new URL(resolved).origin;
    } catch {
      throw new Error(`fetch: could not parse URL "${urlString}"`);
    }
    if (origin !== new URL(client.resolveUrl('/')).origin) {
      if (allowedExternalOrigins.includes(origin)) {
        usageLog.record('fetch.external', resolved);
        const externalInit: RequestInit = { ...(init ?? {}) };
        delete externalInit.signal;
        return nodeHttpFetch(resolved, externalInit);
      }
      throw new Error(
        `fetch: refusing non-loopback origin "${origin}" from inside the reporting worker`
      );
    }

    usageLog.record('fetch', urlString);
    const path = resolved.slice(origin.length);
    if (init) {
      return client.fetch(path, init);
    }
    if (isRequestLike) {
      const request = input as Request;
      const body = ['GET', 'HEAD'].includes(request.method) ? undefined : await request.text();
      return client.fetch(path, {
        method: request.method,
        headers: request.headers,
        body,
      });
    }
    return client.fetch(path);
  };
};

export { installLoopbackXhr } from './loopback_xhr';

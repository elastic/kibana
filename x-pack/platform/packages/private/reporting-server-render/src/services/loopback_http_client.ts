/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { nodeHttpFetch } from './node_http_fetch';

/**
 * Headers forwarded from the originating report request. The export type decrypts these
 * from the job payload the same way `ExportType.getFakeRequest` does for the
 * Chromium-based export types; nothing here changes the auth model from what Reporting
 * already does, it just makes the same decrypted headers available to `fetch` calls made
 * from the worker instead of to a navigated browser page.
 */
export type ForwardedHeaders = Record<string, string | string[] | undefined>;

/** Narrower than `typeof fetch` -- just enough surface for `nodeHttpFetch`/tests' fakes to satisfy. */
export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export interface LoopbackHttpClientOptions {
  /** Kibana's own server address, e.g. `http://127.0.0.1:5601`. Never used for third-party URLs. */
  baseUrl: string;
  /** The report's decrypted user headers (cookie/authorization/etc.), forwarded as-is. */
  forwardedHeaders: ForwardedHeaders;
  /** Kibana's configured `server.basePath`, prefixed onto every request path. */
  basePath?: string;
  fetchImpl?: FetchLike;
}

/**
 * Headers describing the *originating* report-creation request (a browser POST to
 * `/api/reporting/generate/...`) that must never be forwarded onto this client's own,
 * independently-shaped requests (bodyless GETs for the redirect page/bundles/APIs, or a
 * `fetchJson` POST with its own JSON body): `content-length`/`content-type`/
 * `transfer-encoding` describe that original POST's body framing and entity type, not
 * whatever this client happens to be sending right now. Forwarding `transfer-encoding:
 * chunked` verbatim onto a new bodyless GET is what one real failure traced back to --
 * confirmed live against a dev Kibana: the exact same bundle/API routes that 200 for an
 * unmodified request 404 once that stale `transfer-encoding` header rides along (and, with
 * the global `fetch`/undici transport this client used before `nodeHttpFetch`, throws
 * `TypeError: fetch failed` / `cause: invalid transfer-encoding header` outright). `host`/
 * `connection` are classic hop-by-hop headers tied to the original TCP connection, not this
 * one.
 */
const UNSAFE_REQUEST_HEADERS = new Set([
  'content-length',
  'content-type',
  'transfer-encoding',
  'host',
  'connection',
]);

/**
 * A `fetch`-like client scoped to one Kibana server, for the worker's headless services
 * (`data.search`, `uiSettings`, saved object reads, TSVB/Timelion's own data routes, etc.)
 * to call Kibana exactly the way Chromium's navigated page does today â€” over HTTP, with the
 * report's forwarded user headers, `kbn-xsrf`, and `x-elastic-internal-origin` attached.
 *
 * This intentionally does not bypass Kibana's HTTP layer (no direct service/router
 * injection): keeping the real network hop means authorization, spaces, and feature
 * privileges are all enforced exactly as they are for a browser-driven request, which is
 * the security property Chromium-based Reporting relies on today (see
 * `strip_unsafe_headers.ts` in the screenshotting plugin for the equivalent allow-list on
 * the browser side).
 */
export class LoopbackHttpClient {
  private readonly baseUrl: string;
  private readonly forwardedHeaders: ForwardedHeaders;
  private readonly basePath: string;
  private readonly fetchImpl: FetchLike;

  constructor({
    baseUrl,
    forwardedHeaders,
    basePath = '',
    // See `node_http_fetch.ts`'s doc comment: the global `fetch` (undici) is too strict
    // about a header combination this same-host dev Kibana's authenticated, compressed
    // responses legitimately send, so a classic `http`/`https`-backed implementation is
    // the default transport instead.
    fetchImpl = nodeHttpFetch,
  }: LoopbackHttpClientOptions) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.forwardedHeaders = forwardedHeaders;
    this.basePath = basePath;
    this.fetchImpl = fetchImpl;
  }

  /**
   * Idempotent with respect to `basePath`: a caller passing an API-relative path (e.g.
   * `resolveDashboardPanelLayout`'s `/api/saved_objects/...`) gets it prefixed, but a path
   * pulled straight off an absolute URL the *page itself* produced (a `<script src>`/`<link
   * href>` the resource loader resolved, or `window.fetch`'s own URL) already has `basePath`
   * baked in by Kibana's own asset/rendering code -- prefixing it a second time there
   * produced `/mje/mje/bootstrap.js` and 404s on every bundle/asset/API request once a
   * non-empty `server.basePath` is configured (confirmed live against a dev Kibana running
   * under `/mje`). Skipping the prefix when it's already present keeps both call shapes
   * correct without the callers needing to know which one they are.
   */
  resolveUrl(path: string): string {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const alreadyHasBasePath =
      this.basePath !== '' &&
      (normalizedPath === this.basePath || normalizedPath.startsWith(`${this.basePath}/`));
    const finalPath = alreadyHasBasePath ? normalizedPath : `${this.basePath}${normalizedPath}`;
    return `${this.baseUrl}${finalPath}`;
  }

  private buildHeaders(extra?: HeadersInit): Headers {
    const headers = new Headers();
    for (const [key, value] of Object.entries(this.forwardedHeaders)) {
      if (value === undefined || UNSAFE_REQUEST_HEADERS.has(key.toLowerCase())) continue;
      headers.set(key, Array.isArray(value) ? value.join(', ') : value);
    }
    headers.set('kbn-xsrf', 'reporting-server-render');
    headers.set('x-elastic-internal-origin', 'kibana');
    if (extra) {
      new Headers(extra).forEach((value, key) => headers.set(key, value));
    }
    return headers;
  }

  async fetch(path: string, init: RequestInit = {}): Promise<Response> {
    const url = this.resolveUrl(path);
    const headers = this.buildHeaders(init.headers);
    try {
      return await this.fetchImpl(url, { ...init, headers });
    } catch (error) {
      throw wrapFetchFailure(url, error);
    }
  }

  async fetchJson<T>(path: string, init: RequestInit = {}): Promise<T> {
    const url = this.resolveUrl(path);
    const headers = this.buildHeaders({
      'content-type': 'application/json',
      ...(init.headers ? Object.fromEntries(new Headers(init.headers)) : {}),
    });
    let response: Response;
    try {
      response = await this.fetchImpl(url, { ...init, headers });
    } catch (error) {
      throw wrapFetchFailure(url, error);
    }
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Loopback request to ${path} failed with ${response.status}: ${body}`);
    }
    return (await response.json()) as T;
  }
}

/**
 * Node's `fetch` (undici) collapses every network-layer failure (DNS, connection refused,
 * TLS, etc.) into an opaque `TypeError: fetch failed`, with the actual cause only available
 * on `error.cause` -- which Reporting's generic task-failure logging
 * (`run_report.ts`'s `failedToExecuteErr.message`) never surfaces. Re-throwing with the
 * cause folded into the message (and the url, which undici's error also omits) makes a
 * `runTask` failure's root cause visible in the one place it actually gets logged, instead
 * of requiring a one-off repro script every time this class of failure needs diagnosing
 * (this is exactly what surfaced the `invalid transfer-encoding header` cause behind
 * `nodeHttpFetch`'s existence -- see that module's doc comment).
 */
const wrapFetchFailure = (url: string, error: unknown): Error => {
  const cause = error instanceof Error ? error.cause : undefined;
  const causeMessage = cause instanceof Error ? cause.message : cause ? String(cause) : undefined;
  const baseMessage = error instanceof Error ? error.message : String(error);
  return new Error(
    `LoopbackHttpClient: request to ${url} failed: ${baseMessage}` +
      (causeMessage ? ` (cause: ${causeMessage})` : ''),
    { cause: error }
  );
};

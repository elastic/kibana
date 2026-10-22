/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LoopbackHttpClient } from '../services/loopback_http_client';
import type { ShimUsageLog } from './shim_usage_log';

/**
 * A minimal `XMLHttpRequest` over {@link LoopbackHttpClient}'s `fetch`, for any bundled
 * library that still uses XHR instead of `fetch` (jsdom's own XHR implementation would
 * otherwise try a real network call). Covers the common synchronous-looking usage pattern
 * (`open`, `setRequestHeader`, `send`, `onload`, `onerror`, `responseText`, `status`); does
 * not implement progress events, `responseType` values other than text/json, or
 * synchronous (non-async) XHR, none of which Kibana's client code is known to use.
 *
 * In its own file (rather than alongside `LoopbackResourceLoader` in
 * `loopback_resource_loader.ts`) only because of `max-classes-per-file`; there is no other
 * reason to call this file directly instead of `installLoopbackXhr`.
 */
class LoopbackXMLHttpRequest extends EventTarget {
  static readonly UNSENT = 0;
  static readonly OPENED = 1;
  static readonly HEADERS_RECEIVED = 2;
  static readonly LOADING = 3;
  static readonly DONE = 4;

  readyState = LoopbackXMLHttpRequest.UNSENT;
  status = 0;
  statusText = '';
  responseText = '';
  response: unknown = '';
  responseType: XMLHttpRequestResponseType = '';
  onload: ((this: XMLHttpRequest, ev: ProgressEvent) => unknown) | null = null;
  onerror: ((this: XMLHttpRequest, ev: ProgressEvent) => unknown) | null = null;
  onreadystatechange: (() => unknown) | null = null;

  private method = 'GET';
  private url = '';
  private headers: Record<string, string> = {};
  private responseHeadersText?: string;
  private responseHeadersMap?: Map<string, string>;

  constructor(
    private readonly client: LoopbackHttpClient,
    private readonly usageLog: ShimUsageLog
  ) {
    super();
  }

  open(method: string, url: string) {
    this.method = method;
    this.url = url;
    this.readyState = LoopbackXMLHttpRequest.OPENED;
    this.onreadystatechange?.();
  }

  setRequestHeader(name: string, value: string) {
    this.headers[name] = value;
  }

  getAllResponseHeaders(): string {
    return this.responseHeadersText ?? '';
  }

  getResponseHeader(name: string): string | null {
    return this.responseHeadersMap?.get(name.toLowerCase()) ?? null;
  }

  send(body?: Document | XMLHttpRequestBodyInit | null) {
    this.usageLog.record('XMLHttpRequest', `${this.method} ${this.url}`);
    this.client
      .fetch(this.url, {
        method: this.method,
        headers: this.headers,
        body: body as BodyInit | null | undefined,
      })
      .then(async (response) => {
        this.status = response.status;
        this.statusText = response.statusText;
        this.responseHeadersMap = new Map(
          Array.from(response.headers.entries()).map(([k, v]) => [k.toLowerCase(), v])
        );
        this.responseHeadersText = Array.from(response.headers.entries())
          .map(([k, v]) => `${k}: ${v}\r\n`)
          .join('');
        const text = await response.text();
        this.responseText = text;
        this.response = this.responseType === 'json' ? JSON.parse(text || 'null') : text;
        this.readyState = LoopbackXMLHttpRequest.DONE;
        this.onreadystatechange?.();
        // `Event`, not `ProgressEvent`: the latter isn't a Node global and this worker has
        // no real browser `window` backing an XHR-returning fetch to construct one from;
        // nothing in Kibana's client code reads `loaded`/`total` off the event.
        this.onload?.call(this as unknown as XMLHttpRequest, new Event('load') as ProgressEvent);
        this.dispatchEvent(new Event('load'));
      })
      .catch((error) => {
        this.readyState = LoopbackXMLHttpRequest.DONE;
        this.onreadystatechange?.();
        this.onerror?.call(this as unknown as XMLHttpRequest, new Event('error') as ProgressEvent);
        this.dispatchEvent(new Event('error'));
        // eslint-disable-next-line no-console
        console.error('[reporting-server-render] XMLHttpRequest failed', error);
      });
  }

  abort() {}
}

export const installLoopbackXhr = (
  window: { XMLHttpRequest?: unknown },
  client: LoopbackHttpClient,
  usageLog: ShimUsageLog
): void => {
  // A plain constructor *function*, not a second `class` (would trip `max-classes-per-file`):
  // calling it with `new` invokes it as a constructor, and returning an object from a
  // constructor function makes `new` yield that object instead of `this`, so this behaves
  // exactly like `new LoopbackXMLHttpRequest(client, usageLog)` under `new XMLHttpRequest()`.
  function BoundLoopbackXMLHttpRequest(this: unknown) {
    return new LoopbackXMLHttpRequest(client, usageLog);
  }
  window.XMLHttpRequest = BoundLoopbackXMLHttpRequest as unknown as typeof XMLHttpRequest;
};

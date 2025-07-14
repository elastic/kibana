/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Client } from '@elastic/elasticsearch';
import { compact } from 'lodash';
import { format, parse } from 'node:url';
import Path from 'path';
import { UrlWithParsedQuery } from 'url';
import { FetchResponseError } from './kibana_fetch_response_error';
import { createProxyTransport } from './proxy_transport';
import { getInternalKibanaHeaders } from './get_internal_kibana_headers';

type FetchInputOptions = string | URL;
type FetchInitOptions = Omit<globalThis.RequestInit, 'body'> & { body: unknown };

interface KibanaClientOptions {
  baseUrl: string;
  spaceId?: string;
  signal: AbortSignal;
}

function combineSignal(left: AbortSignal, right?: AbortSignal | null | undefined) {
  if (!right) {
    return left;
  }
  const controller = new AbortController();

  left.addEventListener('abort', () => {
    controller.abort();
  });

  right?.addEventListener('abort', () => {
    controller.abort();
  });

  return controller.signal;
}

export class KibanaClient {
  public readonly es: Client;
  constructor(private readonly options: KibanaClientOptions) {
    const parsedBaseUrl = parse(options.baseUrl, true);

    const [username, password] = (parsedBaseUrl.auth ?? '').split(':');

    const node = format({
      ...parsedBaseUrl,
      auth: null,
      pathname: null,
    });

    this.es = new Client({
      auth: {
        username,
        password,
      },
      node,
      Transport: createProxyTransport({
        pathname: parsedBaseUrl.pathname!,
        headers: getInternalKibanaHeaders(),
      }),
    });
  }

  fetch(
    options: FetchInputOptions,
    init: FetchInitOptions & { asRawResponse: true }
  ): Promise<Response>;

  fetch<T>(options: FetchInputOptions, init?: FetchInitOptions): Promise<T>;

  async fetch<T>(
    options: FetchInputOptions,
    init?: FetchInitOptions & { asRawResponse?: boolean }
  ): Promise<T | Response> {
    const urlObject =
      typeof options === 'string'
        ? {
            pathname: options,
          }
        : options;

    const formattedBaseUrl = parse(this.options.baseUrl, true);

    const urlOptions: UrlWithParsedQuery = {
      ...formattedBaseUrl,
      ...urlObject,
      pathname: Path.posix.join(
        ...compact([
          '/',
          formattedBaseUrl.pathname,
          ...(this.options.spaceId ? ['s', this.options.spaceId] : []),
          urlObject.pathname,
        ])
      ),
      auth: null,
    };

    const body = init?.body ? JSON.stringify(init?.body) : undefined;

    const response = await fetch(format(urlOptions), {
      ...init,
      headers: {
        ['content-type']: 'application/json',
        ...getInternalKibanaHeaders(),
        Authorization: `Basic ${Buffer.from(formattedBaseUrl.auth!).toString('base64')}`,
        ...init?.headers,
      },
      signal: combineSignal(this.options.signal, init?.signal),
      body,
    });

    if (init?.asRawResponse) {
      return response;
    }

    if (response.status >= 400) {
      const content = response.headers.get('content-type')?.includes('application/json')
        ? await response
            .json()
            .then((jsonResponse) => {
              if ('message' in jsonResponse) {
                return jsonResponse.message;
              }
              return JSON.stringify(jsonResponse);
            })
            .catch(() => {})
        : await response.text().catch(() => {});

      throw new FetchResponseError(response, content ?? response.statusText);
    }

    return response.json() as Promise<T>;
  }
}

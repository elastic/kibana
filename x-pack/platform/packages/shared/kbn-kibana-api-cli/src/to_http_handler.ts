/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpFetchOptions, HttpFetchOptionsWithPath, HttpHandler } from '@kbn/core-http-browser';
import { KibanaClient } from './client';

type HttpHandlerArgs =
  | [string, HttpFetchOptions & { asResponse: true }]
  | [HttpFetchOptionsWithPath & { asResponse: true }]
  | [string]
  | [path: string, options?: HttpFetchOptions]
  | [HttpFetchOptionsWithPath];

export function toHttpHandler(client: KibanaClient): HttpHandler {
  return <T>(...args: HttpHandlerArgs) => {
    const options: HttpFetchOptionsWithPath =
      typeof args[0] === 'string'
        ? {
            path: args[0],
            ...args[1],
          }
        : args[0];

    const {
      path,
      asResponse,
      asSystemRequest,
      body,
      cache,
      context: _context,
      credentials,
      headers,
      integrity,
      keepalive,
      method,
      mode,
      prependBasePath,
      query,
      rawResponse,
      redirect,
      referrer,
      referrerPolicy,
      signal,
      version,
      window,
    } = options;

    if (prependBasePath === false) {
      throw new Error(`prependBasePath cannot be false in this context`);
    }

    if (asSystemRequest === true) {
      throw new Error(`asSystemRequest cannot be true in this context`);
    }

    const url = new URL(path, `http://example.com`);

    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }

    const asRawResponse = rawResponse && asResponse;

    return client.fetch<T>(url.pathname + `${url.search}`, {
      cache,
      credentials,
      headers: {
        ...headers,
        ...(version !== undefined
          ? {
              ['x-elastic-stack-version']: version,
            }
          : {}),
      },
      integrity,
      keepalive,
      redirect,
      referrer,
      referrerPolicy,
      signal,
      window,
      method,
      body: typeof body === 'string' ? JSON.parse(body) : body,
      mode,
      ...(asRawResponse ? { asRawResponse } : {}),
    });
  };
}

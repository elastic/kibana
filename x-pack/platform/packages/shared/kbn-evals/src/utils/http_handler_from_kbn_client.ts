/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { HttpFetchOptions, HttpFetchOptionsWithPath, HttpHandler } from '@kbn/core/public';
import { KbnClient, KbnClientRequesterError } from '@kbn/test';
import { ToolingLog } from '@kbn/tooling-log';

// redefine args type to make it easier to handle in a type-safe way
type HttpHandlerArgs =
  | [string, HttpFetchOptions & { asResponse: true }]
  | [HttpFetchOptionsWithPath & { asResponse: true }]
  | [string]
  | [string, HttpFetchOptions?]
  | [HttpFetchOptionsWithPath];

/**
 * Creates a function that matches the HttpHandler interface from Core's
 * API, using the KbnClient from @kbn/test
 */
export function httpHandlerFromKbnClient({
  kbnClient,
  log,
}: {
  kbnClient: KbnClient;
  log: ToolingLog;
}) {
  const fetch: HttpHandler = async (...args: HttpHandlerArgs) => {
    const options: HttpFetchOptionsWithPath =
      typeof args[0] === 'string' ? { path: args[0], ...(args[1] as any) } : args[0];

    const { method = 'GET', body, asResponse, rawResponse, query, signal, headers } = options;

    const response = await kbnClient
      .request({
        path: options.path,
        method: method as any,
        body: body && typeof body === 'string' ? JSON.parse(body) : null,
        query,
        responseType: rawResponse ? 'stream' : undefined,
        headers,
        signal: signal || undefined,
        retries: 0,
      })
      .catch((err) => {
        const error = err instanceof KbnClientRequesterError ? err.axiosError : err;
        throw error;
      });

    const undiciHeaders = new Headers();
    for (const [key, value] of Object.entries(response.headers)) {
      if (Array.isArray(value)) {
        for (const v of value) undiciHeaders.append(key, v);
      } else if (value != null) {
        undiciHeaders.set(key, value);
      }
    }

    return asResponse
      ? {
          fetchOptions: options,
          request: response.request!,
          body: undefined,
          response: new Response(response.data as BodyInit, {
            status: response.status,
            statusText: response.statusText,
            headers: undiciHeaders,
          }),
        }
      : (response.data as any);
  };

  return fetch;
}

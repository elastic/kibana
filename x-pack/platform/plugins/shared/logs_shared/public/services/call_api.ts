/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core-http-browser';
import { createRepositoryClient } from '@kbn/server-route-repository-client';

interface CallApiOptions<TBody = unknown> {
  params?: {
    body?: TBody;
    query?: Record<string, any>;
    path?: Record<string, string>;
  };
  signal?: AbortSignal | null;
  version?: string;
}

export function createCallApi(httpFetch: HttpHandler) {
  const client = createRepositoryClient({
    http: {
      fetch: httpFetch,
    },
  });

  return function callApi<TResponse = any, TBody = unknown>(
    endpoint: string,
    options?: CallApiOptions<TBody>
  ): Promise<TResponse> {
    const { version = '1', ...restOptions } = options || {};
    return client.fetch(endpoint, {
      ...restOptions,
      version,
    } as any);
  };
}

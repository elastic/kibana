/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture, ApiClientOptions, ApiClientResponse } from '@kbn/scout';

export interface AuthedApiClient {
  get(url: string, options?: ApiClientOptions): Promise<ApiClientResponse>;
  post(url: string, options?: ApiClientOptions): Promise<ApiClientResponse>;
  put(url: string, options?: ApiClientOptions): Promise<ApiClientResponse>;
  delete(url: string, options?: ApiClientOptions): Promise<ApiClientResponse>;
  patch(url: string, options?: ApiClientOptions): Promise<ApiClientResponse>;
  head(url: string, options?: ApiClientOptions): Promise<ApiClientResponse>;
}

export const withAuth = (
  apiClient: ApiClientFixture,
  baseHeaders: Record<string, string>
): AuthedApiClient => {
  const merge = (extra?: Record<string, string>) => ({ ...baseHeaders, ...extra });
  const wrap =
    (method: keyof AuthedApiClient) =>
    (url: string, options: ApiClientOptions = {}): Promise<ApiClientResponse> =>
      apiClient[method](url, { ...options, headers: merge(options.headers) });

  return {
    get: wrap('get'),
    post: wrap('post'),
    put: wrap('put'),
    delete: wrap('delete'),
    patch: wrap('patch'),
    head: wrap('head'),
  };
};

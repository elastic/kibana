/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Path from 'path';
import {
  Transport,
  TransportOptions,
  TransportRequestOptions,
  TransportRequestOptionsWithMeta,
  TransportRequestOptionsWithOutMeta,
  TransportRequestParams,
  TransportResult,
  errors,
} from '@elastic/elasticsearch';

export function createProxyTransport({
  pathname,
  headers,
}: {
  pathname: string;
  headers?: Record<string, any>;
}) {
  return class ProxyTransport extends Transport {
    constructor(options: TransportOptions) {
      super(options);
    }

    request<TResponse = unknown>(
      params: TransportRequestParams,
      options?: TransportRequestOptionsWithOutMeta | TransportRequestOptions
    ): Promise<TResponse>;
    request<TResponse = unknown, TContext = any>(
      params: TransportRequestParams,
      options?: TransportRequestOptionsWithMeta
    ): Promise<TransportResult<TResponse, TContext>>;
    request(params: TransportRequestParams, options?: TransportRequestOptions) {
      const queryParams = new URLSearchParams(params.querystring);

      const next: TransportRequestParams = {
        ...params,
        method: 'POST',
        path: Path.posix.join(pathname, '/api/console/proxy'),
        querystring: {
          path: `${params.path}?${queryParams.toString()}`,
          method: params.method,
        },
      };

      return super
        .request(next, {
          ...options,
          headers: {
            ...options?.headers,
            ...headers,
          },
          meta: true,
        })
        .then((response) => {
          if (response.statusCode >= 400) {
            throw new errors.ResponseError({
              statusCode: response.statusCode,
              body: response.body,
              meta: response.meta,
              warnings: response.warnings,
              headers: response.headers,
            });
          }
          return options?.meta ? response : response.body;
        });
    }
  };
}

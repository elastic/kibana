/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core/server';
import type { TransportRequestOptions } from '@elastic/elasticsearch/lib/api/types';

export function createEsClientWithMeta(
  esClient: IScopedClusterClient,
  esQueries: any[]
): IScopedClusterClient {
  return new Proxy(esClient, {
    get(target, prop, receiver) {
      const original = Reflect.get(target, prop, receiver);
      if (
        typeof original !== 'function' ||
        !['search', 'msearch', 'count'].includes(prop as string)
      ) {
        return original;
      }

      return async (...args: any[]) => {
        const [params, options] = args as [any, TransportRequestOptions | undefined];

        // The original caller might expect the body directly, or the full ApiResponse.
        // This depends on whether `meta: true` was in the original options.
        // TODO: Check if this is needed
        const callerExpectsApiResponse = options?.meta === true;

        const response = await original.apply(target, [params, { ...options, meta: true }]);

        if (response && response.meta) {
          esQueries.push({
            params: response.meta.request.params,
            response: {
              body: response.body,
              statusCode: response.statusCode,
            },
            duration: response.meta.duration,
          });
        }

        if (callerExpectsApiResponse) {
          return response;
        }

        // When meta is not requested, the client returns the body directly.
        // We need to replicate that behavior.
        return response.body;
      };
    },
  });
}

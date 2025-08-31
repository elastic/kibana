/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedSearchClient } from '@kbn/data-plugin/server';
import { lastValueFrom, map, tap } from 'rxjs';
import { isRunningResponse } from '@kbn/data-plugin/common';
import type { AsyncSearchClient } from '../task_runner/types';
import type { AsyncSearchParams, AsyncSearchStrategies } from '../types';

export function wrapAsyncSearchClient<T extends AsyncSearchParams>({
  strategy,
  client,
  abortController,
}: {
  strategy: AsyncSearchStrategies;
  client: IScopedSearchClient;
  abortController: AbortController;
}): AsyncSearchClient<T> {
  const start = Date.now();
  let numSearches = 0;
  let esSearchDurationMs = 0;
  let totalSearchDurationMs = 0;

  return {
    getMetrics: () => {
      return {
        numSearches,
        esSearchDurationMs,
        totalSearchDurationMs,
      };
    },
    async search({ request, options }) {
      return lastValueFrom(
        client
          .search(request, {
            ...options,
            strategy,
            abortSignal: abortController.signal,
          })
          .pipe(
            map((response) => {
              return response;
            }),
            tap((response) => {
              if (!isRunningResponse(response)) {
                const durationMs = Date.now() - start;
                numSearches++;
                esSearchDurationMs += response.rawResponse.took ?? 0;
                totalSearchDurationMs += durationMs;
              }
            })
          )
      );
    },
  };
}

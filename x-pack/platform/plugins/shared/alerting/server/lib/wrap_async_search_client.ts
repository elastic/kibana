/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedSearchClient } from '@kbn/data-plugin/server';
import { catchError, filter, lastValueFrom, map, tap, throwError } from 'rxjs';
import { isRunningResponse } from '@kbn/data-plugin/common';
import type { Logger } from '@kbn/core/server';
import type { AsyncSearchClient } from '../task_runner/types';
import type { AsyncSearchParams, AsyncSearchStrategies } from '../types';
import type { RuleInfo } from './types';

export function wrapAsyncSearchClient<P extends AsyncSearchParams>({
  strategy,
  client,
  abortController,
  logger,
  rule,
}: {
  strategy: AsyncSearchStrategies;
  client: IScopedSearchClient;
  abortController: AbortController;
  logger: Logger;
  rule: RuleInfo;
}): AsyncSearchClient<P> {
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
      const start = Date.now();

      logger.debug(
        () =>
          `executing async search for rule ${rule.alertTypeId}:${rule.id} in space ${
            rule.spaceId
          } - ${JSON.stringify(request)} - with options ${JSON.stringify(options)}`
      );

      return lastValueFrom(
        client
          .search(request, {
            ...options,
            strategy,
            abortSignal: abortController.signal,
          })
          .pipe(
            catchError((error) => {
              if (abortController.signal.aborted) {
                return throwError(
                  () => new Error('Search has been aborted due to cancelled execution')
                );
              }
              return throwError(() => error);
            }),
            filter((response) => !isRunningResponse(response)),
            tap((response) => {
              const durationMs = Date.now() - start;
              numSearches++;
              esSearchDurationMs += response.rawResponse.took ?? 0;
              totalSearchDurationMs += durationMs;
            }),
            map((response) => {
              return response.rawResponse;
            })
          )
      );
    },
  };
}

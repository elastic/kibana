/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AbortableAsyncState } from '@kbn/react-hooks';
import type { UnparsedEsqlResponse } from '@kbn/traced-es-client';
import { useKibana } from './use_kibana';
import type { useTimefilter } from './use_timefilter';
import { useStreamsAppFetch } from './use_streams_app_fetch';

function useHistogramFetch(
  indexPattern: string,
  timeState: ReturnType<typeof useTimefilter>['timeState'],
  numDataPoints: number
): AbortableAsyncState<UnparsedEsqlResponse> {
  const { streamsRepositoryClient } = useKibana().dependencies.start.streams;

  const minInterval = Math.floor((timeState.end - timeState.start) / numDataPoints);

  return useStreamsAppFetch(
    async ({ signal, timeState: { start, end } }) => {
      return streamsRepositoryClient.fetch('POST /internal/streams/esql', {
        params: {
          body: {
            operationName: 'get_doc_count_for_stream',
            query: `FROM ${indexPattern},${indexPattern}::failures | STATS doc_count = COUNT(*) BY @timestamp = BUCKET(@timestamp, ${minInterval} ms)`,
            start,
            end,
          },
        },
        signal,
      });
    },
    [indexPattern, minInterval, streamsRepositoryClient],
    {
      withTimeRange: true,
      disableToastOnError: true,
    }
  );
}

export function useHistogramFetchMap(
  indexPatterns: string[],
  timeState: ReturnType<typeof useTimefilter>['timeState'],
  numDataPoints: number
): Record<string, AbortableAsyncState<UnparsedEsqlResponse>> {
  const results: Record<string, AbortableAsyncState<UnparsedEsqlResponse>> = {};

  for (const pattern of indexPatterns) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    results[pattern] = useHistogramFetch(pattern, timeState, numDataPoints);
  }

  return results;
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import useUpdateEffect from 'react-use/lib/useUpdateEffect';
import { useEffect, useRef } from 'react';
import type { StreamDocsStat } from '@kbn/streams-plugin/common';
import type { UnparsedEsqlResponse } from '@kbn/traced-es-client';
import { useKibana } from './use_kibana';
import { useTimefilter } from './use_timefilter';

export interface StreamDocCountsFetch {
  docCount: Promise<StreamDocsStat[]>;
  failedDocCount: Promise<StreamDocsStat[]>;
  degradedDocCount: Promise<StreamDocsStat[]>;
}

interface UseDocCountFetchProps {
  groupTotalCountByTimestamp: boolean;
  canReadFailureStore: boolean;
  numDataPoints: number;
}

export function useStreamDocCountsFetch({
  groupTotalCountByTimestamp: _groupTotalCountByTimestamp,
  canReadFailureStore,
  numDataPoints,
}: UseDocCountFetchProps): {
  getStreamDocCounts(): StreamDocCountsFetch;
  getStreamHistogram(streamName: string): Promise<UnparsedEsqlResponse>;
} {
  const { timeState, timeState$ } = useTimefilter();
  const { streamsRepositoryClient } = useKibana().dependencies.start.streams;
  const promiseCache = useRef<StreamDocCountsFetch | null>(null);
  const abortControllerRef = useRef<AbortController>();

  if (!abortControllerRef.current) {
    abortControllerRef.current = new AbortController();
  }

  useUpdateEffect(() => {
    promiseCache.current = null;
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
  }, [canReadFailureStore]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    const subscription = timeState$.subscribe({
      next: ({ kind }) => {
        const shouldRefresh = kind !== 'initial';

        if (shouldRefresh) {
          promiseCache.current = null;
          abortControllerRef.current?.abort();
          abortControllerRef.current = new AbortController();
        }
      },
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [timeState$]);

  return {
    getStreamDocCounts() {
      if (promiseCache.current) {
        return promiseCache.current;
      }

      const abortController = abortControllerRef.current;

      if (!abortController) {
        throw new Error('Abort controller not set');
      }

      const types: Array<'logs' | 'metrics' | 'traces' | 'synthetics' | 'profiling'> = [
        'logs',
        'metrics',
        'traces',
        'synthetics',
        'profiling',
      ];

      const commonQueryParams = {
        start: timeState.start.toString(),
        end: timeState.end.toString(),
        types,
      };

      const countPromise = streamsRepositoryClient.fetch('GET /internal/streams/doc_counts/total', {
        params: {
          query: commonQueryParams,
        },
        signal: abortController.signal,
      });

      const failedCountPromise = canReadFailureStore
        ? streamsRepositoryClient.fetch('GET /internal/streams/doc_counts/failed', {
            params: {
              query: commonQueryParams,
            },
            signal: abortController.signal,
          })
        : Promise.reject(new Error('Cannot read failed doc count, insufficient privileges'));

      const degradedCountPromise = streamsRepositoryClient.fetch(
        'GET /internal/streams/doc_counts/degraded',
        {
          params: {
            query: commonQueryParams,
          },
          signal: abortController.signal,
        }
      );

      const histogramFetch: StreamDocCountsFetch = {
        docCount: countPromise,
        failedDocCount: failedCountPromise,
        degradedDocCount: degradedCountPromise,
      };

      promiseCache.current = histogramFetch;

      return histogramFetch;
    },
    getStreamHistogram(streamName: string): Promise<UnparsedEsqlResponse> {
      const abortController = abortControllerRef.current;
      if (!abortController) {
        throw new Error('Abort controller not set');
      }

      const minInterval = Math.floor((timeState.end - timeState.start) / numDataPoints);

      const source = canReadFailureStore ? `${streamName},${streamName}::failures` : streamName;

      return streamsRepositoryClient.fetch('POST /internal/streams/esql', {
        params: {
          body: {
            operationName: 'get_doc_count_for_stream',
            query: `FROM ${source} | STATS doc_count = COUNT(*) BY @timestamp = BUCKET(@timestamp, ${minInterval} ms)`,
            start: timeState.start,
            end: timeState.end,
          },
        },
        signal: abortController.signal,
      }) as Promise<UnparsedEsqlResponse>;
    },
  };
}

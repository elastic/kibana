/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UnparsedEsqlResponse } from '@kbn/traced-es-client';
import { useEffect, useRef } from 'react';
import { useKibana } from './use_kibana';
import { useTimefilter } from './use_timefilter';

export interface StreamHistogramFetch {
  docCount: Promise<UnparsedEsqlResponse>;
  failedDocCount: Promise<UnparsedEsqlResponse>;
  degradedDocCount: Promise<UnparsedEsqlResponse>;
}

export function useStreamHistogramFetch(numDataPoints: number): {
  getStreamDocCounts(streamName: string): StreamHistogramFetch;
} {
  const { timeState, timeState$ } = useTimefilter();
  const { streamsRepositoryClient } = useKibana().dependencies.start.streams;
  const promiseCache = useRef<Partial<Record<string, StreamHistogramFetch>>>({});
  const abortControllerRef = useRef<AbortController>();

  if (!abortControllerRef.current) {
    abortControllerRef.current = new AbortController();
  }

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
          promiseCache.current = {};
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
    getStreamDocCounts(streamName: string) {
      if (promiseCache.current[streamName]) {
        return promiseCache.current[streamName] as StreamHistogramFetch;
      }

      const abortController = abortControllerRef.current;

      if (!abortController) {
        throw new Error('Abort controller not set');
      }

      const minInterval = Math.floor((timeState.end - timeState.start) / numDataPoints);

      const countPromise = streamsRepositoryClient.fetch('POST /internal/streams/esql', {
        params: {
          body: {
            operationName: 'get_doc_count_for_stream',
            query: `FROM ${streamName} | STATS doc_count = COUNT(*) BY @timestamp = BUCKET(@timestamp, ${minInterval} ms)`,
            start: timeState.start,
            end: timeState.end,
          },
        },
        signal: abortController.signal,
      });

      const failedCountPromise = streamsRepositoryClient.fetch('POST /internal/streams/esql', {
        params: {
          body: {
            operationName: 'get_failed_doc_count_for_stream',
            query: `FROM ${streamName}::failures | STATS failed_doc_count = count(*)`,
            start: timeState.start,
            end: timeState.end,
          },
        },
        signal: abortController.signal,
      });

      const degradedCountPromise = streamsRepositoryClient.fetch('POST /internal/streams/esql', {
        params: {
          body: {
            operationName: 'get_degraded_doc_count_for_stream',
            query: `FROM ${streamName} METADATA _ignored | WHERE _ignored IS NOT NULL | STATS degraded_doc_count = count(*)`,
            start: timeState.start,
            end: timeState.end,
          },
        },
        signal: abortController.signal,
      });

      const histogramFetch = {
        docCount: countPromise,
        failedDocCount: failedCountPromise,
        degradedDocCount: degradedCountPromise,
      };

      promiseCache.current[streamName] = histogramFetch;

      return histogramFetch;
    },
  };
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import useUpdateEffect from 'react-use/lib/useUpdateEffect';
import { useEffect, useRef } from 'react';
import type { StreamDocsStat } from '@kbn/streams-plugin/common';
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
}

export function useStreamDocCountsFetch({
  groupTotalCountByTimestamp: _groupTotalCountByTimestamp,
  canReadFailureStore,
}: UseDocCountFetchProps): {
  getStreamDocCounts(): StreamDocCountsFetch;
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

      const countPromise = streamsRepositoryClient.fetch(
        'GET /internal/streams/doc_counts/total',
        {
          params: {
            query: commonQueryParams,
          },
          signal: abortController.signal,
        }
      );

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
  };
}

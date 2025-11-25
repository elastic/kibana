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
import { executeEsqlQuery } from './use_execute_esql_query';

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
  const {
    streams: { streamsRepositoryClient },
    data,
  } = useKibana().dependencies.start;
  const docCountsPromiseCache = useRef<StreamDocCountsFetch | null>(null);
  const histogramPromiseCache = useRef<Partial<Record<string, Promise<UnparsedEsqlResponse>>>>({});
  const abortControllerRef = useRef<AbortController>();

  if (!abortControllerRef.current) {
    abortControllerRef.current = new AbortController();
  }

  useUpdateEffect(() => {
    docCountsPromiseCache.current = null;
    histogramPromiseCache.current = {};
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
          docCountsPromiseCache.current = null;
          histogramPromiseCache.current = {};
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
      if (docCountsPromiseCache.current) {
        return docCountsPromiseCache.current;
      }

      const abortController = abortControllerRef.current;

      if (!abortController) {
        throw new Error('Abort controller not set');
      }

      const commonQueryParams = {
        start: timeState.start.toString(),
        end: timeState.end.toString(),
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

      const docCountsFetch: StreamDocCountsFetch = {
        docCount: countPromise,
        failedDocCount: failedCountPromise,
        degradedDocCount: degradedCountPromise,
      };

      docCountsPromiseCache.current = docCountsFetch;

      return docCountsFetch;
    },
    getStreamHistogram(streamName: string): Promise<UnparsedEsqlResponse> {
      const cachedPromise = histogramPromiseCache.current[streamName];
      if (cachedPromise) {
        return cachedPromise;
      }

      const abortController = abortControllerRef.current;
      if (!abortController) {
        throw new Error('Abort controller not set');
      }

      const minInterval = Math.floor((timeState.end - timeState.start) / numDataPoints);

      const source = canReadFailureStore ? `${streamName},${streamName}::failures` : streamName;

      const histogramPromise = executeEsqlQuery({
        query: `FROM ${source} | STATS doc_count = COUNT(*) BY @timestamp = BUCKET(@timestamp, ${minInterval} ms)`,
        search: data.search.search,
        signal: abortController.signal,
        start: timeState.start,
        end: timeState.end,
      }) as Promise<UnparsedEsqlResponse>;

      histogramPromiseCache.current[streamName] = histogramPromise;

      return histogramPromise;
    },
  };
}

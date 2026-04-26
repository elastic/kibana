/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import { UI_SETTINGS } from '@kbn/data-plugin/public';
import type { StreamDocsStat } from '@kbn/streams-plugin/common';
import type { UnparsedEsqlResponse } from '@kbn/traced-es-client';
import { useKibana } from './use_kibana';
import { useTimefilter } from './use_timefilter';
import { buildStreamIngestHistogramEsql } from '../util/stream_overview_esql';
import { executeEsqlQuery } from './use_execute_esql_query';

/**
 * Default bucket count for ES|QL time histograms (`BUCKET(@timestamp, …)`). Use the same value
 * for the streams list and stream overview so doc counts stay comparable for the time range.
 */
export const STREAMS_HISTOGRAM_NUM_DATA_POINTS = 25;

export interface StreamDocCountsFetch {
  docCount: Promise<StreamDocsStat[]>;
  failedDocCount: Promise<StreamDocsStat[]>;
  degradedDocCount: Promise<StreamDocsStat[]>;
}

interface UseDocCountFetchProps {
  groupTotalCountByTimestamp: boolean;
  getCanReadFailureStore: (streamName: string) => boolean;
  numDataPoints: number;
}

export function useStreamDocCountsFetch({
  groupTotalCountByTimestamp: _groupTotalCountByTimestamp,
  getCanReadFailureStore,
  numDataPoints,
}: UseDocCountFetchProps): {
  getStreamDocCounts(streamName?: string): StreamDocCountsFetch;
  getStreamHistogram(streamName: string): Promise<UnparsedEsqlResponse>;
} {
  const { timeState, timeState$ } = useTimefilter();
  const {
    dependencies: {
      start: {
        data,
        streams: { streamsRepositoryClient },
      },
    },
    core: { uiSettings },
  } = useKibana();

  const docCountsPromiseCache = useRef<StreamDocCountsFetch | null>(null);
  const histogramPromiseCache = useRef<Partial<Record<string, Promise<UnparsedEsqlResponse>>>>({});
  const abortControllerRef = useRef<AbortController>();

  if (!abortControllerRef.current) {
    abortControllerRef.current = new AbortController();
  }

  // No longer need to clear cache based on global canReadFailureStore
  // since we now check per-stream privileges

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
    getStreamDocCounts(streamName?: string) {
      if (docCountsPromiseCache.current) {
        return docCountsPromiseCache.current;
      }

      const abortController = abortControllerRef.current;

      if (!abortController) {
        throw new Error('Abort controller not set');
      }

      const countPromise = streamsRepositoryClient.fetch('GET /internal/streams/doc_counts/total', {
        signal: abortController.signal,
        ...(streamName
          ? {
              params: {
                query: {
                  stream: streamName,
                },
              },
            }
          : {}),
      });

      // Check per-stream privilege
      const canReadFailureStore = streamName ? getCanReadFailureStore(streamName) : false;

      const failedCountPromise = canReadFailureStore
        ? streamsRepositoryClient.fetch('GET /internal/streams/doc_counts/failed', {
            signal: abortController.signal,
            params: {
              query: {
                start: timeState.start,
                end: timeState.end,
                ...(streamName ? { stream: streamName } : {}),
              },
            },
          })
        : Promise.reject(new Error('Cannot read failed doc count, insufficient privileges'));

      const degradedCountPromise = streamsRepositoryClient.fetch(
        'GET /internal/streams/doc_counts/degraded',
        {
          signal: abortController.signal,
          ...(streamName
            ? {
                params: {
                  query: {
                    stream: streamName,
                  },
                },
              }
            : {}),
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
      const cacheKey = `${streamName}::${timeState.start}::${timeState.end}`;
      const cachedPromise = histogramPromiseCache.current[cacheKey];
      if (cachedPromise) {
        return cachedPromise;
      }

      const abortController = abortControllerRef.current;
      if (!abortController) {
        throw new Error('Abort controller not set');
      }

      const minInterval = Math.floor((timeState.end - timeState.start) / numDataPoints);
      // Check per-stream privilege
      const canReadFailureStore = getCanReadFailureStore(streamName);
      const source = canReadFailureStore ? `${streamName},${streamName}::failures` : streamName;
      const timezone = uiSettings?.get<'Browser' | string>(UI_SETTINGS.DATEFORMAT_TZ);

      const histogramPromise = executeEsqlQuery({
        query: buildStreamIngestHistogramEsql(source, minInterval),
        search: data.search.search,
        timezone,
        signal: abortController.signal,
        start: timeState.start,
        end: timeState.end,
      }) as Promise<UnparsedEsqlResponse>;

      histogramPromiseCache.current[cacheKey] = histogramPromise;

      return histogramPromise;
    },
  };
}

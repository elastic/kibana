/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef } from 'react';
import { UI_SETTINGS } from '@kbn/data-plugin/public';
import type { StreamDocsStat } from '@kbn/streams-plugin/common';
import type { UnparsedEsqlResponse } from '@kbn/traced-es-client';
import { useKibana } from './use_kibana';
import { useTimefilter } from './use_timefilter';
import {
  buildStreamIngestHistogramEsql,
  getMeaningfulBucketMs,
} from '../util/stream_overview_esql';
import { executeEsqlQuery } from './use_execute_esql_query';

/**
 * Default bucket count for ES|QL time histograms (`BUCKET(@timestamp, …)`). Use the same value
 * for the streams list and stream overview so doc counts stay comparable for the time range.
 */
export const STREAMS_HISTOGRAM_NUM_DATA_POINTS = 25;

/**
 * Returns true if the error is an ES|QL "Unknown index" error.
 * This happens when a failure-store backing index does not yet exist — it is created lazily
 * on the first failed document, so an enabled failure store with no failures is normal.
 */
function isUnknownIndexError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.message.includes('Unknown index') || error.message.includes('index_not_found_exception')
    );
  }
  return false;
}

export interface StreamDocCountsFetch {
  docCount: Promise<StreamDocsStat[]>;
  failedDocCount: Promise<StreamDocsStat[]>;
  degradedDocCount: Promise<StreamDocsStat[]>;
  ingestionDocCount: Promise<StreamDocsStat[]>;
}

interface HistogramEntry {
  key: string;
  promise: Promise<UnparsedEsqlResponse>;
  abortController: AbortController;
  retainers: number;
  settled: boolean;
  releaseTimer?: ReturnType<typeof setTimeout>;
}

interface UseDocCountFetchProps {
  groupTotalCountByTimestamp: boolean;
  /** When `streamName` is omitted (streams listing), this decides whether to fetch failed-doc counts for all streams. */
  getCanReadFailureStore: (streamName?: string) => boolean;
  numDataPoints: number;
  fetchIngestionDocCounts: boolean;
}

export function useStreamDocCountsFetch({
  groupTotalCountByTimestamp: _groupTotalCountByTimestamp,
  getCanReadFailureStore,
  numDataPoints,
  fetchIngestionDocCounts,
}: UseDocCountFetchProps): {
  getStreamDocCounts(streamName?: string): StreamDocCountsFetch;
  getStreamHistogram(streamName: string): Promise<UnparsedEsqlResponse>;
  /** Marks a histogram as in use by a mounted row. The returned function releases it. */
  retainStreamHistogram(histogramFetch: Promise<UnparsedEsqlResponse>): () => void;
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
  const histogramCache = useRef(new Map<string, HistogramEntry>());
  const histogramEntriesByPromise = useRef(
    new WeakMap<Promise<UnparsedEsqlResponse>, HistogramEntry>()
  );
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
          histogramCache.current = new Map();
          abortControllerRef.current?.abort();
          abortControllerRef.current = new AbortController();
        }
      },
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [timeState$]);

  const retainStreamHistogram = useCallback((histogramFetch: Promise<UnparsedEsqlResponse>) => {
    const entry = histogramEntriesByPromise.current.get(histogramFetch);
    if (!entry) {
      return () => {};
    }

    clearTimeout(entry.releaseTimer);
    entry.retainers++;

    let released = false;
    return () => {
      if (released) {
        return;
      }
      released = true;
      entry.retainers--;
      if (entry.retainers > 0) {
        return;
      }
      // Deferred so a row that unmounts and mounts again in the same commit keeps its request.
      entry.releaseTimer = setTimeout(() => {
        if (entry.retainers > 0 || entry.settled) {
          return;
        }
        if (histogramCache.current.get(entry.key) === entry) {
          histogramCache.current.delete(entry.key);
        }
        entry.abortController.abort();
      }, 0);
    };
  }, []);

  return {
    retainStreamHistogram,
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

      const canReadFailureStore = getCanReadFailureStore(streamName);

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

      const ingestionCountPromise = fetchIngestionDocCounts
        ? streamsRepositoryClient.fetch('GET /internal/streams/doc_counts/ingestion', {
            signal: abortController.signal,
            params: {
              query: {
                start: timeState.start,
                end: timeState.end,
                ...(streamName ? { stream: streamName } : {}),
              },
            },
          })
        : Promise.reject(new Error('Ingestion doc counts not requested'));

      void ingestionCountPromise.catch(() => {});

      const docCountsFetch: StreamDocCountsFetch = {
        docCount: countPromise,
        failedDocCount: failedCountPromise,
        degradedDocCount: degradedCountPromise,
        ingestionDocCount: ingestionCountPromise,
      };

      docCountsPromiseCache.current = docCountsFetch;

      return docCountsFetch;
    },
    getStreamHistogram(streamName: string): Promise<UnparsedEsqlResponse> {
      const cacheKey = `${streamName}::${timeState.start}::${timeState.end}`;
      const cachedEntry = histogramCache.current.get(cacheKey);
      if (cachedEntry) {
        // A render that hands the request out again keeps it alive until its row mounts.
        clearTimeout(cachedEntry.releaseTimer);
        return cachedEntry.promise;
      }

      const parentAbortController = abortControllerRef.current;
      if (!parentAbortController) {
        throw new Error('Abort controller not set');
      }

      // Each row gets its own controller so filtering can cancel rows that are no longer shown.
      // Time range changes and unmount still cancel everything through the parent controller.
      const abortController = new AbortController();
      const parentSignal = parentAbortController.signal;
      const abortWithParent = () => abortController.abort();
      if (parentSignal.aborted) {
        abortController.abort();
      } else {
        parentSignal.addEventListener('abort', abortWithParent, { once: true });
      }

      const minInterval = getMeaningfulBucketMs(timeState.end - timeState.start, numDataPoints);
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
        uiSettings,
      }).catch((error: unknown) => {
        // The ::failures backing index is created lazily (only when a document first fails).
        // An enabled failure store with no data yet returns "Unknown index" — treat it as empty.
        if (isUnknownIndexError(error)) {
          return { columns: [], values: [] };
        }
        throw error;
      }) as Promise<UnparsedEsqlResponse>;

      const entry: HistogramEntry = {
        key: cacheKey,
        promise: histogramPromise,
        abortController,
        retainers: 0,
        settled: false,
      };
      const markSettled = () => {
        entry.settled = true;
        parentSignal.removeEventListener('abort', abortWithParent);
      };
      // Keep both handlers on `.then` rather than `.finally`, which returns a new promise that rejects
      // on every abort with nothing to catch it. Callers still get the rejection from `histogramPromise`.
      histogramPromise.then(markSettled, markSettled);
      histogramCache.current.set(cacheKey, entry);
      histogramEntriesByPromise.current.set(histogramPromise, entry);

      return histogramPromise;
    },
  };
}

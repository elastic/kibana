/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import useAsync from 'react-use/lib/useAsync';
import type { QualityIndicators } from '@kbn/dataset-quality-plugin/common';
import type { UnparsedEsqlResponse } from '@kbn/traced-es-client';
import {
  STREAMS_HISTOGRAM_NUM_DATA_POINTS,
  useStreamDocCountsFetch,
} from '../../../hooks/use_streams_doc_counts_fetch';
import { useStreamsIngestionRates } from '../../../hooks/use_streams_ingestion_rates';
import { useStreamsStorageStats } from '../../../hooks/use_streams_storage_stats';
import { useTimefilter } from '../../../hooks/use_timefilter';
import { calculateDataQuality } from '../../../util/calculate_data_quality';

export interface DestinationIndexStats {
  docsByIndex: Record<string, number>;
  ingestionByIndex: Record<string, number>;
  storageByIndex: Record<string, number>;
  /** Undefined when failed documents can't be counted, so quality is unknown. */
  getIndexQuality: (indexName: string) => QualityIndicators | undefined;
  getIndexHistogram: (indexName: string) => Promise<UnparsedEsqlResponse>;
  retainIndexHistogram: (histogramFetch: Promise<UnparsedEsqlResponse>) => () => void;
  timeState: ReturnType<typeof useTimefilter>['timeState'];
  numDataPoints: number;
  docCountsLoaded: boolean;
  qualityLoaded: boolean;
  ingestionLoaded: boolean;
  ingestionError: boolean;
  storageLoaded: boolean;
  storageError: boolean;
  qualityIsLoading: boolean;
}

const EMPTY_COUNTS: Record<string, number> = {};

const toCountMap = (rows: Array<{ stream: string; count: number }> | undefined) => {
  if (!rows) {
    return EMPTY_COUNTS;
  }
  return rows.reduce((acc, { stream, count }) => {
    acc[stream] = count;
    return acc;
  }, {} as Record<string, number>);
};

export interface IndexFailureStoreState {
  enabled: boolean;
  readable: boolean;
}

const canQueryFailureStore = (state: IndexFailureStoreState | undefined): boolean =>
  Boolean(state?.enabled && state.readable);

/**
 * Document, ingestion, storage, and quality stats for destination-targeted indices.
 * `failureStoreByIndex` must be known before `enabled` is set: doc counts are fetched once.
 */
export const useDestinationIndexStats = ({
  enabled,
  failureStoreByIndex,
}: {
  enabled: boolean;
  failureStoreByIndex: ReadonlyMap<string, IndexFailureStoreState>;
}): DestinationIndexStats => {
  const { timeState } = useTimefilter();
  const canQueryAnyFailureStore = useMemo(
    () => [...failureStoreByIndex.values()].some(canQueryFailureStore),
    [failureStoreByIndex]
  );
  const { getStreamDocCounts, getStreamHistogram, retainStreamHistogram } = useStreamDocCountsFetch(
    {
      groupTotalCountByTimestamp: true,
      getCanReadFailureStore: (indexName?: string) =>
        indexName
          ? canQueryFailureStore(failureStoreByIndex.get(indexName))
          : canQueryAnyFailureStore,
      numDataPoints: STREAMS_HISTOGRAM_NUM_DATA_POINTS,
      fetchIngestionDocCounts: true,
    }
  );

  const docCountsFetch = enabled ? getStreamDocCounts() : undefined;
  const totalDocsResult = useAsync(async () => docCountsFetch?.docCount, [docCountsFetch]);
  const failedDocsResult = useAsync(async () => docCountsFetch?.failedDocCount, [docCountsFetch]);
  const degradedDocsResult = useAsync(
    async () => docCountsFetch?.degradedDocCount,
    [docCountsFetch]
  );

  const docsByIndex = useMemo(() => toCountMap(totalDocsResult.value), [totalDocsResult.value]);
  const failedByIndex = useMemo(() => toCountMap(failedDocsResult.value), [failedDocsResult.value]);
  const degradedByIndex = useMemo(
    () => toCountMap(degradedDocsResult.value),
    [degradedDocsResult.value]
  );

  const failedDocsUnavailable = Boolean(failedDocsResult.error);
  const degradedDocsUnavailable = Boolean(degradedDocsResult.error);
  const totalDocsUnavailable = Boolean(totalDocsResult.error);
  const getIndexQuality = useCallback(
    (indexName: string): QualityIndicators | undefined => {
      const failureStore = failureStoreByIndex.get(indexName);
      if (!failureStore) {
        return undefined;
      }
      // A disabled failure store has no failed documents, so they are known to be zero.
      const failedDocsKnown =
        !failureStore.enabled || (failureStore.readable && !failedDocsUnavailable);
      if (!failedDocsKnown || degradedDocsUnavailable || totalDocsUnavailable) {
        return undefined;
      }
      return calculateDataQuality({
        totalDocs: docsByIndex[indexName] ?? 0,
        degradedDocs: degradedByIndex[indexName] ?? 0,
        failedDocs: failureStore.enabled ? failedByIndex[indexName] ?? 0 : 0,
      });
    },
    [
      degradedByIndex,
      degradedDocsUnavailable,
      docsByIndex,
      failedByIndex,
      failedDocsUnavailable,
      failureStoreByIndex,
      totalDocsUnavailable,
    ]
  );

  const { ingestionByStream, ingestionLoaded, ingestionError } = useStreamsIngestionRates({
    ingestionDocCount: docCountsFetch?.ingestionDocCount,
    timeStart: timeState.start,
    timeEnd: timeState.end,
  });
  const { storageByStream, storageLoaded, storageError } = useStreamsStorageStats({ enabled });

  return {
    docsByIndex,
    ingestionByIndex: ingestionByStream,
    storageByIndex: storageByStream,
    getIndexQuality,
    getIndexHistogram: getStreamHistogram,
    retainIndexHistogram: retainStreamHistogram,
    timeState,
    numDataPoints: STREAMS_HISTOGRAM_NUM_DATA_POINTS,
    docCountsLoaded: Boolean(totalDocsResult.value),
    qualityLoaded: Boolean(
      totalDocsResult.value && degradedDocsResult.value && failedDocsResult.value
    ),
    ingestionLoaded,
    ingestionError,
    storageLoaded,
    storageError,
    qualityIsLoading:
      Boolean(totalDocsResult.loading) ||
      Boolean(failedDocsResult.loading) ||
      Boolean(degradedDocsResult.loading),
  };
};

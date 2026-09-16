/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QualityIndicators } from '@kbn/dataset-quality-plugin/common';
import type { StreamDocsStat } from '@kbn/streams-plugin/common';
import { useMemo } from 'react';
import useAsync from 'react-use/lib/useAsync';
import {
  STREAMS_HISTOGRAM_NUM_DATA_POINTS,
  useStreamDocCountsFetch,
} from '../../../hooks/use_streams_doc_counts_fetch';
import { useStreamsIngestionRates } from '../../../hooks/use_streams_ingestion_rates';
import { useStreamsStorageStats } from '../../../hooks/use_streams_storage_stats';
import { useTimefilter } from '../../../hooks/use_timefilter';
import { calculateDataQuality } from '../../../util/calculate_data_quality';
import type { Destination } from './types';

const indexCountsByStream = (stats: StreamDocsStat[] | undefined): Record<string, number> => {
  const byStream: Record<string, number> = {};
  for (const { stream, count } of stats ?? []) {
    byStream[stream] = count;
  }
  return byStream;
};

export const useDestinationMetrics = (destinations: Destination[]) => {
  const { timeState } = useTimefilter();

  const { privilegeMap, hasFailureStoreAccess } = useMemo(() => {
    return destinations.reduce(
      (acc, destination) => {
        acc.privilegeMap.set(destination.name, destination.canReadFailureStore);
        acc.hasFailureStoreAccess ||= destination.canReadFailureStore;
        return acc;
      },
      { privilegeMap: new Map<string, boolean>(), hasFailureStoreAccess: false }
    );
  }, [destinations]);

  const { getStreamDocCounts, getStreamHistogram } = useStreamDocCountsFetch({
    groupTotalCountByTimestamp: true,
    getCanReadFailureStore: (streamName: string | undefined) =>
      streamName ? privilegeMap.get(streamName) ?? false : hasFailureStoreAccess,
    numDataPoints: STREAMS_HISTOGRAM_NUM_DATA_POINTS,
    fetchIngestionDocCounts: true,
  });

  const docCountsFetch = getStreamDocCounts();
  const totalDocsResult = useAsync(() => docCountsFetch.docCount, [docCountsFetch]);
  const failedDocsResult = useAsync(() => docCountsFetch.failedDocCount, [docCountsFetch]);
  const degradedDocsResult = useAsync(() => docCountsFetch.degradedDocCount, [docCountsFetch]);

  const docsByStream = useMemo(
    () => indexCountsByStream(totalDocsResult.value),
    [totalDocsResult.value]
  );
  const failedByStream = useMemo(
    () => indexCountsByStream(failedDocsResult.value),
    [failedDocsResult.value]
  );
  const degradedByStream = useMemo(
    () => indexCountsByStream(degradedDocsResult.value),
    [degradedDocsResult.value]
  );

  const qualityByStream = useMemo(() => {
    const qualities: Record<string, QualityIndicators> = {};
    const streamNames = new Set([
      ...Object.keys(docsByStream),
      ...Object.keys(degradedByStream),
      ...Object.keys(failedByStream),
    ]);

    streamNames.forEach((streamName) => {
      qualities[streamName] = calculateDataQuality({
        totalDocs: docsByStream[streamName] ?? 0,
        degradedDocs: degradedByStream[streamName] ?? 0,
        failedDocs: failedByStream[streamName] ?? 0,
      });
    });

    return qualities;
  }, [docsByStream, degradedByStream, failedByStream]);

  const { ingestionByStream, ingestionLoaded, ingestionError } = useStreamsIngestionRates({
    ingestionDocCount: docCountsFetch.ingestionDocCount,
    timeStart: timeState.start,
    timeEnd: timeState.end,
  });

  const { storageByStream, storageLoaded } = useStreamsStorageStats();

  return {
    hasFailureStoreAccess,
    getStreamHistogram,
    timeState,
    docsByStream,
    qualityByStream,
    docCountsLoaded: !!totalDocsResult.value,
    qualityLoading:
      totalDocsResult.loading || failedDocsResult.loading || degradedDocsResult.loading,
    qualityLoaded:
      !!totalDocsResult.value && !!degradedDocsResult.value && !!failedDocsResult.value,
    ingestionByStream,
    ingestionLoaded,
    ingestionError,
    storageByStream,
    storageLoaded,
  };
};

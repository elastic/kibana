/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import useAsync from 'react-use/lib/useAsync';
import { useStreamDocCountsFetch } from './use_streams_doc_counts_fetch';
import { calculateDataQuality } from '../util/calculate_data_quality';

export function useDatasetQuality({
  streamName,
  canReadFailureStore,
}: {
  streamName: string;
  canReadFailureStore: boolean;
}) {
  const { getStreamDocCounts } = useStreamDocCountsFetch({
    groupTotalCountByTimestamp: false,
    canReadFailureStore,
  });
  const docCountsFetch = getStreamDocCounts(streamName);

  const countResult = useAsync(() => docCountsFetch.docCount, [docCountsFetch]);
  const failedDocsResult = useAsync(() => docCountsFetch.failedDocCount, [docCountsFetch]);
  const degradedDocsResult = useAsync(() => docCountsFetch.degradedDocCount, [docCountsFetch]);

  const docCount = countResult?.value ? Number(countResult.value?.values?.[0]?.[0]) : 0;

  const degradedDocCount = degradedDocsResult?.value
    ? Number(degradedDocsResult.value?.values?.[0]?.[0])
    : 0;

  const failedDocCount = failedDocsResult?.value
    ? Number(failedDocsResult.value?.values?.[0]?.[0])
    : 0;

  const quality = calculateDataQuality({
    totalDocs: docCount,
    degradedDocs: degradedDocCount,
    failedDocs: failedDocCount,
  });

  const isQualityLoading =
    countResult?.loading || failedDocsResult?.loading || degradedDocsResult.loading;

  return {
    quality,
    isQualityLoading,
  };
}

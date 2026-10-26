/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Streams } from '@kbn/streams-schema';
import useAsync from 'react-use/lib/useAsync';
import {
  STREAMS_HISTOGRAM_NUM_DATA_POINTS,
  useStreamDocCountsFetch,
} from './use_streams_doc_counts_fetch';
import { calculateDataQuality } from '../util/calculate_data_quality';

export function useDataSetQuality(
  streamId: string,
  definition?: Streams.all.GetResponse,
  canReadFailureStore?: boolean
) {
  const readFailureStore =
    canReadFailureStore ??
    (definition && Streams.ingest.all.GetResponse.is(definition)
      ? definition.privileges.read_failure_store
      : false);

  const { getStreamDocCounts } = useStreamDocCountsFetch({
    groupTotalCountByTimestamp: false,
    getCanReadFailureStore: () => readFailureStore,
    numDataPoints: STREAMS_HISTOGRAM_NUM_DATA_POINTS,
    // Detail view never renders the Ingestion column, so skip the unused ingestion request.
    fetchIngestionDocCounts: false,
  });

  const docCountsFetch = getStreamDocCounts(streamId);

  const countResult = useAsync(() => docCountsFetch.docCount, [docCountsFetch]);
  const failedDocsResult = useAsync(() => docCountsFetch.failedDocCount, [docCountsFetch]);
  const degradedDocsResult = useAsync(() => docCountsFetch.degradedDocCount, [docCountsFetch]);

  const docCount = countResult?.value?.find((stat) => stat.stream === streamId)?.count ?? 0;
  const degradedDocCount =
    degradedDocsResult?.value?.find((stat) => stat.stream === streamId)?.count ?? 0;
  const failedDocCount =
    failedDocsResult?.value?.find((stat) => stat.stream === streamId)?.count ?? 0;

  const quality = calculateDataQuality({
    totalDocs: docCount,
    degradedDocs: degradedDocCount,
    failedDocs: failedDocCount,
  });
  const isQualityLoading =
    countResult?.loading || failedDocsResult?.loading || degradedDocsResult.loading;
  // Without a readable failure store (or when its count fails) `quality` assumes zero failed docs.
  const isFailedDocCountKnown = readFailureStore && !failedDocsResult.error;

  return { quality, isQualityLoading, isFailedDocCountKnown };
}

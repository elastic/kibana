/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { DatasetQualityIndicator } from '@kbn/dataset-quality-plugin/public';
import useAsync from 'react-use/lib/useAsync';
import { esqlResultToTimeseries } from '../../util/esql_result_to_timeseries';
import { calculateDataQuality } from '../../util/calculate_data_quality';
import type { StreamDocCountsFetch } from '../../hooks/use_streams_doc_counts_fetch';

export function DataQualityColumn({
  histogramQueryFetch,
}: {
  histogramQueryFetch: StreamDocCountsFetch;
}) {
  const histogramQueryResult = useAsync(() => histogramQueryFetch.docCount, [histogramQueryFetch]);
  const failedDocsResult = useAsync(
    () => histogramQueryFetch.failedDocCount,
    [histogramQueryFetch]
  );
  const degradedDocsResult = useAsync(
    () => histogramQueryFetch.degradedDocCount,
    [histogramQueryFetch]
  );

  const allTimeseries = React.useMemo(
    () =>
      esqlResultToTimeseries({
        result: histogramQueryResult,
        metricNames: ['doc_count'],
      }),
    [histogramQueryResult]
  );

  const docCount = React.useMemo(
    () =>
      allTimeseries.reduce(
        (acc, series) => acc + series.data.reduce((acc2, item) => acc2 + (item.doc_count || 0), 0),
        0
      ),
    [allTimeseries]
  );

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

  const isLoading =
    histogramQueryResult.loading || failedDocsResult?.loading || degradedDocsResult.loading;

  return <DatasetQualityIndicator quality={quality} isLoading={isLoading} />;
}

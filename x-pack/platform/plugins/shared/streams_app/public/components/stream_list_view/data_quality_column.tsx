/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { AbortableAsyncState } from '@kbn/react-hooks';
import type { UnparsedEsqlResponse } from '@kbn/traced-es-client';
import { mapPercentageToQuality, calculatePercentage } from '@kbn/data-quality/common';
import { DatasetQualityIndicator } from '@kbn/dataset-quality-plugin/public';
import { esqlResultToTimeseries } from '../../util/esql_result_to_timeseries';
import { useStreamsAppFetch } from '../../hooks/use_streams_app_fetch';
import { useKibana } from '../../hooks/use_kibana';

export function DataQualityColumn({
  indexPattern,
  histogramQueryFetch,
  considerFailedQuality,
}: {
  indexPattern: string;
  histogramQueryFetch: AbortableAsyncState<UnparsedEsqlResponse>;
  considerFailedQuality?: boolean;
}) {
  const { streamsRepositoryClient } = useKibana().dependencies.start.streams;

  const allTimeseries = React.useMemo(
    () =>
      esqlResultToTimeseries({
        result: histogramQueryFetch,
        metricNames: ['doc_count'],
      }),
    [histogramQueryFetch]
  );

  const docCount = React.useMemo(
    () =>
      allTimeseries.reduce(
        (acc, series) => acc + series.data.reduce((acc2, item) => acc2 + (item.doc_count || 0), 0),
        0
      ),
    [allTimeseries]
  );

  const failedDocsQueryFetch = useStreamsAppFetch(
    async ({ signal, timeState: { start, end } }) => {
      // Only fetch failed documents if we need to consider them for quality calculation
      return considerFailedQuality
        ? streamsRepositoryClient.fetch('POST /internal/streams/esql', {
            params: {
              body: {
                operationName: 'get_failed_doc_count_for_stream',
                query: `FROM ${indexPattern}::failures | STATS failed_doc_count = count(*)`,
                start,
                end,
              },
            },
            signal,
          })
        : undefined;
    },
    [streamsRepositoryClient, indexPattern, considerFailedQuality],
    {
      withTimeRange: true,
      disableToastOnError: true,
    }
  );

  const degradedDocsQueryFetch = useStreamsAppFetch(
    async ({ signal, timeState: { start, end } }) => {
      return streamsRepositoryClient.fetch('POST /internal/streams/esql', {
        params: {
          body: {
            operationName: 'get_degraded_doc_count_for_stream',
            query: `FROM ${indexPattern} METADATA _ignored | WHERE _ignored IS NOT NULL | STATS degraded_doc_count = count(*)`,
            start,
            end,
          },
        },
        signal,
      });
    },
    [streamsRepositoryClient, indexPattern],
    {
      withTimeRange: true,
      disableToastOnError: true,
    }
  );

  const degradedDocCount = degradedDocsQueryFetch?.value
    ? Number(degradedDocsQueryFetch.value?.values?.[0]?.[0])
    : 0;
  const failedDocCount = failedDocsQueryFetch?.value
    ? Number(failedDocsQueryFetch.value.values?.[0]?.[0])
    : 0;

  const totalDocs = docCount + degradedDocCount + failedDocCount;

  const degradedPercentage = calculatePercentage({
    totalDocs,
    count: degradedDocCount,
  });

  const failedPercentage = calculatePercentage({
    totalDocs,
    count: failedDocCount,
  });

  const quality = considerFailedQuality
    ? mapPercentageToQuality([degradedPercentage, failedPercentage])
    : mapPercentageToQuality([degradedPercentage]);

  const isLoading =
    histogramQueryFetch.loading || failedDocsQueryFetch?.loading || degradedDocsQueryFetch.loading;

  return <DatasetQualityIndicator quality={quality} isLoading={isLoading} />;
}

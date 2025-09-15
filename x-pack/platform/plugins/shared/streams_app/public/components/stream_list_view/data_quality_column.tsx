/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mapPercentageToQuality, calculatePercentage } from '@kbn/data-quality/common';
import { DatasetQualityIndicator } from '@kbn/data-quality/public';
import { useStreamsAppFetch } from '../../hooks/use_streams_app_fetch';
import { useKibana } from '../../hooks/use_kibana';

export function DataQualityColumn({
  indexPattern,
  considerFailedQuality,
}: {
  indexPattern: string;
  considerFailedQuality?: boolean;
}) {
  const { streamsRepositoryClient } = useKibana().dependencies.start.streams;

  const docsQueryFetch = useStreamsAppFetch(
    async ({ signal, timeState: { start, end } }) => {
      return streamsRepositoryClient.fetch('POST /internal/streams/esql', {
        params: {
          body: {
            operationName: 'get_doc_count_for_stream',
            query: `FROM ${indexPattern} | STATS doc_count = COUNT(*)`,
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

  const docCount = docsQueryFetch?.value ? Number(docsQueryFetch.value?.values?.[0]?.[0]) : 0;
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
    docsQueryFetch.loading || failedDocsQueryFetch?.loading || degradedDocsQueryFetch.loading;

  return <DatasetQualityIndicator quality={quality} isLoading={isLoading} />;
}

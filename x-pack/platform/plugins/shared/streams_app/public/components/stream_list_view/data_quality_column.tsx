/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import { mapPercentageToQuality, calculatePercentage } from '@kbn/data-quality/common';
import { DataQualityBadge } from './data_quality_badge';
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

  const totalDocsQueryFetch = useStreamsAppFetch(
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

  // Only fetch failed documents if we need to consider them for quality calculation
  const failedDocsQueryFetch = considerFailedQuality ? useStreamsAppFetch(
    async ({ signal, timeState: { start, end } }) => {
      return streamsRepositoryClient.fetch('POST /internal/streams/esql', {
        params: {
          body: {
            operationName: 'get_failed_doc_count_for_stream',
            query: `FROM ${indexPattern}::failures | STATS failed_doc_count = count(*)`,
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
  ) : undefined;

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

  const docCount = totalDocsQueryFetch?.value ? Number(totalDocsQueryFetch.value?.values?.[0]?.[0]) : 0;
  const degradedDocCount = degradedDocsQueryFetch?.value ? Number(degradedDocsQueryFetch.value?.values?.[0]?.[0]) : 0;
  const failedDocCount = failedDocsQueryFetch?.value ? Number(failedDocsQueryFetch.value.values?.[0]?.[0]) : 0;

  const degradedPercentage = calculatePercentage({
    totalDocs: docCount,
    count: degradedDocCount,
  });

  const failedPercentage = calculatePercentage({
    totalDocs: docCount,
    count: failedDocCount,
  });

  const quality = considerFailedQuality
    ? mapPercentageToQuality([degradedPercentage, failedPercentage])
    : mapPercentageToQuality([degradedPercentage]);

  return totalDocsQueryFetch.loading ||
    failedDocsQueryFetch?.loading ||
    degradedDocsQueryFetch.loading ? (
    <EuiLoadingSpinner />
  ) : (
    <DataQualityBadge quality={quality} />
  );
}

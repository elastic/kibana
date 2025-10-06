/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import type { Streams } from '@kbn/streams-schema';
import type { FailureStoreStatsResponse } from '@kbn/streams-schema/src/models/ingest/failure_store';
import { useTimefilter } from '../../../../hooks/use_timefilter';
import { useKibana } from '../../../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../../../hooks/use_streams_app_fetch';
import { useAggregations } from './use_ingestion_rate';

export type FailureStoreStats = FailureStoreStatsResponse & {
  bytesPerDay: number;
  bytesPerDoc: number;
};

export const useFailureStoreStats = ({
  definition,
}: {
  definition: Streams.ingest.all.GetResponse;
}) => {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();
  const { timeState } = useTimefilter();
  const { aggregations } = useAggregations({
    definition,
    timeState,
    isFailureStore: true,
  });

  const statsFetch = useStreamsAppFetch(
    async ({ signal }) => {
      const { config, stats } = await streamsRepositoryClient.fetch(
        'GET /internal/streams/{name}/failure_store/stats',
        {
          signal,
          params: {
            path: { name: definition.stream.name },
          },
        }
      );

      if (!stats || !stats.creationDate) {
        return {
          config,
          stats: undefined,
        };
      }

      const rangeInDays = Math.max(
        1,
        Math.round(moment(timeState.end).diff(moment(timeState.start), 'days'))
      );

      const countRange = aggregations?.buckets?.reduce((sum, bucket) => sum + bucket.doc_count, 0);

      const bytesPerDoc = stats.count && stats.size ? stats.size / stats.count : 0;
      const perDayDocs = countRange ? countRange / rangeInDays : 0;
      const bytesPerDay = bytesPerDoc * perDayDocs;
      return {
        config,
        stats: {
          ...stats,
          bytesPerDay,
          bytesPerDoc,
        },
      };
    },
    [
      definition.stream.name,
      aggregations?.buckets,
      streamsRepositoryClient,
      timeState.end,
      timeState.start,
    ],
    {
      withTimeRange: false,
      withRefresh: true,
    }
  );

  return {
    data: statsFetch.value,
    isLoading: statsFetch.loading,
    refresh: statsFetch.refresh,
    error: statsFetch.error,
  };
};

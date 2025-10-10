/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import type { Streams } from '@kbn/streams-schema';
import type { FailureStoreStatsResponse } from '@kbn/streams-schema/src/models/ingest/failure_store';
import type { TimeState } from '@kbn/es-query';
import { useKibana } from '../../../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../../../hooks/use_streams_app_fetch';
import type { useAggregations } from './use_ingestion_rate';

export type FailureStoreStats = FailureStoreStatsResponse & {
  bytesPerDay: number;
  bytesPerDoc: number;
};

export const useFailureStoreStats = ({
  definition,
  timeState,
  aggregations,
}: {
  definition: Streams.ingest.all.GetResponse;
  timeState: TimeState;
  aggregations: ReturnType<typeof useAggregations>['aggregations'];
}) => {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

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

      const rangeInDays = moment(timeState.end).diff(moment(timeState.start), 'days', true);

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

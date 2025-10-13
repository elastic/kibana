/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import type { FailureStoreStatsResponse } from '@kbn/streams-schema/src/models/ingest/failure_store';
import { useKibana } from '../../../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../../../hooks/use_streams_app_fetch';
import type { CalculatedFailureStoreStats } from './use_calculated_failure_store_stats';

export type FailureStoreStats = FailureStoreStatsResponse;

// Enhanced type that includes calculated values for backward compatibility
export type EnhancedFailureStoreStats = FailureStoreStats & CalculatedFailureStoreStats;

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

      return {
        config,
        stats,
      };
    },
    [definition.stream.name, streamsRepositoryClient],
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

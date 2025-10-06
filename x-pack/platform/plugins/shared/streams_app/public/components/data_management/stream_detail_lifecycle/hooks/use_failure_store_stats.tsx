/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import type { Streams } from '@kbn/streams-schema';
import type { FailureStoreStatsResponse } from '@kbn/streams-schema/src/models/ingest/failure_store';
import { useKibana } from '../../../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../../../hooks/use_streams_app_fetch';

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

      const daysSinceCreation = Math.max(
        1,
        Math.round(moment().diff(moment(stats.creationDate), 'days'))
      );

      return {
        config,
        stats: {
          ...stats,
          bytesPerDay: stats.size && stats.count !== 0 ? stats.size / daysSinceCreation : 0,
          bytesPerDoc: stats.count && stats.size ? stats.size / stats.count : 0,
        },
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { useQuery } from '@kbn/react-query';
import {
  buildEpisodeEventDataQuery,
  type EpisodeEventDataRow,
} from '../queries/episode_event_data_query';
import { esqlResponseToObjectRows } from '../utils/esql_response_to_rows';
import { runEsqlAsyncSearch } from '../utils/run_esql_async_search';
import { queryKeys } from '../query_keys';

export interface UseFetchEpisodeEventDataQueryOptions {
  episodeId: string | undefined;
  data: DataPublicPluginStart;
}

/**
 * Fetches the alert `data` object from the latest non-empty event for an episode.
 * Returns a parsed `Record<string, unknown>` or `null` when unavailable
 * (e.g. episode has no events with non-empty data yet).
 */
export const useFetchEpisodeEventDataQuery = ({
  episodeId,
  data,
}: UseFetchEpisodeEventDataQueryOptions) => {
  return useQuery({
    queryKey: queryKeys.episodeEventData(episodeId ?? ''),
    queryFn: ({ signal }) =>
      runEsqlAsyncSearch({
        data,
        params: {
          query: buildEpisodeEventDataQuery(episodeId!).print('basic'),
          time_zone: 'UTC',
        },
        abortSignal: signal,
      }),
    select: (raw) => {
      const rows = esqlResponseToObjectRows<EpisodeEventDataRow>(raw);
      const row = rows[0];
      if (!row || !row.last_data) return null;

      try {
        return JSON.parse(row.last_data) as Record<string, unknown>;
      } catch {
        return null;
      }
    },
    enabled: Boolean(episodeId),
  });
};

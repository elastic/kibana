/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { useQuery } from '@kbn/react-query';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import {
  buildEpisodeEventDataQuery,
  type EpisodeEventDataRow,
} from '../queries/episode_event_data_query';
import { QUERY_STALE_TIME } from '../constants';
import { esqlResponseToObjectRows } from '../utils/esql_response_to_rows';
import { runEsqlAsyncSearch } from '../utils/run_esql_async_search';
import { queryKeys } from '../query_keys';
import { useSpaceId } from './use_space_id';

export interface UseFetchEpisodeEventDataQueryOptions {
  episodeId: string | undefined;
  services: { data: DataPublicPluginStart; spaces: SpacesPluginStart };
}

export interface EpisodeEventData {
  /** Parsed `data` object from the latest non-empty event. */
  data: Record<string, unknown>;
  /** Timestamp of the event that produced `data`. */
  dataTimestamp: string;
  /**
   * `true` when the latest event for the episode does not carry `data`
   * (e.g. an inactive/recovery event), so the displayed `data` is older
   * than the most recent event.
   */
  isStale: boolean;
}

/**
 * Fetches the alert `data` object from the latest non-empty event for an episode,
 * along with the timestamp of that event and a flag indicating whether a more
 * recent event without data exists. Returns `null` when no event with non-empty
 * data is available yet.
 */
export const useFetchEpisodeEventDataQuery = ({
  episodeId,
  services,
}: UseFetchEpisodeEventDataQueryOptions) => {
  const { data } = services;
  const spaceId = useSpaceId(services.spaces);

  return useQuery({
    queryKey: queryKeys.episodeEventData(spaceId, episodeId ?? ''),
    queryFn: ({ signal }) =>
      runEsqlAsyncSearch({
        data,
        params: {
          query: buildEpisodeEventDataQuery(spaceId, episodeId!).print('basic'),
          time_zone: 'UTC',
        },
        abortSignal: signal,
      }),
    select: (raw): EpisodeEventData | null => {
      const rows = esqlResponseToObjectRows<EpisodeEventDataRow>(raw);
      const row = rows[0];
      if (!row || !row.last_data || !row.last_data_timestamp) return null;

      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(row.last_data) as Record<string, unknown>;
      } catch {
        return null;
      }

      return {
        data: parsed,
        dataTimestamp: row.last_data_timestamp,
        isStale: Boolean(
          row.last_event_timestamp && row.last_event_timestamp !== row.last_data_timestamp
        ),
      };
    },
    enabled: Boolean(episodeId),
    staleTime: QUERY_STALE_TIME,
  });
};

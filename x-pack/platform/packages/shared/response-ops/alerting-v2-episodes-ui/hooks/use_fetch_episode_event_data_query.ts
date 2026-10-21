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
  buildEpisodeDataRequest,
  buildEpisodeQuery,
  rowsFromEsql,
} from '@kbn/alerting-v2-common-queries';
import { QUERY_STALE_TIME } from '../constants';
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
 * data is available yet. Only the event with the data has its `_source` parsed:
 * the latest event timestamp comes from the episode row, which reads indexed
 * fields only.
 */
export const useFetchEpisodeEventDataQuery = ({
  episodeId,
  services,
}: UseFetchEpisodeEventDataQueryOptions) => {
  const { data } = services;
  const spaceId = useSpaceId(services.spaces);

  return useQuery({
    queryKey: queryKeys.episodeEventData(spaceId, episodeId ?? ''),
    queryFn: async ({ signal }): Promise<EpisodeEventData | null> => {
      const dataRequest = buildEpisodeDataRequest(spaceId, episodeId!);
      const episodeQuery = buildEpisodeQuery(spaceId, episodeId!);
      const [rawData, rawEpisode] = await Promise.all([
        runEsqlAsyncSearch({
          data,
          params: {
            query: dataRequest.query.print('basic'),
            filter: dataRequest.filter,
            time_zone: 'UTC',
          },
          abortSignal: signal,
        }),
        runEsqlAsyncSearch({
          data,
          params: { query: episodeQuery.print('basic'), time_zone: 'UTC' },
          abortSignal: signal,
        }),
      ]);
      const [dataRow] = rowsFromEsql(dataRequest.query, rawData);
      if (!dataRow?.episode_data) return null;

      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(dataRow.episode_data) as Record<string, unknown>;
      } catch {
        return null;
      }

      const [episodeRow] = rowsFromEsql(episodeQuery, rawEpisode);
      const lastEventTimestamp = episodeRow?.last_timestamp;
      return {
        data: parsed,
        dataTimestamp: dataRow['@timestamp'],
        isStale: Boolean(lastEventTimestamp && lastEventTimestamp !== dataRow['@timestamp']),
      };
    },
    enabled: Boolean(episodeId),
    staleTime: QUERY_STALE_TIME,
  });
};

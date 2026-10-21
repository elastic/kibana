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
import type { AlertEpisode } from '@kbn/alerting-v2-schemas';
import { QUERY_STALE_TIME } from '../constants';
import { runEsqlAsyncSearch } from '../utils/run_esql_async_search';
import { queryKeys } from '../query_keys';
import { useSpaceId } from './use_space_id';

export interface UseFetchEpisodeQueryOptions {
  episodeId: string | undefined;
  services: { data: DataPublicPluginStart; spaces: SpacesPluginStart };
}

/**
 * Loads the aggregated row for a single episode from its rule events, with
 * the latest event `data` fetched alongside. The action state (ack, assignee,
 * tags, snooze) comes from `useFetchEpisodeActions` and `useFetchGroupActions`,
 * so the returned episode has no action columns.
 */
export const useFetchEpisodeQuery = ({ episodeId, services }: UseFetchEpisodeQueryOptions) => {
  const { data } = services;
  const spaceId = useSpaceId(services.spaces);

  return useQuery({
    queryKey: queryKeys.episode(spaceId, episodeId ?? ''),
    queryFn: async ({ signal }) => {
      const query = buildEpisodeQuery(spaceId, episodeId!);
      const dataRequest = buildEpisodeDataRequest(spaceId, episodeId!);
      // Both are small lookups by episode id, so they run in parallel.
      const [raw, rawData] = await Promise.all([
        runEsqlAsyncSearch({
          data,
          params: { query: query.print('basic'), time_zone: 'UTC' },
          abortSignal: signal,
        }),
        runEsqlAsyncSearch({
          data,
          params: {
            query: dataRequest.query.print('basic'),
            filter: dataRequest.filter,
            time_zone: 'UTC',
          },
          abortSignal: signal,
        }),
      ]);
      const [row] = rowsFromEsql(query, raw);
      if (!row) {
        return [];
      }
      const [dataRow] = rowsFromEsql(dataRequest.query, rawData);
      return [{ ...row, episode_data: dataRow?.episode_data ?? null }];
    },
    select: (rows): AlertEpisode | undefined => rows[0],
    enabled: Boolean(episodeId),
    staleTime: QUERY_STALE_TIME,
  });
};

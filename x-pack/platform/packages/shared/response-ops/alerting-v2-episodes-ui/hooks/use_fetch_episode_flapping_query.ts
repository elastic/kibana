/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { useQuery } from '@kbn/react-query';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import { rowsFromEsql } from '@kbn/alerting-v2-common-queries';
import { buildEpisodeFlappingEsqlQuery } from '../queries/episode_flapping_query';
import { QUERY_STALE_TIME } from '../constants';
import { runEsqlAsyncSearch } from '../utils/run_esql_async_search';
import { queryKeys } from '../query_keys';
import { useSpaceId } from './use_space_id';

export interface UseFetchEpisodeFlappingQueryOptions {
  episodeId: string | undefined;
  services: { data: DataPublicPluginStart; spaces: SpacesPluginStart };
}

/**
 * Loads the most recent `.rule-events` statuses for an episode, bounded to the
 * default flapping look-back window.
 *
 * The underlying query sorts `@timestamp` DESC with an explicit LIMIT; rows are
 * reversed here so callers receive them in chronological (oldest-first) order.
 */
export const useFetchEpisodeFlappingQuery = ({
  episodeId,
  services,
}: UseFetchEpisodeFlappingQueryOptions) => {
  const { data } = services;
  const spaceId = useSpaceId(services.spaces);

  return useQuery({
    queryKey: queryKeys.episodeFlapping(spaceId, episodeId ?? ''),
    queryFn: async ({ signal }) => {
      const query = buildEpisodeFlappingEsqlQuery(spaceId, episodeId!);
      const raw = await runEsqlAsyncSearch({
        data,
        params: {
          query: query.print('basic'),
          time_zone: 'UTC',
        },
        abortSignal: signal,
      });
      return rowsFromEsql(query, raw).reverse();
    },
    enabled: Boolean(episodeId),
    staleTime: QUERY_STALE_TIME,
  });
};

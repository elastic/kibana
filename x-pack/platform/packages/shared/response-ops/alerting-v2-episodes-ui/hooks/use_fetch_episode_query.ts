/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { useQuery } from '@kbn/react-query';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import { buildEpisodeQuery } from '../queries/episode_query';
import { QUERY_STALE_TIME } from '../constants';
import type { AlertEpisode, AlertEpisodeEsqlRow } from '../queries/episodes_query';
import { esqlResponseToObjectRows } from '../utils/esql_response_to_rows';
import { runEsqlAsyncSearch } from '../utils/run_esql_async_search';
import { normalizeTags } from '../utils/normalize_tags';
import { queryKeys } from '../query_keys';
import { useSpaceId } from './use_space_id';

export interface UseFetchEpisodeQueryOptions {
  episodeId: string | undefined;
  services: { data: DataPublicPluginStart; spaces: SpacesPluginStart };
}

/**
 * Loads the aggregated metadata row for a single episode.
 */
export const useFetchEpisodeQuery = ({ episodeId, services }: UseFetchEpisodeQueryOptions) => {
  const { data } = services;
  const spaceId = useSpaceId(services.spaces);

  return useQuery({
    queryKey: queryKeys.episode(spaceId, episodeId ?? ''),
    queryFn: ({ signal }) =>
      runEsqlAsyncSearch({
        data,
        params: {
          query: buildEpisodeQuery(spaceId, episodeId!).print('basic'),
          time_zone: 'UTC',
        },
        abortSignal: signal,
      }),
    select: (rows): AlertEpisode | undefined => {
      const row = esqlResponseToObjectRows<AlertEpisodeEsqlRow>(rows)[0];
      if (!row) return undefined;
      return { ...row, last_tags: normalizeTags(row.last_tags) };
    },
    enabled: Boolean(episodeId),
    staleTime: QUERY_STALE_TIME,
  });
};

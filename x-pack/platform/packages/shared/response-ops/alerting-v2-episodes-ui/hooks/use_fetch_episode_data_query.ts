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
  rowsFromEsql,
  type EpisodeDataEsqlRow,
} from '@kbn/alerting-v2-common-queries';
import { QUERY_STALE_TIME } from '../constants';
import { runEsqlAsyncSearch } from '../utils/run_esql_async_search';
import { queryKeys } from '../query_keys';
import { useSpaceId } from './use_space_id';

export interface UseFetchEpisodeDataQueryOptions {
  episodeId: string | undefined;
  services: { data: DataPublicPluginStart; spaces: SpacesPluginStart };
}

/**
 * Loads the raw `data` of the latest episode event that has some, with the
 * timestamp of that event. Returns `null` when no event has data.
 */
export const useFetchEpisodeDataQuery = ({
  episodeId,
  services,
}: UseFetchEpisodeDataQueryOptions) => {
  const { data } = services;
  const spaceId = useSpaceId(services.spaces);

  return useQuery({
    queryKey: queryKeys.episodeData(spaceId, episodeId ?? ''),
    queryFn: async ({ signal }): Promise<EpisodeDataEsqlRow | null> => {
      const { query, filter } = buildEpisodeDataRequest(spaceId, episodeId!);
      const raw = await runEsqlAsyncSearch({
        data,
        params: { query: query.print('basic'), filter, time_zone: 'UTC' },
        abortSignal: signal,
      });
      const [row] = rowsFromEsql(query, raw);
      return row ?? null;
    },
    enabled: Boolean(episodeId),
    staleTime: QUERY_STALE_TIME,
  });
};

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
import type { AlertEpisode } from '@kbn/alerting-v2-schemas';
import { normalizeTags } from '@kbn/alerting-v2-utils';
import { buildEpisodeQuery, buildEpisodeGroupHashQuery } from '../queries/episode_query';
import { QUERY_STALE_TIME } from '../constants';
import { runEsqlAsyncSearch } from '../utils/run_esql_async_search';
import { queryKeys } from '../query_keys';
import { useSpaceId } from './use_space_id';

export interface UseFetchEpisodeQueryOptions {
  episodeId: string | undefined;
  /**
   * Narrows the episode query to its series when already known (e.g. from the
   * episodes list row). When missing, the hook resolves it first with a cheap
   * lookup query.
   */
  groupHash?: string;
  services: { data: DataPublicPluginStart; spaces: SpacesPluginStart };
}

interface FetchEpisodeGroupHashParams {
  data: DataPublicPluginStart;
  spaceId: string;
  episodeId: string;
  signal?: AbortSignal;
}

const fetchEpisodeGroupHash = async ({
  data,
  spaceId,
  episodeId,
  signal,
}: FetchEpisodeGroupHashParams): Promise<string | undefined> => {
  const query = buildEpisodeGroupHashQuery(spaceId, episodeId);
  const raw = await runEsqlAsyncSearch({
    data,
    params: {
      query: query.print('basic'),
      time_zone: 'UTC',
    },
    abortSignal: signal,
  });
  const [row] = rowsFromEsql(query, raw);
  return row?.group_hash;
};

/**
 * Loads the aggregated metadata row for a single episode.
 */
export const useFetchEpisodeQuery = ({
  episodeId,
  groupHash,
  services,
}: UseFetchEpisodeQueryOptions) => {
  const { data } = services;
  const spaceId = useSpaceId(services.spaces);

  return useQuery({
    queryKey: queryKeys.episode(spaceId, episodeId ?? ''),
    queryFn: async ({ signal }) => {
      const resolvedGroupHash =
        groupHash ??
        (await fetchEpisodeGroupHash({ data, spaceId, episodeId: episodeId!, signal }));

      // No rule event carries this episode id, so the episode doesn't exist
      if (resolvedGroupHash == null) {
        return [];
      }

      const query = buildEpisodeQuery(spaceId, episodeId!, resolvedGroupHash);
      const raw = await runEsqlAsyncSearch({
        data,
        params: {
          query: query.print('basic'),
          time_zone: 'UTC',
        },
        abortSignal: signal,
      });
      return rowsFromEsql(query, raw);
    },
    select: (rows): AlertEpisode | undefined => {
      const row = rows[0];
      if (!row) return undefined;
      return {
        ...row,
        last_tags: normalizeTags(row.last_tags),
      };
    },
    enabled: Boolean(episodeId),
    staleTime: QUERY_STALE_TIME,
  });
};

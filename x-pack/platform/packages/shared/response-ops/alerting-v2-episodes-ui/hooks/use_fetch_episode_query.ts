/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { useQuery } from '@kbn/react-query';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import { buildEpisodeQuery, rowsFromEsql } from '@kbn/alerting-v2-common-queries';
import type { AlertEpisode } from '@kbn/alerting-v2-schemas';
import { QUERY_STALE_TIME } from '../constants';
import { runEsqlAsyncSearch } from '../utils/run_esql_async_search';
import { queryKeys } from '../query_keys';
import { useFetchEpisodeDataQuery } from './use_fetch_episode_data_query';
import { useSpaceId } from './use_space_id';

export interface UseFetchEpisodeQueryOptions {
  episodeId: string | undefined;
  services: { data: DataPublicPluginStart; spaces: SpacesPluginStart };
}

export interface UseFetchEpisodeQueryResult {
  /** The episode row, with `episode_data` once the data lookup returns. */
  data: AlertEpisode | undefined;
  isLoading: boolean;
  isError: boolean;
  /** State of the `episode_data` lookup, which loads and fails on its own. */
  isDataLoading: boolean;
  isDataError: boolean;
}

/**
 * Loads the aggregated row for a single episode from its rule events, and the
 * latest event `data` with a separate query. The row doesn't wait for the
 * data, and a failed data lookup doesn't fail the row. The action state (ack,
 * assignee, tags, snooze) comes from `useFetchEpisodeActions` and
 * `useFetchGroupActions`, so the returned episode has no action columns.
 */
export const useFetchEpisodeQuery = ({
  episodeId,
  services,
}: UseFetchEpisodeQueryOptions): UseFetchEpisodeQueryResult => {
  const { data } = services;
  const spaceId = useSpaceId(services.spaces);

  const episodeQuery = useQuery({
    queryKey: queryKeys.episode(spaceId, episodeId ?? ''),
    queryFn: async ({ signal }) => {
      const query = buildEpisodeQuery(spaceId, episodeId!);
      const raw = await runEsqlAsyncSearch({
        data,
        params: { query: query.print('basic'), time_zone: 'UTC' },
        abortSignal: signal,
      });
      return rowsFromEsql(query, raw);
    },
    select: (rows): AlertEpisode | undefined => rows[0],
    enabled: Boolean(episodeId),
    staleTime: QUERY_STALE_TIME,
  });
  const dataQuery = useFetchEpisodeDataQuery({ episodeId, services });

  const episode = episodeQuery.data;
  const episodeData = dataQuery.data?.episode_data ?? null;
  const episodeWithData = useMemo(
    () => (episode ? { ...episode, episode_data: episodeData } : undefined),
    [episode, episodeData]
  );

  return {
    data: episodeWithData,
    isLoading: episodeQuery.isLoading,
    isError: episodeQuery.isError,
    isDataLoading: dataQuery.isLoading,
    isDataError: dataQuery.isError,
  };
};

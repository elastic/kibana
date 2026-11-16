/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import { useQuery } from '@kbn/react-query';
import type { EpisodesDataEsqlRow } from '@kbn/alerting-v2-common-queries';
import type { AlertEpisode } from '@kbn/alerting-v2-schemas';
import { fetchEpisodesData } from '../apis/fetch_episodes_data';
import { QUERY_STALE_TIME } from '../constants';
import { queryKeys } from '../query_keys';
import { useSpaceId } from './use_space_id';

export interface UseFetchEpisodesDataQueryOptions {
  episodeIds: string[];
  services: { expressions: ExpressionsStart; spaces: SpacesPluginStart };
}

const toEpisodesDataMap = (rows: EpisodesDataEsqlRow[]) =>
  new Map(rows.map((row) => [row['episode.id'], row.episode_data]));

/**
 * Loads the latest `data` of a few episodes, as a map by episode id.
 */
export const useFetchEpisodesDataQuery = ({
  episodeIds,
  services,
}: UseFetchEpisodesDataQueryOptions) => {
  const { expressions } = services;
  const spaceId = useSpaceId(services.spaces);

  return useQuery({
    queryKey: queryKeys.episodesData(spaceId, episodeIds),
    queryFn: ({ signal }) =>
      fetchEpisodesData({ spaceId, episodeIds, abortSignal: signal, expressions }),
    enabled: episodeIds.length > 0,
    staleTime: QUERY_STALE_TIME,
    select: toEpisodesDataMap,
  });
};

/**
 * Adds the `episode_data` from `useFetchEpisodesDataQuery` to the episodes.
 * Episodes without loaded data get `null`.
 */
export const withEpisodesData = (
  episodes: AlertEpisode[],
  episodesData: ReadonlyMap<string, string | null> | undefined
): AlertEpisode[] =>
  episodes.map((episode) => ({
    ...episode,
    episode_data: episodesData?.get(episode['episode.id']) ?? null,
  }));

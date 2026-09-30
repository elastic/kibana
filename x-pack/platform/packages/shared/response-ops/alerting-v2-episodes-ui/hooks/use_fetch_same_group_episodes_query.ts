/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import { useQuery } from '@kbn/react-query';
import { fetchRelatedEpisodes } from '../apis/fetch_related_episodes';
import { QUERY_STALE_TIME } from '../constants';
import { useSpaceId } from './use_space_id';
import {
  buildRelatedBaseQuery,
  finishRelatedEpisodesQuery,
} from '../queries/related_episodes_query';
import { queryKeys } from '../query_keys';
import { RELATED_EPISODES_LOAD_ERROR } from './translations';

export interface UseFetchSameGroupEpisodesQueryOptions {
  ruleId: string | undefined;
  excludeEpisodeId: string | undefined;
  pageSize: number;
  /** Required; hook stays idle when missing. */
  groupHash: string | undefined;
  services: { expressions: ExpressionsStart; spaces: SpacesPluginStart };
  toastDanger?: (message: string) => void;
}

/**
 * Other episodes for the same rule and same `group_hash` (excluding the current episode id).
 */
const buildSameGroupRelatedAlertEpisodesEsqlQuery = (
  spaceId: string,
  ruleId: string,
  groupHash: string,
  excludeEpisodeId: string
) => {
  const query = buildRelatedBaseQuery(spaceId, ruleId, excludeEpisodeId);
  query.where`group_hash == ${groupHash}`;
  return finishRelatedEpisodesQuery(query);
};

/**
 * Fetches other episodes for the same rule and same `group_hash` (excluding the current id).
 * Builds `buildSameGroupRelatedAlertEpisodesEsqlQuery` and passes the printed query to
 * `fetchRelatedEpisodes`.
 */
export const useFetchSameGroupEpisodesQuery = ({
  ruleId,
  excludeEpisodeId,
  pageSize,
  groupHash,
  services,
  toastDanger,
}: UseFetchSameGroupEpisodesQueryOptions) => {
  const { expressions } = services;
  const spaceId = useSpaceId(services.spaces);

  return useQuery({
    queryKey: queryKeys.relatedSameGroupEpisodes(spaceId, ruleId ?? '', groupHash ?? '', pageSize),
    queryFn: ({ signal }) =>
      fetchRelatedEpisodes({
        abortSignal: signal,
        pageSize,
        query: buildSameGroupRelatedAlertEpisodesEsqlQuery(
          spaceId,
          ruleId as string,
          groupHash as string,
          excludeEpisodeId as string
        ).print('basic'),
        expressions,
      }),
    enabled: Boolean(ruleId && excludeEpisodeId && groupHash),
    staleTime: QUERY_STALE_TIME,
    onError: () => {
      toastDanger?.(RELATED_EPISODES_LOAD_ERROR);
    },
  });
};

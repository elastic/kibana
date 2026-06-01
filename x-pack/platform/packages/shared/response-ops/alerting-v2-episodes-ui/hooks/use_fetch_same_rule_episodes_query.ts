/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import { useQuery } from '@kbn/react-query';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import { fetchRelatedEpisodes } from '../apis/fetch_related_episodes';
import { QUERY_STALE_TIME } from '../constants';
import { useSpaceId } from './use_space_id';
import {
  buildRelatedBaseQuery,
  finishRelatedEpisodesQuery,
} from '../queries/related_episodes_query';
import { queryKeys } from '../query_keys';
import { RELATED_EPISODES_LOAD_ERROR } from './translations';

/**
 * ES|QL query listing alert episodes for a rule, excluding one episode id.
 * Use when the current episode has no group hash: same as “other groups” without a group dimension.
 * Temporarily limited to 5 episodes.
 */
const buildRelatedAlertEpisodesEsqlQuery = (
  spaceId: string,
  ruleId: string,
  excludeEpisodeId: string
) => {
  return finishRelatedEpisodesQuery(buildRelatedBaseQuery(spaceId, ruleId, excludeEpisodeId));
};

/**
 * Other episodes for the same rule with a different `group_hash` (excluding the current episode id).
 */
const buildOtherGroupsRelatedAlertEpisodesEsqlQuery = (
  spaceId: string,
  ruleId: string,
  groupHash: string,
  excludeEpisodeId: string
) => {
  const query = buildRelatedBaseQuery(spaceId, ruleId, excludeEpisodeId);
  query.where`group_hash != ${groupHash}`;
  return finishRelatedEpisodesQuery(query);
};

export interface UseFetchSameRuleEpisodesQueryOptions {
  ruleId: string | undefined;
  excludeEpisodeId: string | undefined;
  pageSize: number;
  currentGroupHash: string | undefined;
  services: { expressions: ExpressionsStart; spaces: SpacesPluginStart };
  toastDanger?: (message: string) => void;
}

/**
 * Fetches other episodes for the same rule.
 *
 * If the group hash is set, excludes it from the query.
 */
export const useFetchSameRuleEpisodesQuery = ({
  ruleId,
  excludeEpisodeId,
  pageSize,
  currentGroupHash,
  services,
  toastDanger,
}: UseFetchSameRuleEpisodesQueryOptions) => {
  const { expressions, spaces } = services;
  const spaceId = useSpaceId(spaces);
  const otherKey = currentGroupHash ?? 'rule-only';

  return useQuery({
    queryKey: queryKeys.relatedOtherEpisodes(
      spaceId,
      ruleId ?? '',
      pageSize,
      otherKey,
      excludeEpisodeId ?? ''
    ),
    queryFn: ({ signal }) => {
      const rId = ruleId as string;
      const exId = excludeEpisodeId as string;
      const query = currentGroupHash
        ? buildOtherGroupsRelatedAlertEpisodesEsqlQuery(spaceId, rId, currentGroupHash, exId).print(
            'basic'
          )
        : buildRelatedAlertEpisodesEsqlQuery(spaceId, rId, exId).print('basic');
      return fetchRelatedEpisodes({
        abortSignal: signal,
        pageSize,
        query,
        expressions,
      });
    },
    enabled: Boolean(ruleId && excludeEpisodeId),
    staleTime: QUERY_STALE_TIME,
    onError: () => {
      toastDanger?.(RELATED_EPISODES_LOAD_ERROR);
    },
  });
};

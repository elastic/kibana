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
  getRelatedEpisodesScopeKey,
  type RelatedEpisodesScope,
} from '../queries/related_episodes_query';
import { queryKeys } from '../query_keys';
import { RELATED_EPISODES_LOAD_ERROR } from './translations';

/**
 * ES|QL query listing alert episodes for a rule (or source), excluding one episode id.
 * Use when the current episode has no group hash: same as “other groups” without a group dimension.
 * Temporarily limited to 5 episodes.
 */
const buildRelatedAlertEpisodesEsqlQuery = (
  spaceId: string,
  scope: RelatedEpisodesScope,
  excludeEpisodeId: string
) => {
  return finishRelatedEpisodesQuery(buildRelatedBaseQuery(spaceId, scope, excludeEpisodeId));
};

/**
 * Other episodes in the same scope with a different `group_hash` (excluding the current episode id).
 */
const buildOtherGroupsRelatedAlertEpisodesEsqlQuery = (
  spaceId: string,
  scope: RelatedEpisodesScope,
  groupHash: string,
  excludeEpisodeId: string
) => {
  const query = buildRelatedBaseQuery(spaceId, scope, excludeEpisodeId);
  query.where`group_hash != ${groupHash}`;
  return finishRelatedEpisodesQuery(query);
};

export interface UseFetchSameRuleEpisodesQueryOptions {
  scope: RelatedEpisodesScope | undefined;
  excludeEpisodeId: string | undefined;
  pageSize: number;
  currentGroupHash: string | undefined;
  services: { expressions: ExpressionsStart; spaces: SpacesPluginStart };
  toastDanger?: (message: string) => void;
}

/**
 * Fetches other episodes for the same rule, or for the same source when the episode has no rule.
 *
 * If the group hash is set, excludes it from the query.
 */
export const useFetchSameRuleEpisodesQuery = ({
  scope,
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
      getRelatedEpisodesScopeKey(scope),
      pageSize,
      otherKey,
      excludeEpisodeId ?? ''
    ),
    queryFn: ({ signal }) => {
      const relatedScope = scope as RelatedEpisodesScope;
      const exId = excludeEpisodeId as string;
      const query = currentGroupHash
        ? buildOtherGroupsRelatedAlertEpisodesEsqlQuery(
            spaceId,
            relatedScope,
            currentGroupHash,
            exId
          ).print('basic')
        : buildRelatedAlertEpisodesEsqlQuery(spaceId, relatedScope, exId).print('basic');
      return fetchRelatedEpisodes({
        abortSignal: signal,
        pageSize,
        query,
        expressions,
      });
    },
    enabled: Boolean(scope && excludeEpisodeId),
    staleTime: QUERY_STALE_TIME,
    onError: () => {
      toastDanger?.(RELATED_EPISODES_LOAD_ERROR);
    },
  });
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import { useQuery } from '@kbn/react-query';
import { fetchRelatedEpisodes } from '../apis/fetch_related_episodes';
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
const buildRelatedAlertEpisodesEsqlQuery = (ruleId: string, excludeEpisodeId: string) => {
  return finishRelatedEpisodesQuery(buildRelatedBaseQuery(ruleId, excludeEpisodeId));
};

/**
 * Other episodes for the same rule with a different `group_hash` (excluding the current episode id).
 */
const buildOtherGroupsRelatedAlertEpisodesEsqlQuery = (
  ruleId: string,
  groupHash: string,
  excludeEpisodeId: string
) => {
  const query = buildRelatedBaseQuery(ruleId, excludeEpisodeId);
  query.where`group_hash != ${groupHash}`;
  return finishRelatedEpisodesQuery(query);
};

export interface UseFetchSameRuleEpisodesQueryOptions {
  ruleId: string | undefined;
  excludeEpisodeId: string | undefined;
  pageSize: number;
  currentGroupHash: string | undefined;
  expressions: ExpressionsStart;
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
  expressions,
  toastDanger,
}: UseFetchSameRuleEpisodesQueryOptions) => {
  const otherKey = currentGroupHash ?? 'rule-only';

  return useQuery({
    queryKey: queryKeys.relatedOtherEpisodes(
      ruleId ?? '',
      pageSize,
      otherKey,
      excludeEpisodeId ?? ''
    ),
    queryFn: ({ signal }) => {
      const rId = ruleId as string;
      const exId = excludeEpisodeId as string;
      const query = currentGroupHash
        ? buildOtherGroupsRelatedAlertEpisodesEsqlQuery(rId, currentGroupHash, exId).print('basic')
        : buildRelatedAlertEpisodesEsqlQuery(rId, exId).print('basic');
      return fetchRelatedEpisodes({
        abortSignal: signal,
        pageSize,
        query,
        expressions,
      });
    },
    enabled: Boolean(ruleId && excludeEpisodeId),
    onError: () => {
      toastDanger?.(RELATED_EPISODES_LOAD_ERROR);
    },
  });
};

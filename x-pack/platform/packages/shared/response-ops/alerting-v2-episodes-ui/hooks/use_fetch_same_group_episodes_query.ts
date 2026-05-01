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

export interface UseFetchSameGroupEpisodesQueryOptions {
  ruleId: string | undefined;
  excludeEpisodeId: string | undefined;
  pageSize: number;
  /** Required; hook stays idle when missing. */
  groupHash: string | undefined;
  expressions: ExpressionsStart;
  toastDanger?: (message: string) => void;
}

/**
 * Other episodes for the same rule and same `group_hash` (excluding the current episode id).
 */
const buildSameGroupRelatedAlertEpisodesEsqlQuery = (
  ruleId: string,
  groupHash: string,
  excludeEpisodeId: string
) => {
  const query = buildRelatedBaseQuery(ruleId, excludeEpisodeId);
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
  expressions,
  toastDanger,
}: UseFetchSameGroupEpisodesQueryOptions) => {
  return useQuery({
    queryKey: queryKeys.relatedSameGroupEpisodes(ruleId ?? '', groupHash ?? '', pageSize),
    queryFn: ({ signal }) =>
      fetchRelatedEpisodes({
        abortSignal: signal,
        pageSize,
        query: buildSameGroupRelatedAlertEpisodesEsqlQuery(
          ruleId as string,
          groupHash as string,
          excludeEpisodeId as string
        ).print('basic'),
        expressions,
      }),
    enabled: Boolean(ruleId && excludeEpisodeId && groupHash),
    onError: () => {
      toastDanger?.(RELATED_EPISODES_LOAD_ERROR);
    },
  });
};

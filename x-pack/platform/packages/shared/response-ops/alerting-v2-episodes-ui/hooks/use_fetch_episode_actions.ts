/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { EpisodeAction } from '../types/action';
import { executeEsqlQuery } from '../utils/execute_esql_query';
import { queryKeys } from '../query_keys';
import { buildEpisodeActionsQuery } from '../utils/queries/build_episode_actions_query';

export interface UseFetchEpisodeActionsOptions {
  episodeIds: string[];
  services: { expressions: ExpressionsStart };
}

export const useFetchEpisodeActions = ({ episodeIds, services }: UseFetchEpisodeActionsOptions) =>
  useQuery({
    queryKey: queryKeys.actions(episodeIds),
    queryFn: async ({ signal }) => {
      const query = buildEpisodeActionsQuery(episodeIds);
      return executeEsqlQuery({
        expressions: services.expressions,
        query,
        input: null,
        abortSignal: signal,
        noCache: true,
      });
    },
    enabled: episodeIds.length > 0,
    keepPreviousData: true,
    select: (result) => {
      const map = new Map<string, EpisodeAction>();
      for (const row of result.rows) {
        map.set(row.episode_id, {
          episodeId: row.episode_id,
          ruleId: row.rule_id ?? null,
          groupHash: row.group_hash ?? null,
          lastAckAction: row.last_ack_action ?? null,
        });
      }
      return map;
    },
  });

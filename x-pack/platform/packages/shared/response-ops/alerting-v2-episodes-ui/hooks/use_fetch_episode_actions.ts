/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
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

export const useFetchEpisodeActions = ({ episodeIds, services }: UseFetchEpisodeActionsOptions) => {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.actions(episodeIds),
    queryFn: async ({ signal }) => {
      const query = buildEpisodeActionsQuery(episodeIds);
      const result = await executeEsqlQuery({
        expressions: services.expressions,
        query,
        input: null,
        abortSignal: signal,
        noCache: true,
      });

      return result.rows.map(
        (row): EpisodeAction => ({
          episodeId: row.episode_id as string,
          ruleId: (row.rule_id as string) ?? null,
          groupHash: (row.group_hash as string) ?? null,
          lastAckAction: (row.last_ack_action as string) ?? null,
        })
      );
    },
    enabled: episodeIds.length > 0,
    keepPreviousData: true,
  });

  const episodeActionsMap = useMemo(() => {
    const map = new Map<string, EpisodeAction>();
    if (data) {
      for (const action of data) {
        map.set(action.episodeId, action);
      }
    }
    return map;
  }, [data]);

  return { episodeActionsMap, isLoading };
};

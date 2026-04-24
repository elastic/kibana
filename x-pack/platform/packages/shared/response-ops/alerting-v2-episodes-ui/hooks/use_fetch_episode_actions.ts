/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { EpisodeActionState } from '../types/action';
import { fetchEpisodeActions } from '../apis/fetch_episode_actions';
import { queryKeys } from '../query_keys';

export interface UseFetchEpisodeActionsOptions {
  episodeIds: string[];
  services: { expressions: ExpressionsStart };
}

export const useFetchEpisodeActions = ({ episodeIds, services }: UseFetchEpisodeActionsOptions) =>
  useQuery({
    queryKey: queryKeys.actions(episodeIds),
    queryFn: ({ signal }) => fetchEpisodeActions({ episodeIds, abortSignal: signal, services }),
    enabled: episodeIds.length > 0,
    keepPreviousData: true,
    select: (rows) => {
      const map = new Map<string, EpisodeActionState>();
      for (const row of rows) {
        map.set(row.episode_id, {
          episodeId: row.episode_id,
          ruleId: row.rule_id ?? null,
          groupHash: row.group_hash ?? null,
          lastAckAction: row.last_ack_action ?? null,
          lastAssigneeUid: row.last_assignee_uid ?? null,
          lastAckActor: row.last_ack_actor ?? null,
        });
      }
      return map;
    },
  });

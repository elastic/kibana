/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { AlertEpisodeGroupAction } from '../types/action';
import { fetchGroupActions } from '../apis/fetch_group_actions';
import { QUERY_STALE_TIME } from '../constants';
import { queryKeys } from '../query_keys';
import { normalizeTags } from '../utils/normalize_tags';
import { useSpaceId } from './use_space_id';

export interface UseFetchGroupActionsOptions {
  groupHashes: string[];
  services: { expressions: ExpressionsStart; spaces: SpacesPluginStart };
}

export const useFetchGroupActions = ({ groupHashes, services }: UseFetchGroupActionsOptions) => {
  const { expressions } = services;
  const spaceId = useSpaceId(services.spaces);
  return useQuery({
    queryKey: queryKeys.groupActions(spaceId, groupHashes),
    queryFn: ({ signal }) =>
      fetchGroupActions({ spaceId, groupHashes, abortSignal: signal, expressions }),
    enabled: groupHashes.length > 0,
    keepPreviousData: true,
    staleTime: QUERY_STALE_TIME,
    select: (rows) => {
      const map = new Map<string, AlertEpisodeGroupAction>();
      for (const row of rows) {
        map.set(row.group_hash, {
          groupHash: row.group_hash,
          ruleId: row.rule_id ?? null,
          lastDeactivateAction: row.last_deactivate_action ?? null,
          lastSnoozeAction: row.last_snooze_action ?? null,
          snoozeExpiry: row.snooze_expiry ?? null,
          tags: normalizeTags(row.tags),
          lastSnoozeActor: row.last_snooze_actor ?? null,
          lastDeactivateActor: row.last_deactivate_actor ?? null,
        });
      }
      return map;
    },
  });
};

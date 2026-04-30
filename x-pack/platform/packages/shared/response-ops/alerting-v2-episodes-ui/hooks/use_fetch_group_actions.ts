/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { AlertEpisodeGroupAction } from '../types/action';
import type { GroupActionRow } from '../queries/group_actions_query';
import { fetchGroupActions } from '../apis/fetch_group_actions';
import { queryKeys } from '../query_keys';

const tagsFromRow = (value: GroupActionRow['tags']): string[] => {
  if (value == null) {
    return [];
  }
  if (typeof value === 'string') {
    return [value];
  }
  if (Array.isArray(value)) {
    return value;
  }
  return [];
};

export interface UseFetchGroupActionsOptions {
  groupHashes: string[];
  expressions: ExpressionsStart;
}

export const useFetchGroupActions = ({ groupHashes, expressions }: UseFetchGroupActionsOptions) =>
  useQuery({
    queryKey: queryKeys.groupActions(groupHashes),
    queryFn: ({ signal }) => fetchGroupActions({ groupHashes, abortSignal: signal, expressions }),
    enabled: groupHashes.length > 0,
    keepPreviousData: true,
    select: (rows) => {
      const map = new Map<string, AlertEpisodeGroupAction>();
      for (const row of rows) {
        map.set(row.group_hash, {
          groupHash: row.group_hash,
          ruleId: row.rule_id ?? null,
          lastDeactivateAction: row.last_deactivate_action ?? null,
          lastSnoozeAction: row.last_snooze_action ?? null,
          snoozeExpiry: row.snooze_expiry ?? null,
          tags: tagsFromRow(row.tags),
          lastSnoozeActor: row.last_snooze_actor ?? null,
          lastDeactivateActor: row.last_deactivate_actor ?? null,
        });
      }
      return map;
    },
  });

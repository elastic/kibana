/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { AlertEpisodeGroupAction } from '../types/action';
import { executeEsqlQuery } from '../utils/execute_esql_query';
import { queryKeys } from '../query_keys';
import { buildGroupActionsQuery } from '../queries/group_actions_query';

const tagsFromRow = (value: unknown): string[] => {
  if (value == null) {
    return [];
  }
  if (typeof value === 'string') {
    return [value];
  }
  if (Array.isArray(value)) {
    return value as string[];
  }
  return [];
};

export interface UseFetchGroupActionsOptions {
  groupHashes: string[];
  services: { expressions: ExpressionsStart };
}

export const useFetchGroupActions = ({ groupHashes, services }: UseFetchGroupActionsOptions) =>
  useQuery({
    queryKey: queryKeys.groupActions(groupHashes),
    queryFn: async ({ signal }) => {
      return executeEsqlQuery({
        expressions: services.expressions,
        query: buildGroupActionsQuery(groupHashes).print('basic'),
        input: null,
        abortSignal: signal,
        noCache: true,
      });
    },
    enabled: groupHashes.length > 0,
    keepPreviousData: true,
    select: (result) => {
      const map = new Map<string, AlertEpisodeGroupAction>();
      for (const row of result.rows) {
        map.set(row.groupHash, {
          groupHash: row.group_hash as string,
          ruleId: (row.rule_id as string) ?? null,
          lastDeactivateAction: (row.last_deactivate_action as string) ?? null,
          lastSnoozeAction: (row.last_snooze_action as string) ?? null,
          snoozeExpiry: (row.snooze_expiry as string) ?? null,
          tags: tagsFromRow(row.tags),
        });
      }
      return map;
    },
  });

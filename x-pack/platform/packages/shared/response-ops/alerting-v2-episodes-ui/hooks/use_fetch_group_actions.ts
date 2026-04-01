/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useQuery } from '@kbn/react-query';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { GroupAction } from '../types/action';
import { executeEsqlQuery } from '../utils/execute_esql_query';
import { queryKeys } from '../query_keys';
import { buildGroupActionsQuery } from '../utils/queries/build_group_actions_query';

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

export const useFetchGroupActions = ({ groupHashes, services }: UseFetchGroupActionsOptions) => {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.groupActions(groupHashes),
    queryFn: async ({ signal }) => {
      const query = buildGroupActionsQuery(groupHashes);
      const result = await executeEsqlQuery({
        expressions: services.expressions,
        query,
        input: null,
        abortSignal: signal,
        noCache: true,
      });

      return result.rows.map(
        (row): GroupAction => ({
          groupHash: row.group_hash as string,
          ruleId: (row.rule_id as string) ?? null,
          lastDeactivateAction: (row.last_deactivate_action as string) ?? null,
          lastSnoozeAction: (row.last_snooze_action as string) ?? null,
          snoozeExpiry: (row.snooze_expiry as string) ?? null,
          tags: tagsFromRow(row.tags),
        })
      );
    },
    enabled: groupHashes.length > 0,
    keepPreviousData: true,
  });

  const groupActionsMap = useMemo(() => {
    const map = new Map<string, GroupAction>();
    if (data) {
      for (const action of data) {
        map.set(action.groupHash, action);
      }
    }
    return map;
  }, [data]);

  return { groupActionsMap, isLoading };
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useQuery } from '@kbn/react-query';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { EpisodeAction } from '../types/episode_action';
import { executeEsqlQuery } from '../utils/execute_esql_query';

const ALERT_ACTIONS_DATA_STREAM = '.alerting-actions';

const escapeEsqlString = (value: string): string =>
  value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

const tagsFromRow = (value: unknown): string[] | null => {
  if (value == null) {
    return null;
  }
  if (typeof value === 'string') {
    return [value];
  }
  if (Array.isArray(value)) {
    return value as string[];
  }
  return null;
};

const buildBulkGetAlertActionsQuery = (episodeIds: string[]): string => {
  const escapedIds = episodeIds.map((id) => `"${escapeEsqlString(id)}"`).join(', ');

  return `
    FROM ${ALERT_ACTIONS_DATA_STREAM}
    | WHERE episode_id IN (${escapedIds})
    | WHERE action_type IN ("ack", "unack", "deactivate", "activate", "snooze", "unsnooze", "tag")
    | STATS
        tags = LAST(tags, @timestamp) WHERE action_type IN ("tag"),
        last_ack_action = LAST(action_type, @timestamp) WHERE action_type IN ("ack", "unack"),
        last_deactivate_action = LAST(action_type, @timestamp) WHERE action_type IN ("deactivate", "activate"),
        last_snooze_action = LAST(action_type, @timestamp) WHERE action_type IN ("snooze", "unsnooze")
      BY episode_id, rule_id, group_hash
    | KEEP episode_id, rule_id, group_hash, last_ack_action, last_deactivate_action, last_snooze_action, tags
  `;
};

export interface UseFetchEpisodeActionsOptions {
  episodeIds: string[];
  services: { expressions: ExpressionsStart };
}

export const useFetchEpisodeActions = ({ episodeIds, services }: UseFetchEpisodeActionsOptions) => {
  const { data, isLoading } = useQuery({
    queryKey: ['fetchEpisodeActions', episodeIds],
    queryFn: async ({ signal }) => {
      const query = buildBulkGetAlertActionsQuery(episodeIds);
      const result = await executeEsqlQuery({
        expressions: services.expressions,
        query,
        input: null,
        abortSignal: signal,
      });

      return result.rows.map(
        (row): EpisodeAction => ({
          episode_id: row.episode_id as string,
          rule_id: (row.rule_id as string) ?? null,
          group_hash: (row.group_hash as string) ?? null,
          last_ack_action: (row.last_ack_action as string) ?? null,
          last_deactivate_action: (row.last_deactivate_action as string) ?? null,
          last_snooze_action: (row.last_snooze_action as string) ?? null,
          tags: tagsFromRow(row.tags),
        })
      );
    },
    enabled: episodeIds.length > 0,
    keepPreviousData: true,
  });

  const actionsMap = useMemo(() => {
    const map = new Map<string, EpisodeAction>();
    if (data) {
      for (const action of data) {
        map.set(action.episode_id, action);
      }
    }
    return map;
  }, [data]);

  return { data: data ?? [], actionsMap, isLoading };
};

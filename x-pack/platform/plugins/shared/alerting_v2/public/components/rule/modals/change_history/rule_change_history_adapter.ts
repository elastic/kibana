/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ChangeHistoryAdapter,
  ChangeHistoryDetail,
  ChangeHistoryListItem,
  ListChangeHistoryResult,
} from '@kbn/change-history-ui';
import type { RuleChangeHistoryListItem } from '@kbn/alerting-v2-schemas';
import type { RuleChangeHistoryApi } from '../../../../services/rule_change_history_api';

const toChangeHistoryItem = (item: RuleChangeHistoryListItem): ChangeHistoryListItem => ({
  id: item.id,
  timestamp: item.timestamp,
  actor: { name: item.actor.name, profileId: item.actor.profile_id },
  action: item.action,
  changes: item.changes,
  comment: item.comment,
  tags: item.tags,
  // `metadata.version` is the convention the change-history UI package reads for
  // the restore label and its version-distance telemetry.
  metadata: item.version !== undefined ? { version: item.version } : undefined,
  isCurrent: item.is_current,
});

/**
 * Builds the {@link ChangeHistoryAdapter} for alerting v2 rules from
 * the HTTP read API. Maps the API DTOs to the change-history UI
 * row/detail types, and adapts 1-based pagination (the package uses a
 * 0-based `page.index`; the API is 1-based).
 */
export const createRuleChangeHistoryAdapter = (
  api: RuleChangeHistoryApi
): ChangeHistoryAdapter => ({
  listChanges: async ({ objectId, page, signal }): Promise<ListChangeHistoryResult> => {
    const { items, total } = await api.listRuleChanges({
      id: objectId,
      page: page.index + 1,
      perPage: page.size,
      signal,
    });

    return { items: items.map(toChangeHistoryItem), total };
  },
  getChange: async ({ objectId, changeId, signal }): Promise<ChangeHistoryDetail> => {
    const { snapshot, reason, ...item } = await api.getRuleChangeEvent({
      id: objectId,
      eventId: changeId,
      signal,
    });
    return {
      ...toChangeHistoryItem(item),
      snapshot,
      reason,
    };
  },
});

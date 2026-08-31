/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ChangeHistoryAdapter,
  ChangeHistoryDetail,
  ListChangeHistoryResult,
} from '@kbn/change-history-ui';
import type { RuleChangeHistoryApi } from '../../../../services/rule_change_history_api';

/**
 * Builds the {@link ChangeHistoryAdapter} for alerting v2 rules from
 * the HTTP read API. The API DTOs are structurally compatible with the package
 * row/detail types, so mapping is limited to pagination (the package uses a
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

    return { items, total };
  },
  getChange: async ({ objectId, changeId, signal }): Promise<ChangeHistoryDetail> =>
    api.getRuleChangeEvent({ id: objectId, eventId: changeId, signal }),
});

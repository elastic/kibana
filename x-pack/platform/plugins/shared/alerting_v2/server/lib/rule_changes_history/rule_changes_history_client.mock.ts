/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleChangesHistoryClientContract } from './rule_changes_history_client';

/**
 * Jest mock for {@link RuleChangesHistoryClientContract}.
 */
export function createRuleChangesHistoryClientMock(): jest.Mocked<RuleChangesHistoryClientContract> {
  return {
    listRuleChanges: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    getRuleChange: jest.fn(),
  };
}

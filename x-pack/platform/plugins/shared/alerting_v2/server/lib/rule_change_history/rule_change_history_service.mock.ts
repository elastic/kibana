/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleChangeHistoryServiceContract } from './rule_change_history_service';

/**
 * Jest mock for {@link RuleChangeHistoryServiceContract}.
 */
export function createRuleChangeHistoryServiceMock(): jest.Mocked<RuleChangeHistoryServiceContract> {
  return {
    initialize: jest.fn(),
    logRuleChanges: jest.fn().mockResolvedValue(undefined),
  };
}

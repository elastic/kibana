/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  RULE_CHANGE_HISTORY_DATASET,
  RULE_CHANGE_HISTORY_MODULE,
  RULE_CHANGE_HISTORY_OBJECT_TYPE,
} from './constants';
import type { RuleChangeHistoryServiceContract } from './rule_change_history_service';

/**
 * Jest mock for {@link RuleChangeHistoryServiceContract}. `isEnabled` defaults
 * to `false` so consumers exercise the "feature off" path by default; flip it
 * per test (`mock.isEnabled.mockReturnValue(true)`) to assert the enriched
 * behaviour.
 */
export function createRuleChangeHistoryServiceMock(): jest.Mocked<RuleChangeHistoryServiceContract> {
  return {
    getScope: jest.fn().mockReturnValue({
      module: RULE_CHANGE_HISTORY_MODULE,
      dataset: RULE_CHANGE_HISTORY_DATASET,
      objectType: RULE_CHANGE_HISTORY_OBJECT_TYPE,
    }),
    isEnabled: jest.fn().mockReturnValue(false),
    isInitialized: jest.fn().mockReturnValue(false),
    initialize: jest.fn(),
    logRuleChanges: jest.fn().mockResolvedValue(undefined),
  };
}

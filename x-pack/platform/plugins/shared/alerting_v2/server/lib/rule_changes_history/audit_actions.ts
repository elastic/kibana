/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleChangeHistoryAction } from '@kbn/alerting-v2-schemas';

/**
 * ECS-style `event.action` values for alerting v2 rule changes history events.
 * Constrained to the API vocabulary so the write path cannot record an action
 * the read contract does not declare.
 */
export const RuleChangesHistoryAction = {
  ruleCreate: 'rule_create',
  ruleUpdate: 'rule_update',
  ruleDelete: 'rule_delete',
  ruleEnable: 'rule_enable',
  ruleDisable: 'rule_disable',
} as const satisfies Record<string, RuleChangeHistoryAction>;

export type RuleChangesHistoryActionType =
  (typeof RuleChangesHistoryAction)[keyof typeof RuleChangesHistoryAction];

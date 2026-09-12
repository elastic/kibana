/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** ECS-style `event.action` values for alerting v2 rule changes history events. */
export const RuleChangesHistoryAction = {
  ruleCreate: 'rule_create',
  ruleUpdate: 'rule_update',
  ruleDelete: 'rule_delete',
  ruleEnable: 'rule_enable',
  ruleDisable: 'rule_disable',
} as const;

export type RuleChangesHistoryActionType =
  (typeof RuleChangesHistoryAction)[keyof typeof RuleChangesHistoryAction];

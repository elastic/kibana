/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const RULE_EXECUTOR_EVENT_PROVIDER = 'alerting_v2' as const;

export const RULE_EXECUTOR_EVENT_ACTIONS = {
  EXECUTE_START: 'execute-start',
  EXECUTE: 'execute',
} as const;

export type RuleExecutorEventAction =
  (typeof RULE_EXECUTOR_EVENT_ACTIONS)[keyof typeof RULE_EXECUTOR_EVENT_ACTIONS];

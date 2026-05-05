/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HaltReason } from './types';

export const RULE_EXECUTOR_EVENT_PROVIDER = 'alerting_v2' as const;

export const RULE_EXECUTOR_EVENT_ACTIONS = {
  EXECUTE_START: 'execute-start',
  EXECUTE: 'execute',
} as const;

export type RuleExecutorEventAction =
  (typeof RULE_EXECUTOR_EVENT_ACTIONS)[keyof typeof RULE_EXECUTOR_EVENT_ACTIONS];

/**
 * Page-facing five-way result for `kibana.alerting_v2.rule_executor.execution.status`.
 * M2 ships only `success` / `failed` / `timeout`; `warning` and `skipped` are M3.
 */
export const RULE_EXECUTION_STATUSES = {
  SUCCESS: 'success',
  FAILED: 'failed',
  TIMEOUT: 'timeout',
} as const;

export type RuleExecutionStatus =
  (typeof RULE_EXECUTION_STATUSES)[keyof typeof RULE_EXECUTION_STATUSES];

/**
 * Reason vocabulary for `event.reason` per RFC rna-program#463.
 *
 * Halt reasons (`rule_disabled` / `rule_deleted` / `state_not_ready`) come from
 * {@link HaltReason} so the pipeline's halt vocabulary is the single source of
 * truth; they're added to `event.reason` verbatim when the pipeline halts. The
 * remaining reasons describe thrown-step or cancellation failures.
 */
export const RULE_EXECUTION_REASONS_THROWN = {
  QUERY_FAILED: 'query_failed',
  RECOVERY_QUERY_FAILED: 'recovery_query_failed',
  STORE_FAILED: 'store_failed',
  DIRECTOR_FAILED: 'director_failed',
  CANCELLED_TIMEOUT: 'cancelled_timeout',
} as const;

export type RuleExecutionReasonThrown =
  (typeof RULE_EXECUTION_REASONS_THROWN)[keyof typeof RULE_EXECUTION_REASONS_THROWN];

export type RuleExecutionReason = HaltReason | RuleExecutionReasonThrown;

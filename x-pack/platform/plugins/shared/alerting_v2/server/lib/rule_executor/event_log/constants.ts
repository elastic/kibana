/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Event-log `event.action` values emitted by the rule executor for the
 * `alerting_v2` provider. Each rule run emits exactly one of each:
 *
 * - `execute-start` — beacon written immediately after task pickup, before any
 *   pipeline step runs.
 * - `execute` — summary written when the pipeline completes (success, halt,
 *   thrown step, or task-timeout cancellation).
 *
 * The provider is registered once on the `eventLog` plugin in
 * `setup/bind_on_setup.ts`; these actions are folded into that registration
 * alongside the dispatcher's `ACTION_POLICY_EVENT_ACTIONS`.
 */
export const RULE_EXECUTOR_EVENT_ACTIONS = {
  EXECUTE_START: 'execute-start',
  EXECUTE: 'execute',
} as const;

export type RuleExecutorEventAction =
  (typeof RULE_EXECUTOR_EVENT_ACTIONS)[keyof typeof RULE_EXECUTOR_EVENT_ACTIONS];

/**
 * Page-facing five-way result for the `execute` event. M2 only emits
 * `success` / `failed` / `timeout`; `warning` and `skipped` arrive in M3
 * and are listed here so downstream consumers can compile against the full
 * vocabulary.
 */
export const RULE_EXECUTOR_EXECUTION_STATUS = {
  SUCCESS: 'success',
  WARNING: 'warning',
  FAILED: 'failed',
  TIMEOUT: 'timeout',
  SKIPPED: 'skipped',
} as const;

export type RuleExecutorExecutionStatus =
  (typeof RULE_EXECUTOR_EXECUTION_STATUS)[keyof typeof RULE_EXECUTOR_EXECUTION_STATUS];

/**
 * Machine-readable codes that explain non-success outcomes.
 * Mapped into `event.reason` per the RFC.
 */
export const RULE_EXECUTOR_REASON = {
  RULE_DISABLED: 'rule_disabled',
  RULE_DELETED: 'rule_deleted',
  STATE_NOT_READY: 'state_not_ready',
  QUERY_FAILED: 'query_failed',
  RECOVERY_QUERY_FAILED: 'recovery_query_failed',
  STORE_FAILED: 'store_failed',
  DIRECTOR_FAILED: 'director_failed',
  CANCELLED_TIMEOUT: 'cancelled_timeout',
} as const;

export type RuleExecutorReason = (typeof RULE_EXECUTOR_REASON)[keyof typeof RULE_EXECUTOR_REASON];

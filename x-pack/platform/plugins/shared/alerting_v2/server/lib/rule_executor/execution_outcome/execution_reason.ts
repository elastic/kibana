/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HaltReason } from '../types';

/**
 * Published vocabulary for `kibana.task.data.reason`.
 *
 * These codes are the contract consumers filter and build dashboards on, so
 * they are deliberately independent of the internal names of the units of
 * work that produce them(execution run steps and their reports): they can be
 * renamed, split or merged without changing what a run reports.
 *
 * `unexpected_error` covers the steps without any code of their own, so every
 * failure still names a cause rather than reporting nothing.
 */
export const RULE_EXECUTION_REASONS = {
  /** The rule was disabled, so the run stopped before evaluating anything. */
  RULE_DISABLED: 'rule_disabled',
  /** The rule saved object no longer exists. */
  RULE_DELETED: 'rule_deleted',
  /** A step ran without the upstream state it requires. */
  STATE_NOT_READY: 'state_not_ready',
  /** The rule query threw. */
  QUERY_FAILED: 'query_failed',
  /** The recovery query threw. */
  RECOVERY_QUERY_FAILED: 'recovery_query_failed',
  /** The no-data query threw. */
  NO_DATA_FAILED: 'no_data_failed',
  /** Persisting alert events failed. */
  STORE_FAILED: 'store_failed',
  /** Episode-transition computation threw. */
  DIRECTOR_FAILED: 'director_failed',
  /** The task timeout fired, whatever was in flight at the time. */
  CANCELLED_TIMEOUT: 'cancelled_timeout',
  /** A step that owns no code of its own threw. */
  UNEXPECTED_ERROR: 'unexpected_error',
} as const;

export type RuleExecutionReason =
  (typeof RULE_EXECUTION_REASONS)[keyof typeof RULE_EXECUTION_REASONS];

/**
 * Code published when a step throws, keyed by step name and listed in
 * execution order.
 *
 * Every step needs an entry, including the ones that report
 * `unexpected_error`: an explicit line is what forces the choice between a
 * code of its own and the catch-all when a step is added.
 * `execution_reason.test.ts` fails on a step that is added, renamed or
 * removed without this map being updated, so the published vocabulary cannot
 * drift from the pipeline unnoticed.
 *
 * `classify_absent_groups` owns two finer codes that its sub-queries tag
 * themselves, so its entry here only applies to a failure elsewhere in the
 * step.
 */
export const STEP_EXECUTION_REASONS: Readonly<Record<string, RuleExecutionReason>> = {
  wait_for_resources: RULE_EXECUTION_REASONS.UNEXPECTED_ERROR,
  fetch_rule: RULE_EXECUTION_REASONS.UNEXPECTED_ERROR,
  validate_rule: RULE_EXECUTION_REASONS.UNEXPECTED_ERROR,
  fetch_active_groups: RULE_EXECUTION_REASONS.UNEXPECTED_ERROR,
  execute_rule_query: RULE_EXECUTION_REASONS.QUERY_FAILED,
  create_alert_events: RULE_EXECUTION_REASONS.UNEXPECTED_ERROR,
  classify_absent_groups: RULE_EXECUTION_REASONS.UNEXPECTED_ERROR,
  director: RULE_EXECUTION_REASONS.DIRECTOR_FAILED,
  store_alert_events: RULE_EXECUTION_REASONS.STORE_FAILED,
};

/**
 * Code published when a run stops early without throwing.
 */
export const HALT_EXECUTION_REASONS: Readonly<Record<HaltReason, RuleExecutionReason>> = {
  rule_deleted: RULE_EXECUTION_REASONS.RULE_DELETED,
  rule_disabled: RULE_EXECUTION_REASONS.RULE_DISABLED,
  state_not_ready: RULE_EXECUTION_REASONS.STATE_NOT_READY,
};

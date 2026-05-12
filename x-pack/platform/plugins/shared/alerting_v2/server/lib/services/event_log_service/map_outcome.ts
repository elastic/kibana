/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isStepExecutionError } from '../../rule_executor/middleware/step_execution_error';
import {
  RULE_EXECUTOR_EXECUTION_STATUS,
  RULE_EXECUTOR_REASON,
  type RuleExecutorExecutionStatus,
  type RuleExecutorReason,
} from '../../rule_executor/event_log/constants';
import type { HaltReason } from '../../rule_executor/types';

const HALT_REASON_TO_REASON: Record<HaltReason, RuleExecutorReason> = {
  rule_deleted: RULE_EXECUTOR_REASON.RULE_DELETED,
  rule_disabled: RULE_EXECUTOR_REASON.RULE_DISABLED,
  state_not_ready: RULE_EXECUTOR_REASON.STATE_NOT_READY,
};

const STEP_NAME_TO_REASON: Record<string, RuleExecutorReason> = {
  execute_rule_query: RULE_EXECUTOR_REASON.QUERY_FAILED,
  create_recovery_events: RULE_EXECUTOR_REASON.RECOVERY_QUERY_FAILED,
  store_alert_events: RULE_EXECUTOR_REASON.STORE_FAILED,
  director: RULE_EXECUTOR_REASON.DIRECTOR_FAILED,
};

export interface OutcomeInput {
  /** Halt reason from a successful (but non-completed) pipeline run, if any. */
  readonly haltReason?: HaltReason;
  /** Throwable captured by the task runner — usually `StepExecutionError`. */
  readonly error?: unknown;
  /**
   * `true` when the run terminated via the `execution_cancelled` event.
   * The caller (`TelemetryObserver`) knows this from the event kind and
   * passes it explicitly so this mapping doesn't need to sniff error
   * shapes for cancellation.
   */
  readonly cancelled?: boolean;
}

export interface OutcomeOutput {
  readonly status: RuleExecutorExecutionStatus;
  readonly reason?: RuleExecutorReason;
}

/**
 * Pure mapping from a pipeline outcome (halt or error) to the page-facing
 * `(status, reason)` pair persisted on the `execute` event-log document.
 *
 * Kept separate from `TelemetryObserver` so the mapping table can be
 * reasoned about and unit-tested in isolation.
 *
 * M2 only emits `success` / `failed` / `timeout`. `warning` and `skipped`
 * arrive in M3.
 */
export const mapOutcome = ({ haltReason, error, cancelled }: OutcomeInput): OutcomeOutput => {
  if (cancelled === true) {
    return {
      status: RULE_EXECUTOR_EXECUTION_STATUS.TIMEOUT,
      reason: RULE_EXECUTOR_REASON.CANCELLED_TIMEOUT,
    };
  }

  if (error != null) {
    if (isStepExecutionError(error)) {
      const reason = STEP_NAME_TO_REASON[error.stepName];
      return {
        status: RULE_EXECUTOR_EXECUTION_STATUS.FAILED,
        reason,
      };
    }

    return { status: RULE_EXECUTOR_EXECUTION_STATUS.FAILED };
  }

  if (haltReason != null) {
    return {
      status: RULE_EXECUTOR_EXECUTION_STATUS.FAILED,
      reason: HALT_REASON_TO_REASON[haltReason],
    };
  }

  return { status: RULE_EXECUTOR_EXECUTION_STATUS.SUCCESS };
};

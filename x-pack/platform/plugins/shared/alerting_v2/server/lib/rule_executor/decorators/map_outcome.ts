/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isRuleExecutionCancellationError } from '../../execution_context';
import { isStepExecutionError } from '../middleware';
import {
  RULE_EXECUTOR_EXECUTION_STATUS,
  RULE_EXECUTOR_REASON,
  type RuleExecutorExecutionStatus,
  type RuleExecutorReason,
} from '../event_log/constants';
import type { HaltReason } from '../types';
import type { RuleExecutionPipelineResult } from '../execution_pipeline';

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
  readonly result: RuleExecutionPipelineResult | undefined;
  readonly error: unknown;
}

export interface OutcomeOutput {
  readonly status: RuleExecutorExecutionStatus;
  readonly reason?: RuleExecutorReason;
}

/**
 * Pure mapping from a pipeline outcome (result-or-error) to the page-facing
 * `(status, reason)` pair persisted on the `execute` event-log document.
 *
 * Kept separate from {@link TelemetryRecorderDecorator} so the mapping table
 * can be reasoned about and unit-tested in isolation.
 *
 * M2 only emits `success` / `failed` / `timeout`. `warning` and `skipped`
 * arrive in M3.
 */
export const mapOutcome = ({ result, error }: OutcomeInput): OutcomeOutput => {
  if (error != null) {
    if (isRuleExecutionCancellationError(error)) {
      return {
        status: RULE_EXECUTOR_EXECUTION_STATUS.TIMEOUT,
        reason: RULE_EXECUTOR_REASON.CANCELLED_TIMEOUT,
      };
    }

    if (isStepExecutionError(error)) {
      const reason = STEP_NAME_TO_REASON[error.stepName];
      return {
        status: RULE_EXECUTOR_EXECUTION_STATUS.FAILED,
        reason,
      };
    }

    // Unknown / unwrapped throw — still a failure but without a specific reason.
    return { status: RULE_EXECUTOR_EXECUTION_STATUS.FAILED };
  }

  if (result == null) {
    // Defensive: should never happen — execute() either resolves or throws.
    return { status: RULE_EXECUTOR_EXECUTION_STATUS.FAILED };
  }

  if (!result.completed && result.haltReason != null) {
    return {
      status: RULE_EXECUTOR_EXECUTION_STATUS.FAILED,
      reason: HALT_REASON_TO_REASON[result.haltReason],
    };
  }

  return { status: RULE_EXECUTOR_EXECUTION_STATUS.SUCCESS };
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { ExecutionStatus, TerminalExecutionStatuses } from '@kbn/workflows';
import { getExecutionState } from '@kbn/agent-builder-tools-base/workflows';
import type { WorkflowExecutionState } from '@kbn/agent-builder-tools-base/workflows';

type WorkflowApi = WorkflowsServerPluginSetup['management'];

export interface PollForWorkflowAdvanceParams {
  executionId: string;
  logger: Logger;
  maxAttempts?: number;
  pollIntervalMs?: number;
  previousStepExecutionId: string | undefined;
  spaceId: string;
  workflowApi: WorkflowApi;
}

/**
 * Polls getExecutionState until the workflow advances past the given step:
 *  - `waiting_input.step_execution_id` changes (workflow reached a new pause point), OR
 *  - `status` is a terminal status (COMPLETED, FAILED, TIMED_OUT, CANCELLED, SKIPPED).
 *
 * RUNNING is intentionally NOT a termination condition — it is the transient state
 * between two waitForInput steps in a multi-step HITL workflow and must be polled through.
 *
 * Resolves to `null` if maxAttempts is exhausted without the workflow advancing (S9 timeout).
 *
 * This is the fix for the TaskManager async race (R1): resumeWorkflowExecution schedules
 * an async task; calling getExecutionState immediately would still show the old step.
 */
export const pollForWorkflowAdvance = async ({
  executionId,
  logger,
  maxAttempts = 20,
  pollIntervalMs = 500,
  previousStepExecutionId,
  spaceId,
  workflowApi,
}: PollForWorkflowAdvanceParams): Promise<WorkflowExecutionState | null> => {
  logger.debug(
    () =>
      `[hitl-debug][ab] poll.start exec=${executionId} seq=(none) stepId=${
        previousStepExecutionId ?? '(none)'
      } maxAttempts=${maxAttempts}`
  );

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const state = await getExecutionState({ executionId, spaceId, workflowApi });

    logger.debug(
      () =>
        `[hitl-debug][ab] poll.attempt n=${attempt}/${maxAttempts} exec=${executionId} seq=${
          state?.resume_seq ?? '(none)'
        } stepId=${state?.waiting_input?.step_execution_id ?? 'none'} status=${
          state?.status ?? 'null'
        }`
    );

    if (state === null) {
      // Execution not found — treat as terminal (S9 / error state)
      logger.debug(
        () =>
          `[hitl-debug][ab] poll.notFound exec=${executionId} seq=(none) stepId=(none) attempt=${attempt}`
      );
      return null;
    }

    // Workflow reached a terminal state — done, no more waitForInput steps.
    // RUNNING is intentionally excluded: it is the transient state between two
    // waitForInput steps in a multi-step HITL workflow and must be polled through.
    if (TerminalExecutionStatuses.includes(state.status)) {
      logger.debug(
        () =>
          `[hitl-debug][ab] poll.terminal exec=${executionId} seq=${
            state.resume_seq ?? '(none)'
          } stepId=(none) status=${state.status} attempt=${attempt}`
      );
      return state;
    }

    // Workflow paused at a DIFFERENT step — new form prompt available (S1)
    if (
      state.status === ExecutionStatus.WAITING_FOR_INPUT &&
      state.waiting_input?.step_execution_id !== previousStepExecutionId
    ) {
      logger.debug(
        () =>
          `[hitl-debug][ab] poll.advanced exec=${executionId} seq=${
            state.resume_seq ?? '(none)'
          } stepId=${state.waiting_input?.step_execution_id ?? 'none'} attempt=${attempt}`
      );
      return state;
    }

    // Still same step — wait and retry (S2: task not yet materialized)
    if (attempt < maxAttempts) {
      await new Promise<void>((resolve) => setTimeout(resolve, pollIntervalMs));
    }
  }

  // Timed out (S9)
  logger.debug(
    () =>
      `[hitl-debug][ab] poll.timeout exec=${executionId} seq=(none) stepId=${
        previousStepExecutionId ?? '(none)'
      } maxAttempts=${maxAttempts}`
  );
  return null;
};

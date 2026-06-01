/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { ExecutionStatus, TerminalExecutionStatuses } from '@kbn/workflows';
import type { ToolCallStep } from '@kbn/agent-builder-common';
import { isOtherResult } from '@kbn/agent-builder-common/tools/tool_result';
import type { WorkflowExecutionState } from '@kbn/agent-builder-tools-base/workflows';
import type { ResumedFormPromptState } from '../../../runner/utils/resume_form_prompts';

const TERMINAL_STATUSES = new Set<string>(TerminalExecutionStatuses);

const isWorkflowExecution = (value: unknown): value is WorkflowExecutionState =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as Record<string, unknown>).execution_id === 'string';

const extractWorkflowExecution = (
  step: ToolCallStep
): { index: number; execution: WorkflowExecutionState } | null => {
  for (let i = 0; i < step.results.length; i++) {
    const result = step.results[i];
    if (!isOtherResult(result)) continue;
    const execution = (result.data as Record<string, unknown>).execution;
    if (isWorkflowExecution(execution)) return { execution, index: i };
  }
  return null;
};

const buildFreshExecution = (
  current: WorkflowExecutionState,
  observedStatus: string
): WorkflowExecutionState => ({
  execution_id: current.execution_id,
  started_at: current.started_at,
  status: observedStatus as ExecutionStatus,
  workflow_id: current.workflow_id,
  ...(current.workflow_name !== undefined && { workflow_name: current.workflow_name }),
});

const rewriteExecution = (
  step: ToolCallStep,
  resultIndex: number,
  freshExecution: WorkflowExecutionState
): ToolCallStep => ({
  ...step,
  results: step.results.map((result, index) => {
    if (index !== resultIndex) return result;
    return {
      ...result,
      data: { ...(result.data as Record<string, unknown>), execution: freshExecution },
    };
  }),
});

export const refreshStaleWorkflowExecution = ({
  logger,
  resumedStates,
  step,
}: {
  logger: Logger;
  resumedStates: ResumedFormPromptState[];
  step: ToolCallStep;
}): ToolCallStep => {
  // I4: non-workflow tool result — pass through
  const found = extractWorkflowExecution(step);
  if (found === null) return step;

  const { execution: currentExecution, index: resultIndex } = found;

  // I5: no match in resumedStates — pass through
  const resumedState = resumedStates.find((s) => s.execution_id === currentExecution.execution_id);
  if (resumedState === undefined) return step;

  const { observedExecution, observedStatus } = resumedState;

  const observedSeq = observedExecution?.resume_seq ?? '(none)';

  // I1: terminal status — replace execution, strip waiting_input
  if (TERMINAL_STATUSES.has(observedStatus)) {
    logger.debug(
      () =>
        `[hitl-debug][ab] refresh.I1 exec=${currentExecution.execution_id} seq=${observedSeq} stepId=(none) status=${observedStatus}`
    );
    const freshExecution =
      observedExecution ?? buildFreshExecution(currentExecution, observedStatus);
    return rewriteExecution(step, resultIndex, freshExecution);
  }

  // I2 / I3: WAITING_FOR_INPUT
  if (observedStatus === ExecutionStatus.WAITING_FOR_INPUT) {
    const currentStepId = currentExecution.waiting_input?.step_execution_id;
    const newStepId = observedExecution?.waiting_input?.step_execution_id;

    if (newStepId !== undefined && newStepId === currentStepId) {
      // I3: same step_execution_id after resume — TaskManager async race: task has not
      // yet materialized the next workflow state. pollForWorkflowAdvance should prevent
      // this from reaching here; if it does, it means we reached the poll timeout.
      logger.debug(
        () =>
          `[hitl-debug][ab] refresh.I3 exec=${currentExecution.execution_id} seq=${observedSeq} stepId=${currentStepId} (task not yet run)`
      );
      logger.error(
        () =>
          `[refreshStaleWorkflowExecution] invariant violation: execution ${currentExecution.execution_id} ` +
          `is still WAITING_FOR_INPUT on the same step_execution_id (${currentStepId}) after resume`
      );
      return step;
    }

    // I2: different step_execution_id — workflow advanced to new pause point
    logger.debug(
      () =>
        `[hitl-debug][ab] refresh.I2 exec=${currentExecution.execution_id} seq=${observedSeq} oldStepId=${currentStepId} newStepId=${newStepId}`
    );
    const freshExecution =
      observedExecution ?? buildFreshExecution(currentExecution, observedStatus);
    return rewriteExecution(step, resultIndex, freshExecution);
  }

  // I4: workflow is still running (e.g. poll timeout — task materializing the next state has
  // not yet completed). Replace the execution snapshot to strip waiting_input so the LLM does
  // not re-prompt the user for the step that was just submitted.
  if (currentExecution.waiting_input !== undefined) {
    logger.debug(
      () =>
        `[hitl-debug][ab] refresh.I-processing exec=${currentExecution.execution_id} seq=${observedSeq} stepId=(none) observedStatus=${observedStatus} (stripping waiting_input)`
    );
    return rewriteExecution(
      step,
      resultIndex,
      buildFreshExecution(currentExecution, observedStatus)
    );
  }

  return step;
};

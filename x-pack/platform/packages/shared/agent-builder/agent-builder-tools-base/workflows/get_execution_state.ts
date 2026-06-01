/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { JsonValue } from '@kbn/utility-types';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { WaitForInputStep, WorkflowExecutionDto } from '@kbn/workflows';
import { ExecutionStatus, getStepByNameFromNestedSteps } from '@kbn/workflows';
import { getWorkflowOutput } from './get_workflow_output';
import { resolveWaitingInputContext } from './helpers/resolve_waiting_input';
import type { WaitingInputContext } from './helpers/resolve_waiting_input';

export type {
  WaitingInputAgentContext,
  WaitingInputContext,
} from './helpers/resolve_waiting_input';

type WorkflowApi = WorkflowsServerPluginSetup['management'];

export interface WorkflowExecutionState {
  execution_id: string;
  status: ExecutionStatus;
  workflow_id: string;
  started_at: string;
  finished_at?: string;
  output?: JsonValue;
  workflow_name?: string;
  /** Present when status is FAILED; contains the workflow error message. */
  error_message?: string;
  /** Present when status is WAITING_FOR_INPUT. */
  waiting_input?: WaitingInputContext;
  /**
   * Monotonic resume sequence number. Missing on pre-CAS executions; callers
   * should treat undefined/missing as 0.
   */
  resume_seq?: number;
}

/**
 * Converts a workflow execution DTO into the state shape exposed to agent tools.
 */
export const toWorkflowExecutionState = (
  execution: WorkflowExecutionDto,
  executionId: string = execution.id
): WorkflowExecutionState => {
  const state: WorkflowExecutionState = {
    execution_id: executionId,
    status: execution.status,
    workflow_id: execution.workflowId ?? 'unknown',
    started_at: execution.startedAt,
    finished_at: execution.finishedAt,
    workflow_name: execution.workflowDefinition.name,
    ...(typeof execution.resume_seq === 'number' && {
      resume_seq: execution.resume_seq,
    }),
  };

  if (execution.status === ExecutionStatus.COMPLETED) {
    state.output = getWorkflowOutput(execution.stepExecutions);
  }

  if (execution.status === ExecutionStatus.FAILED && execution.error) {
    state.error_message = execution.error.message;
  }

  if (execution.status === ExecutionStatus.WAITING_FOR_INPUT) {
    const waitingStep = execution.stepExecutions.find(
      (s) => s.status === ExecutionStatus.WAITING_FOR_INPUT
    );

    if (waitingStep) {
      const step = getStepByNameFromNestedSteps(
        execution.workflowDefinition.steps,
        waitingStep.stepId
      );
      const stepConfig =
        step?.type === 'waitForInput' ? (step as WaitForInputStep).with : undefined;

      state.waiting_input = resolveWaitingInputContext({
        stepConfig: stepConfig as
          | { message?: string; schema?: Record<string, unknown> }
          | undefined,
        waitingStep: waitingStep as unknown as { id: string; input?: Record<string, unknown> },
      });
    }
  }

  return state;
};

/**
 * Returns the state of a workflow execution.
 */
export const getExecutionState = async ({
  executionId,
  spaceId,
  workflowApi,
}: {
  executionId: string;
  spaceId: string;
  workflowApi: WorkflowApi;
}): Promise<WorkflowExecutionState | null> => {
  const execution = await workflowApi.getWorkflowExecution(executionId, spaceId, {
    // includeInput is required so a WAITING_FOR_INPUT execution carries the paused step's input —
    // the only source of schema/message/agent_context for nested ai.agent HITL steps.
    includeInput: true,
    includeOutput: true,
  });
  if (!execution) {
    return null;
  }

  return toWorkflowExecutionState(execution, executionId);
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import type { JsonValue } from '@kbn/utility-types';
import { isTerminalStatus } from '@kbn/workflows';
import { ExecutionError } from '@kbn/workflows/server';
import type {
  EsWorkflowExecution,
  EsWorkflowStepExecution,
  WorkflowStepExecutionDto,
} from '@kbn/workflows/types/v1';
import type { StepExecutionRepository } from '../../repositories/step_execution_repository';
import type { IWorkflowEventLogger } from '../../workflow_event_logger';

/**
 * Resolves the output of a completed child execution: its declared `workflow.output`, or the
 * output of its last top-level step when it declares none.
 */
export const readChildExecutionOutput = async (
  execution: EsWorkflowExecution,
  stepExecutionRepository: StepExecutionRepository
): Promise<JsonValue | undefined> => {
  if (execution.context?.output) {
    return execution.context.output as JsonValue;
  }

  const stepExecutions = await stepExecutionRepository.getStepExecutionsByWorkflowExecution(
    execution.id,
    execution.stepExecutionIds
  );
  const stepExecutionDtos: WorkflowStepExecutionDto[] = stepExecutions.map((exec) =>
    omit(exec, ['spaceId'])
  );
  const output = getWorkflowOutput(stepExecutionDtos);
  return output === null ? undefined : output;
};

/**
 * Builds the error a parent step reports when a child execution did not complete,
 * preferring the most specific detail available over a bare status string.
 */
export const buildChildFailureError = async (
  execution: EsWorkflowExecution,
  stepExecutionRepository: StepExecutionRepository,
  workflowLogger: IWorkflowEventLogger
): Promise<ExecutionError> => {
  if (execution.error) {
    return new ExecutionError(execution.error);
  }

  if (execution.cancellationReason) {
    return new ExecutionError({
      type: 'Error',
      message: `Sub-workflow execution ${execution.status}: ${execution.cancellationReason}`,
    });
  }

  const failingStep = await findFailingChildStep(
    execution,
    stepExecutionRepository,
    workflowLogger
  );
  if (failingStep) {
    const stepType = failingStep.stepType ? ` (${failingStep.stepType})` : '';
    const detail = failingStep.error?.message ? `: ${failingStep.error.message}` : '';
    return new ExecutionError({
      type: 'Error',
      message: `Sub-workflow execution ${execution.status} at step '${failingStep.stepId}'${stepType}${detail}`,
    });
  }

  return new ExecutionError({
    type: 'Error',
    message: `Sub-workflow execution ${execution.status}`,
  });
};

/**
 * Finds the child step most responsible for the failure. On timeout the zone
 * fails the running step with a `TimeoutError` and clears the workflow-level
 * error, so we look for the latest step carrying an error (or still running)
 * rather than a top-level error that is no longer there.
 */
const findFailingChildStep = async (
  execution: EsWorkflowExecution,
  stepExecutionRepository: StepExecutionRepository,
  workflowLogger: IWorkflowEventLogger
): Promise<EsWorkflowStepExecution | undefined> => {
  try {
    const stepExecutions = await stepExecutionRepository.getStepExecutionsByWorkflowExecution(
      execution.id,
      execution.stepExecutionIds
    );
    const candidates = stepExecutions.filter(
      (step) => step.error != null || !isTerminalStatus(step.status)
    );
    if (candidates.length === 0) {
      return undefined;
    }
    return candidates.reduce((latest, step) =>
      step.globalExecutionIndex > latest.globalExecutionIndex ? step : latest
    );
  } catch (error) {
    // Best-effort: a read failure must not crash the parent step.
    workflowLogger.logDebug(
      `Failed to read child step executions for failure enrichment: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return undefined;
  }
};

/**
 * Recursively extracts the output from a workflow execution's step executions.
 * At top-level (scopeDepth=0), finds the last step. At nested levels (scopeDepth>0),
 * considers all steps at that level. If steps have children, recurses into them.
 * Otherwise, returns their output(s).
 */
const getWorkflowOutput = (stepExecutions: WorkflowStepExecutionDto[]): JsonValue => {
  if (stepExecutions.length === 0) {
    return null;
  }

  let minDepth = stepExecutions[0].scopeStack.length;
  for (let i = 1; i < stepExecutions.length; i++) {
    minDepth = Math.min(minDepth, stepExecutions[i].scopeStack.length);
  }

  return getWorkflowOutputRecursive(stepExecutions, minDepth, minDepth);
};

const getWorkflowOutputRecursive = (
  stepExecutions: WorkflowStepExecutionDto[],
  scopeDepth: number,
  minDepth: number
): JsonValue => {
  if (stepExecutions.length === 0) {
    return null;
  }

  const stepsAtThisLevel = stepExecutions.filter((step) => step.scopeStack.length === scopeDepth);
  if (stepsAtThisLevel.length === 0) {
    return null;
  }

  const stepsToProcess =
    scopeDepth === minDepth ? [stepsAtThisLevel[stepsAtThisLevel.length - 1]] : stepsAtThisLevel;

  const children = stepExecutions.filter((step) => {
    if (step.scopeStack.length !== scopeDepth + 1) return false;
    const lastFrame = step.scopeStack[step.scopeStack.length - 1];
    return stepsToProcess.some((parentStep) => lastFrame.stepId === parentStep.stepId);
  });

  if (children.length > 0) {
    const descendants = stepExecutions.filter((step) =>
      step.scopeStack.some((frame) =>
        stepsToProcess.some((parentStep) => frame.stepId === parentStep.stepId)
      )
    );
    return getWorkflowOutputRecursive(descendants, scopeDepth + 1, minDepth);
  }

  if (scopeDepth === minDepth && stepsToProcess.length === 1) {
    return stepsToProcess[0].output ?? null;
  }

  const outputs = stepsToProcess
    .map((step) => step.output)
    .filter((output): output is JsonValue => output !== undefined);

  return outputs.length > 0 ? outputs : null;
};

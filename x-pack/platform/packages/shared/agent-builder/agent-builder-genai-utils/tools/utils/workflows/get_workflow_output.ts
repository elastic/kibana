/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowStepExecutionDto } from '@kbn/workflows/types/v1';
import type { JsonValue } from '@kbn/utility-types';

/**
 * Recursively extracts the output from a workflow execution's step executions.
 * At top-level (scopeDepth=0), finds the last step. At nested levels (scopeDepth>0),
 * considers all steps at that level. If steps have children, recurses into them.
 * Otherwise, returns their output(s).
 */
export const getWorkflowOutput = (stepExecutions: WorkflowStepExecutionDto[]): JsonValue => {
  if (stepExecutions.length === 0) {
    return null;
  }

  // workflow execution do not necessarily start at depth 0
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

  // Filter for steps at the current scope depth
  const stepsAtThisLevel = stepExecutions.filter((step) => step.scopeStack.length === scopeDepth);
  if (stepsAtThisLevel.length === 0) {
    return null;
  }

  // At top-level (scopeDepth = minDepth), only consider the last step
  // At nested levels (scopeDepth > minDepth), consider all steps
  const stepsToProcess =
    scopeDepth === minDepth ? [stepsAtThisLevel[stepsAtThisLevel.length - 1]] : stepsAtThisLevel;

  // Find all children of the steps we're processing
  const children = stepExecutions.filter((step) => {
    if (step.scopeStack.length !== scopeDepth + 1) return false;
    const lastFrame = step.scopeStack[step.scopeStack.length - 1];
    return stepsToProcess.some((parentStep) => lastFrame.stepId === parentStep.stepId);
  });

  // If there are children, recurse into them
  // Pass only descendants (steps that have any of stepsToProcess in their scopeStack)
  if (children.length > 0) {
    const descendants = stepExecutions.filter((step) =>
      step.scopeStack.some((frame) =>
        stepsToProcess.some((parentStep) => frame.stepId === parentStep.stepId)
      )
    );
    return getWorkflowOutputRecursive(descendants, scopeDepth + 1, minDepth);
  }

  // Else, return the output(s)
  // At scopeDepth > minDepth, always return as array to aggregate sibling iterations
  // At scopeDepth = minDepth with a single step, return the output directly
  if (scopeDepth === minDepth && stepsToProcess.length === 1) {
    return stepsToProcess[0].output ?? null;
  }

  const outputs = stepsToProcess
    .map((step) => step.output)
    .filter((output): output is JsonValue => output !== undefined);

  return outputs.length > 0 ? outputs : null;
};

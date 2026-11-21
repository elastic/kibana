/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isScalar, isSeq, type LineCounter } from 'yaml';
import {
  WORKFLOW_AWAIT_EXECUTIONS_STEP_TYPE,
  WORKFLOW_EXECUTE_ASYNC_STEP_TYPE,
  type WorkflowValidationRuleId,
} from '@kbn/workflows';
import type { YamlValidationResult } from '@kbn/workflows-yaml';
import type {
  StepInfo,
  WorkflowLookup,
} from '../../../entities/workflows/store/workflow_detail/utils/build_workflow_lookup';

const FROM_STEPS_PROP = 'with.from-steps';

const isAncestorOf = (
  candidateAncestorId: string,
  step: StepInfo,
  workflowLookup: WorkflowLookup
): boolean => {
  let parentStepId = step.parentStepId;
  while (parentStepId !== undefined) {
    if (parentStepId === candidateAncestorId) {
      return true;
    }
    parentStepId = workflowLookup.steps[parentStepId]?.parentStepId;
  }
  return false;
};

const startsExecutions = (stepId: string, workflowLookup: WorkflowLookup): boolean =>
  Object.values(workflowLookup.steps).some(
    (step) =>
      step.stepType === WORKFLOW_EXECUTE_ASYNC_STEP_TYPE &&
      (step.stepId === stepId || isAncestorOf(stepId, step, workflowLookup))
  );

const getReferenceProblem = (
  stepName: string,
  awaitStep: StepInfo,
  workflowLookup: WorkflowLookup
): { ruleId: WorkflowValidationRuleId; message: string } | undefined => {
  const referencedStep = workflowLookup.steps[stepName];
  if (!referencedStep) {
    return {
      ruleId: 'unknownAwaitedStep',
      message: `Step "${stepName}" does not exist in this workflow.`,
    };
  }
  if (stepName === awaitStep.stepId || isAncestorOf(stepName, awaitStep, workflowLookup)) {
    return {
      ruleId: 'awaitedStepNotFinished',
      message:
        `Step "${stepName}" contains "${awaitStep.stepId}", so it has not finished when ` +
        `"${awaitStep.stepId}" runs. Await it from a step that runs after "${stepName}".`,
    };
  }
  if (referencedStep.lineStart > awaitStep.lineStart) {
    return {
      ruleId: 'awaitedStepNotFinished',
      message: `Step "${stepName}" runs after "${awaitStep.stepId}". Reference only steps that run before it.`,
    };
  }
  if (!startsExecutions(stepName, workflowLookup)) {
    return {
      ruleId: 'awaitedStepStartsNoExecutions',
      message: `Step "${stepName}" contains no ${WORKFLOW_EXECUTE_ASYNC_STEP_TYPE} step, so it starts no executions to await.`,
    };
  }
  return undefined;
};

/** Names of the steps an await step may list in `from-steps`, in document order. */
export const getAwaitableStepNames = (
  awaitStep: StepInfo,
  workflowLookup: WorkflowLookup
): string[] =>
  Object.values(workflowLookup.steps)
    .filter(({ stepId }) => !getReferenceProblem(stepId, awaitStep, workflowLookup))
    .sort((left, right) => left.lineStart - right.lineStart)
    .map(({ stepId }) => stepId);

/**
 * Checks that every `from-steps` entry of a `workflow.awaitExecutions` step names a step that
 * exists, has finished by the time the await runs, and can start executions.
 */
export function validateAwaitExecutionsReferences(
  workflowLookup: WorkflowLookup,
  lineCounter: LineCounter
): YamlValidationResult[] {
  return Object.values(workflowLookup.steps).flatMap((awaitStep) => {
    const fromStepsNode = awaitStep.propInfos[FROM_STEPS_PROP]?.valueNode as unknown;
    if (awaitStep.stepType !== WORKFLOW_AWAIT_EXECUTIONS_STEP_TYPE || !isSeq(fromStepsNode)) {
      return [];
    }

    return fromStepsNode.items.flatMap((item): YamlValidationResult[] => {
      if (!isScalar(item) || typeof item.value !== 'string' || !item.range) {
        return [];
      }
      const problem = getReferenceProblem(item.value, awaitStep, workflowLookup);
      if (!problem) {
        return [];
      }

      const [startOffset, endOffset] = item.range;
      const startPos = lineCounter.linePos(startOffset);
      const endPos = lineCounter.linePos(endOffset);
      return [
        {
          id: `await-executions-${awaitStep.stepId}-${startPos.line}-${startPos.col}`,
          owner: 'await-executions-validation',
          ruleId: problem.ruleId,
          severity: 'error',
          message: problem.message,
          hoverMessage: null,
          startLineNumber: startPos.line,
          startColumn: startPos.col,
          endLineNumber: endPos.line,
          endColumn: endPos.col,
        },
      ];
    });
  });
}

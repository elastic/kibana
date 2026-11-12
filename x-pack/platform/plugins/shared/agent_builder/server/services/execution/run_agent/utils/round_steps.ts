/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PreExecutionWorkflowStep,
  PreExecutionWorkflowStepData,
} from '@kbn/agent-builder-common';
import { createPreExecutionWorkflowStep } from '@kbn/agent-builder-common';

export type PreExecutionStep = PreExecutionWorkflowStep;

/** The bookkeeping steps a run starts with, before the agent produces anything. */
export const createPreExecutionSteps = ({
  preExecutionWorkflow,
}: {
  preExecutionWorkflow?: PreExecutionWorkflowStepData;
}): PreExecutionStep[] => {
  if (
    preExecutionWorkflow?.model_context !== undefined ||
    preExecutionWorkflow?.workflow_context !== undefined
  ) {
    return [createPreExecutionWorkflowStep(preExecutionWorkflow)];
  }
  return [];
};

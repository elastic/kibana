/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import { createEvalsServerSteps } from './steps';
import type { EvalStepDeps } from './types';

export type { EvalStepDeps } from './types';
export { createEvalsServerSteps } from './steps';

/**
 * Registers all evals workflow steps with the Workflows engine.
 */
export const registerEvalsWorkflowSteps = (
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup,
  deps: EvalStepDeps
): void => {
  for (const step of createEvalsServerSteps(deps)) {
    workflowsExtensions.registerStepDefinition(step);
  }
};

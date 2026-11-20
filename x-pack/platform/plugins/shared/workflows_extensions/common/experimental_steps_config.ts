/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface WorkflowsExtensionsExperimentalStepsConfig {
  readonly javaScriptStep: boolean;
}

export type WorkflowsExtensionsExperimentalStepsInputConfig =
  | boolean
  | WorkflowsExtensionsExperimentalStepsConfig;

export interface WorkflowsExtensionsConfig {
  readonly experimentalSteps: WorkflowsExtensionsExperimentalStepsInputConfig;
}

export const resolveExperimentalStepsConfig = (
  experimentalSteps: WorkflowsExtensionsExperimentalStepsInputConfig
): WorkflowsExtensionsExperimentalStepsConfig => {
  if (typeof experimentalSteps === 'boolean') {
    return {
      javaScriptStep: experimentalSteps,
    };
  }

  return experimentalSteps;
};

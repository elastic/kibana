/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const PLUGIN_ID = 'evals' as const;
export const PLUGIN_NAME = 'Evaluations' as const;
export const APP_PATH = '/app/evals' as const;

export const EVALS_API_PRIVILEGES = {
  read: 'read_evals',
  manage: 'manage_evals',
} as const;

export const EVALS_UI_PRIVILEGES = {
  show: 'show',
  manage: 'manage',
} as const;

export type {
  OnlineEvalWorkflowEvaluatorConfig,
  OnlineEvalWorkflowConfig,
} from './online_evals/workflow_yaml';
export {
  buildOnlineEvalWorkflowYaml,
  ONLINE_EVAL_WORKFLOW_TAG,
  parseOnlineEvalWorkflowYaml,
} from './online_evals/workflow_yaml';
export {
  MAX_ID_LENGTH,
  MAX_NAME_LENGTH,
  EXPERIMENT_LIMITS,
  EVALS_EXPERIMENT_WORKFLOW_TAG,
  isEvalsOwnedWorkflow,
} from './experiments/run_experiment';

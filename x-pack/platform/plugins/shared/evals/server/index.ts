/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializer, PluginInitializerContext } from '@kbn/core/server';
import type { EvalsConfig } from './config';
import type {
  EvalsPluginSetup,
  EvalsPluginStart,
  EvalsSetupDependencies,
  EvalsStartDependencies,
} from './types';

export type {
  EvalsPluginSetup,
  EvalsPluginStart,
  EvaluatorSummary,
  ModelConnectorSummary,
} from './types';
export type {
  EvaluateEvidence,
  EvaluateFn,
  EvaluateParams,
} from './evaluation/create_evaluate_contract';
export { EvaluationExecutionError } from './evaluation/evaluation_execution_error';
export type {
  EvaluatorContext,
  EvaluatorResult,
  RegisteredEvaluatorDefinition,
  TraceAccessor,
} from './evaluators/types';
export type { EvidenceRound, ToolCallEvidence } from './evaluators/evidence/types';

export {
  generateExperimentRun,
  generateSavedWorkflowYaml,
  experimentRequestToParams,
} from './workflow_generator';

export type {
  GenerateExperimentParams,
  GeneratedExperimentRun,
  GeneratedExecution,
  GeneratedSavedWorkflow,
  WorkflowEvaluatorInput,
  ExperimentRunMode,
} from './workflow_generator';

export const plugin: PluginInitializer<
  EvalsPluginSetup,
  EvalsPluginStart,
  EvalsSetupDependencies,
  EvalsStartDependencies
> = async (pluginInitializerContext: PluginInitializerContext<EvalsConfig>) => {
  const { EvalsPlugin } = await import('./plugin');
  return new EvalsPlugin(pluginInitializerContext);
};

export { config } from './config';
export type { EvalsMode } from './config';

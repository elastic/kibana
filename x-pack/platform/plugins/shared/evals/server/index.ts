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

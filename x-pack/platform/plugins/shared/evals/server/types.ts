/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CustomRequestHandlerContext, IRouter } from '@kbn/core/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type { PluginSetupContract as ActionsPluginSetup, PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { DatasetService } from './storage/dataset_service';
import type { ServerEvaluator } from './lib/evaluation_engine';

export interface EvalsPluginSetup {
  registerEvaluator: (evaluator: ServerEvaluator) => void;
}
export interface EvalsPluginStart {
  datasetService?: DatasetService;
}

export interface EvalsSetupDependencies {
  features: FeaturesPluginSetup;
  actions?: ActionsPluginSetup;
  agentBuilder?: any; // Optional: Required for AESOP agent auto-creation
  workflows?: any; // Optional: Required for AESOP workflow registration
}

export interface EvalsStartDependencies {
  actions?: ActionsPluginStart;
  agentBuilder?: any; // Optional: Required for AESOP agent auto-creation
  workflows?: any; // Optional: Required for AESOP workflow execution
}

export interface EvalsRouteHandlerContext {
  datasetService: DatasetService;
  getActionsStart: () => ActionsPluginStart | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getAgentBuilderStart: () => Promise<any | undefined>;
}

export type EvalsRequestHandlerContext = CustomRequestHandlerContext<{
  evals: EvalsRouteHandlerContext;
}>;

export type EvalsRouter = IRouter<EvalsRequestHandlerContext>;

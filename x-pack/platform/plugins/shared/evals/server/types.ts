/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CustomRequestHandlerContext, IRouter } from '@kbn/core/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type {
  PluginSetupContract as ActionsPluginSetup,
  PluginStartContract as ActionsPluginStart,
} from '@kbn/actions-plugin/server';
import type { EncryptedSavedObjectsPluginSetup } from '@kbn/encrypted-saved-objects-plugin/server';
import type { EncryptedSavedObjectsPluginStart } from '@kbn/encrypted-saved-objects-plugin/server';
import type { DatasetService } from './storage/dataset_service';
import type { ServerEvaluator } from './lib/evaluation_engine';

/**
 * Structural placeholder for the `@kbn/agent-builder-plugin` Setup/Start
 * contract.
 *
 * We cannot import the real AgentBuilderPluginSetup / AgentBuilderPluginStart
 * types here because agent_builder already optionally depends on `evals`
 * (for the skill-eval UI surface), which would form a TS project-reference
 * cycle. The proper fix is to extract the plugin contract into a shared
 * `@kbn/evals-agent-builder-contract` package and have both plugins depend
 * on it. Tracked as tech debt against PR B6 (Agent Builder integration
 * slice).
 *
 * For now we preserve the erased-call-site shape the routes use
 * (`skills.x`, `agents.x`, etc.) via an indexed signature, so adding fields
 * to the real plugin contract doesn't break this boundary.
 */

export type AgentBuilderContractLike = Record<string, any>;

export interface EvalsPluginSetup {
  registerEvaluator: (evaluator: ServerEvaluator) => void;
}
export interface EvalsPluginStart {
  datasetService?: DatasetService;
}

export interface EvalsSetupDependencies {
  features: FeaturesPluginSetup;
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup;
  actions?: ActionsPluginSetup;
  agentBuilder?: AgentBuilderContractLike;
}

export interface EvalsStartDependencies {
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
  actions?: ActionsPluginStart;
  agentBuilder?: AgentBuilderContractLike;
}

export interface EvalsRouteHandlerContext {
  datasetService: DatasetService;
  getActionsStart: () => ActionsPluginStart | undefined;
  getAgentBuilderStart: () => Promise<AgentBuilderContractLike | undefined>;
}

export type EvalsRequestHandlerContext = CustomRequestHandlerContext<{
  evals: EvalsRouteHandlerContext;
}>;

export type EvalsRouter = IRouter<EvalsRequestHandlerContext>;

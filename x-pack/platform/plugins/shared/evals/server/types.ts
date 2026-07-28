/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CustomRequestHandlerContext, IRouter, KibanaRequest } from '@kbn/core/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type { EncryptedSavedObjectsPluginSetup } from '@kbn/encrypted-saved-objects-plugin/server';
import type { EncryptedSavedObjectsPluginStart } from '@kbn/encrypted-saved-objects-plugin/server';
import type { InferenceServerSetup, InferenceServerStart } from '@kbn/inference-plugin/server';
import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import type { DatasetService } from './storage/dataset_service';
import type { EvaluationScoreService } from './storage/evaluation_score_service';
import type { OnlineScoreService } from './storage/online_score_service';
import type { EvaluatorRegistry } from './evaluators/types';
import type { EvalsTaskProvider } from './task_providers/types';

export interface EvalsPluginSetup {
  enabled: boolean;
  registerTaskProvider: (provider: EvalsTaskProvider) => void;
}

export interface EvaluatorSummary {
  name: string;
  version: string;
  kind: 'llm' | 'code';
  description: string;
  needsJudgeConnector: boolean;
}

export interface ModelConnectorSummary {
  id: string;
  name: string;
  type: string;
}

export interface EvalsPluginStart {
  datasetService?: DatasetService;
  evaluationScoreService?: EvaluationScoreService;
  listEvaluators?: () => EvaluatorSummary[];

  listModelConnectors?: (request: KibanaRequest) => Promise<ModelConnectorSummary[]>;
  onlineScoreService?: OnlineScoreService;
}

export type EvalsWorkflowsManagementSetup = Pick<WorkflowsServerPluginSetup, 'management'>;

export interface EvalsSetupDependencies {
  features: FeaturesPluginSetup;
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup;
  inference: InferenceServerSetup;
  workflowsExtensions?: WorkflowsExtensionsServerPluginSetup;
  workflowsManagement?: EvalsWorkflowsManagementSetup;
}

export interface EvalsStartDependencies {
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
  inference: InferenceServerStart;
  spaces?: SpacesPluginStart;
  security?: SecurityPluginStart;
  workflowsManagement?: EvalsWorkflowsManagementSetup;
}

export interface EvalsRouteHandlerContext {
  datasetService: DatasetService;
  evaluationScoreService: EvaluationScoreService;
  onlineScoreService: OnlineScoreService;
  evaluatorRegistry: EvaluatorRegistry;
}

export type EvalsRequestHandlerContext = CustomRequestHandlerContext<{
  evals: EvalsRouteHandlerContext;
}>;

export type EvalsRouter = IRouter<EvalsRequestHandlerContext>;

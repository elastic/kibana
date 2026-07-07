/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CustomRequestHandlerContext, IRouter } from '@kbn/core/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type { EncryptedSavedObjectsPluginSetup } from '@kbn/encrypted-saved-objects-plugin/server';
import type { EncryptedSavedObjectsPluginStart } from '@kbn/encrypted-saved-objects-plugin/server';
import type { InferenceServerSetup, InferenceServerStart } from '@kbn/inference-plugin/server';
import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { EvalsWorkflowsManagementSetup } from './workflows/workflows_management_types';
import type { DatasetService } from './storage/dataset_service';
import type { EvaluationScoreService } from './storage/evaluation_score_service';
import type { EvaluatorRegistry } from './evaluators/types';
import type { EvalsTaskProvider } from './task_providers/types';

export interface EvalsPluginSetup {
  /**
   * Registers a task provider so suites (or other plugins) can expose their real
   * "feature under evaluation" function to the workflow-based experiment engine.
   */
  registerTaskProvider: (provider: EvalsTaskProvider) => void;
}
export interface EvalsPluginStart {
  datasetService?: DatasetService;
  evaluationScoreService?: EvaluationScoreService;
}

export interface EvalsSetupDependencies {
  features: FeaturesPluginSetup;
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup;
  inference: InferenceServerSetup;
  /** Optional: workflow step registration. Absent when Workflows is disabled/unlicensed. */
  workflowsExtensions?: WorkflowsExtensionsServerPluginSetup;
  /** Optional: launching and tracking workflow executions from evals routes. */
  workflowsManagement?: EvalsWorkflowsManagementSetup;
}

export interface EvalsStartDependencies {
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
  inference: InferenceServerStart;
  /** Optional: resolves the active space id for experiment-execution routes. */
  spaces?: SpacesPluginStart;
  workflowsManagement?: EvalsWorkflowsManagementSetup;
}

export interface EvalsRouteHandlerContext {
  datasetService: DatasetService;
  evaluationScoreService: EvaluationScoreService;
  evaluatorRegistry: EvaluatorRegistry;
}

export type EvalsRequestHandlerContext = CustomRequestHandlerContext<{
  evals: EvalsRouteHandlerContext;
}>;

export type EvalsRouter = IRouter<EvalsRequestHandlerContext>;

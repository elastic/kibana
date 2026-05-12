/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { EncryptedSavedObjectsPluginStart } from '@kbn/encrypted-saved-objects-plugin/server';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { EvalsRouter } from '../types';
import type { EvaluatorRegistry } from '../lib/evaluation_engine';
import type { SkillMonitoringService } from '../lib/monitoring/skill_monitoring_service';
import type { SkillValidationService } from '../lib/aesop';
import { registerGetRunsRoute } from './runs/get_runs';
import { registerGetRunRoute } from './runs/get_run';
import { registerGetRunScoresRoute } from './runs/get_run_scores';
import { registerGetRunDatasetExamplesRoute } from './runs/get_run_dataset_examples';
import { registerCompareRunsRoute } from './runs/compare_runs';
import { registerGetExampleScoresRoute } from './examples/get_example_scores';
import { registerGetTraceRoute } from './traces/get_trace';
import { registerListDatasetsRoute } from './datasets/list_datasets';
import { registerCreateDatasetRoute } from './datasets/create_dataset';
import { registerGetDatasetRoute } from './datasets/get_dataset';
import { registerUpdateDatasetRoute } from './datasets/update_dataset';
import { registerDeleteDatasetRoute } from './datasets/delete_dataset';
import { registerAddExamplesRoute } from './datasets/add_examples';
import { registerUpdateExampleRoute } from './datasets/update_example';
import { registerDeleteExampleRoute } from './datasets/delete_example';
import { registerUpsertDatasetRoute } from './datasets/upsert_dataset';
import { registerVersionDatasetRoute } from './datasets/version_dataset';
import { registerGetDatasetVersionsRoute } from './datasets/get_dataset_versions';
import { registerGetDatasetStatsRoute } from './datasets/get_dataset_stats';
import { registerUpdateExampleSplitsRoute } from './datasets/update_example_splits';
import { registerImportExamplesRoute } from './datasets/import_examples';
import { registerEvaluationRoutes } from './evaluation';
import { registerEvaluatorRoutes } from './evaluators';
import { registerMonitoringRoutes } from './monitoring';
import { registerAesopRoutes } from './aesop';
import { registerSkillRoutes } from './skills';
import { registerSuiteRoutes } from './suites';
import { registerRemoteConfigsRoutes } from './remotes/register_routes';
import { registerGetTracingProjectsRoute } from './tracing/get_projects';
import { registerGetProjectTracesRoute } from './tracing/get_project_traces';

export interface RouteDependencies {
  router: EvalsRouter;
  logger: Logger;
  canEncrypt: boolean;
  getEncryptedSavedObjectsStart: () => Promise<EncryptedSavedObjectsPluginStart>;
  getInternalRemoteConfigsSoClient: () => Promise<SavedObjectsClientContract>;
}

interface AllRouteDependencies extends RouteDependencies {
  evaluatorRegistry: EvaluatorRegistry;
  monitoringService: SkillMonitoringService;
  // AESOP-scoped services; present only when `aesopEnabled` is true.
  skillValidationService?: SkillValidationService;
  skillOnlineEvalService?: import('../lib/aesop/skill_online_eval_service').SkillOnlineEvalService;
  suiteRunner?: import('../lib/suite_runner').SuiteRunner;
  repoRoot?: string;
  aesopEnabled: boolean;
}

export const registerRoutes = (dependencies: AllRouteDependencies) => {
  registerGetRunsRoute(dependencies);
  registerGetRunRoute(dependencies);
  registerGetRunScoresRoute(dependencies);
  registerGetRunDatasetExamplesRoute(dependencies);
  registerCompareRunsRoute(dependencies);
  registerGetExampleScoresRoute(dependencies);
  registerGetTraceRoute(dependencies);
  registerGetTracingProjectsRoute(dependencies);
  registerGetProjectTracesRoute(dependencies);
  registerListDatasetsRoute(dependencies);
  registerCreateDatasetRoute(dependencies);
  registerGetDatasetRoute(dependencies);
  registerUpdateDatasetRoute(dependencies);
  registerDeleteDatasetRoute(dependencies);
  registerAddExamplesRoute(dependencies);
  registerUpdateExampleRoute(dependencies);
  registerDeleteExampleRoute(dependencies);
  registerUpsertDatasetRoute(dependencies);
  registerVersionDatasetRoute(dependencies);
  registerGetDatasetVersionsRoute(dependencies);
  registerGetDatasetStatsRoute(dependencies);
  registerUpdateExampleSplitsRoute(dependencies);
  registerImportExamplesRoute(dependencies);

  registerEvaluationRoutes(dependencies);
  registerEvaluatorRoutes(dependencies);
  registerMonitoringRoutes(dependencies);
  if (dependencies.aesopEnabled) {
    registerAesopRoutes(dependencies);
  }
  registerSkillRoutes(dependencies);
  registerRemoteConfigsRoutes(dependencies);

  if (dependencies.repoRoot) {
    registerSuiteRoutes({
      router: dependencies.router,
      logger: dependencies.logger,
      suiteRunner: dependencies.suiteRunner,
      repoRoot: dependencies.repoRoot,
    });
  }
};

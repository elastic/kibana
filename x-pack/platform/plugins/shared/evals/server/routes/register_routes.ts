/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { EvalsRouter } from '../types';
import type { OnlineSuiteRegistry } from '../online_suites/registry';
import { registerGetRunsRoute } from './runs/get_runs';
import { registerGetRunRoute } from './runs/get_run';
import { registerGetRunScoresRoute } from './runs/get_run_scores';
import { registerGetRunDatasetExamplesRoute } from './runs/get_run_dataset_examples';
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
import { registerGetTracingProjectsRoute } from './tracing/get_projects';
import { registerGetProjectTracesRoute } from './tracing/get_project_traces';
import { registerGetOnlineSuitesRoute } from './online/get_suites';
import { registerRunOnlineSuiteRoute } from './online/post_run';
import { registerRunOnlineSuiteNowRoute } from './online/post_run_now';
import { registerCancelOnlineRunRoute } from './online/post_cancel_run';
import { registerGetOnlineRunRoute } from './online/get_workflow_execution';
import { registerGetOnlineRunLogsRoute } from './online/get_workflow_execution_logs';

export interface RouteDependencies {
  router: EvalsRouter;
  logger: Logger;
  onlineSuiteRegistry?: OnlineSuiteRegistry;
  workflowsManagement?: WorkflowsServerPluginSetup;
}

export const registerRoutes = (dependencies: RouteDependencies) => {
  registerGetRunsRoute(dependencies);
  registerGetRunRoute(dependencies);
  registerGetRunScoresRoute(dependencies);
  registerGetRunDatasetExamplesRoute(dependencies);
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

  registerGetOnlineSuitesRoute(dependencies);
  registerRunOnlineSuiteRoute(dependencies);
  registerRunOnlineSuiteNowRoute(dependencies);
  registerCancelOnlineRunRoute(dependencies);
  registerGetOnlineRunRoute(dependencies);
  registerGetOnlineRunLogsRoute(dependencies);
};

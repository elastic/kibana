/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import type { createActionService } from '../handlers/action/create_action_service';
import type { OsqueryAppContext } from '../lib/osquery_app_context_services';
import { getRunQueryStepDefinition } from './steps/run_query_step';
import { getRunPackStepDefinition } from './steps/run_pack_step';
import { getGetResultsStepDefinition } from './steps/get_results_step';
import { getGetSavedQueryStepDefinition } from './steps/get_saved_query_step';

export function registerOsqueryWorkflowExtensions(
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup,
  actionService: ReturnType<typeof createActionService>,
  osqueryContext: OsqueryAppContext
) {
  workflowsExtensions.registerStepDefinition(
    getRunQueryStepDefinition(actionService, osqueryContext)
  );
  workflowsExtensions.registerStepDefinition(
    getRunPackStepDefinition(actionService, osqueryContext)
  );
  workflowsExtensions.registerStepDefinition(getGetResultsStepDefinition(osqueryContext));
  workflowsExtensions.registerStepDefinition(
    getGetSavedQueryStepDefinition(actionService, osqueryContext)
  );
}

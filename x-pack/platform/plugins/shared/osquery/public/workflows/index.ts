/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsPublicPluginSetup } from '@kbn/workflows-extensions/public';

export function registerOsqueryWorkflowExtensions(
  workflowsExtensions: WorkflowsExtensionsPublicPluginSetup
) {
  workflowsExtensions.registerStepDefinition(() =>
    import('./steps/run_query_step').then((m) => m.runQueryStepPublicDefinition)
  );
  workflowsExtensions.registerStepDefinition(() =>
    import('./steps/run_pack_step').then((m) => m.runPackStepPublicDefinition)
  );
  workflowsExtensions.registerStepDefinition(() =>
    import('./steps/get_results_step').then((m) => m.getResultsStepPublicDefinition)
  );
  workflowsExtensions.registerStepDefinition(() =>
    import('./steps/get_saved_query_step').then((m) => m.getSavedQueryStepPublicDefinition)
  );
}

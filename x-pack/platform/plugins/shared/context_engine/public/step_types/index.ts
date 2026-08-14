/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsPublicPluginSetup } from '@kbn/workflows-extensions/public';

/** Registers the Context Engine KI workflow steps with the workflowsExtensions plugin. */
export const registerStepDefinitions = (
  workflowsExtensions: WorkflowsExtensionsPublicPluginSetup
): void => {
  workflowsExtensions.registerStepDefinition(() =>
    import('./create_ki').then((m) => m.createKiStepDefinition)
  );
  workflowsExtensions.registerStepDefinition(() =>
    import('./update_ki').then((m) => m.updateKiStepDefinition)
  );
  workflowsExtensions.registerStepDefinition(() =>
    import('./delete_ki').then((m) => m.deleteKiStepDefinition)
  );
};

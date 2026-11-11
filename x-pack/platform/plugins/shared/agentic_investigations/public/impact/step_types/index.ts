/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsPublicPluginSetup } from '@kbn/workflows-extensions/public';

/** Loaders keep the YAML-editor schemas out of the page-load bundle. */
export const registerImpactPublicStepDefinitions = (
  workflowsExtensions: WorkflowsExtensionsPublicPluginSetup
) => {
  workflowsExtensions.registerStepDefinition(() =>
    import('./attach_impact_step').then((m) => m.attachImpactPublicStepDefinition)
  );

  workflowsExtensions.registerStepDefinition(() =>
    import('./get_impact_step').then((m) => m.getImpactPublicStepDefinition)
  );
};

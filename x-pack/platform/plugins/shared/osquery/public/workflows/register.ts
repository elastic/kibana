/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import type { WorkflowsExtensionsPublicPluginSetup } from '@kbn/workflows-extensions/public';
import type { ExperimentalFeatures } from '../../common/experimental_features';

/**
 * Registers the osquery step editor definition only when the flag is on and the optional
 * `workflowsExtensions` plugin is present. Returns whether anything was registered.
 */
export const registerOsqueryWorkflowSteps = ({
  experimentalFeatures,
  workflowsExtensions,
  http,
}: {
  experimentalFeatures: Pick<ExperimentalFeatures, 'workflowsExtensionsEnabled'>;
  workflowsExtensions?: WorkflowsExtensionsPublicPluginSetup;
  /** Used by the editor pickers: base path, space prefix and version header come for free. */
  http: HttpSetup;
}): boolean => {
  if (!experimentalFeatures.workflowsExtensionsEnabled || !workflowsExtensions) {
    return false;
  }

  workflowsExtensions.registerStepDefinition(() =>
    import('./run_query_step').then((m) => m.createRunQueryStepDefinition(http))
  );

  return true;
};

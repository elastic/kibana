/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import type { ExperimentalFeatures } from '../../common/experimental_features';
import { runQueryStepDefinition } from './step_types/run_query/run_query_step';

/**
 * Registers the osquery step only when the flag is on and the optional `workflowsExtensions`
 * plugin is present. Returns whether anything was registered.
 */
export const registerOsqueryWorkflowSteps = ({
  experimentalFeatures,
  workflowsExtensions,
}: {
  experimentalFeatures: Pick<ExperimentalFeatures, 'workflowsExtensionsEnabled'>;
  workflowsExtensions?: WorkflowsExtensionsServerPluginSetup;
}): boolean => {
  if (!experimentalFeatures.workflowsExtensionsEnabled || !workflowsExtensions) {
    return false;
  }

  workflowsExtensions.registerStepDefinition(runQueryStepDefinition);

  return true;
};

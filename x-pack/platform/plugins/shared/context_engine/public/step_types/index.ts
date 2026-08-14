/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsPublicPluginSetup } from '@kbn/workflows-extensions/public';

/**
 * Registers the Context Engine KI workflow steps with the workflowsExtensions
 * plugin. The steps register only when the Context Engine advanced setting is
 * on; enabling it later requires a page reload.
 */
export const registerStepDefinitions = ({
  workflowsExtensions,
  isContextEngineEnabled,
}: {
  workflowsExtensions: WorkflowsExtensionsPublicPluginSetup;
  isContextEngineEnabled: () => Promise<boolean>;
}): void => {
  workflowsExtensions.registerStepDefinition(async () => {
    if (!(await isContextEngineEnabled())) {
      return undefined;
    }
    const { createKiStepDefinition } = await import('./create_ki');
    return createKiStepDefinition;
  });
  workflowsExtensions.registerStepDefinition(async () => {
    if (!(await isContextEngineEnabled())) {
      return undefined;
    }
    const { updateKiStepDefinition } = await import('./update_ki');
    return updateKiStepDefinition;
  });
  workflowsExtensions.registerStepDefinition(async () => {
    if (!(await isContextEngineEnabled())) {
      return undefined;
    }
    const { deleteKiStepDefinition } = await import('./delete_ki');
    return deleteKiStepDefinition;
  });
};

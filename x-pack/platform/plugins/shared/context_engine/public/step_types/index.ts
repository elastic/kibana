/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import { CONTEXT_ENGINE_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';
import type { WorkflowsExtensionsPublicPluginSetup } from '@kbn/workflows-extensions/public';

export function registerWorkflowSteps({
  workflowsExtensions,
  getCoreStart,
}: {
  workflowsExtensions: WorkflowsExtensionsPublicPluginSetup;
  getCoreStart: () => Promise<CoreStart>;
}): void {
  workflowsExtensions.registerStepDefinition(async () => {
    const coreStart = await getCoreStart();
    if (!coreStart.uiSettings.get<boolean>(CONTEXT_ENGINE_ENABLED_SETTING_ID, false)) {
      return undefined;
    }
    return import('./verify_ki_step').then((m) => m.verifyKiStepDefinition);
  });
}

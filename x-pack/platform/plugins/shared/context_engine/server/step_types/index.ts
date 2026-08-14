/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import type { KiStepDependencies } from './helpers';
import { getCreateKiStepDefinition } from './create_ki';
import { getUpdateKiStepDefinition } from './update_ki';
import { getDeleteKiStepDefinition } from './delete_ki';

/**
 * Registers the Context Engine KI workflow steps with the workflowsExtensions
 * plugin. The steps register only when the Context Engine advanced setting is
 * on at startup; enabling it later requires a restart (mirroring the managed
 * AI index registration). Handlers also re-check the setting at run time.
 */
export const registerStepDefinitions = ({
  workflowsExtensions,
  ...deps
}: KiStepDependencies & {
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup;
}): void => {
  workflowsExtensions.registerStepDefinition(async () =>
    (await deps.isContextEngineEnabled()) ? getCreateKiStepDefinition(deps) : undefined
  );
  workflowsExtensions.registerStepDefinition(async () =>
    (await deps.isContextEngineEnabled()) ? getUpdateKiStepDefinition(deps) : undefined
  );
  workflowsExtensions.registerStepDefinition(async () =>
    (await deps.isContextEngineEnabled()) ? getDeleteKiStepDefinition(deps) : undefined
  );
};

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
 * plugin. Registration is global; the Context Engine advanced setting is
 * space-scoped, so each handler enforces it per request (mirroring the HTTP
 * routes) and the public registration gates editor visibility per space.
 */
export const registerStepDefinitions = ({
  workflowsExtensions,
  ...deps
}: KiStepDependencies & {
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup;
}): void => {
  workflowsExtensions.registerStepDefinition(getCreateKiStepDefinition(deps));
  workflowsExtensions.registerStepDefinition(getUpdateKiStepDefinition(deps));
  workflowsExtensions.registerStepDefinition(getDeleteKiStepDefinition(deps));
};

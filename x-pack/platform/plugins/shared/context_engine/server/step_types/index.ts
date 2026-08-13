/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import type { VerifyKiStepDeps } from './verify_ki';
import { getVerifyKiStepDefinition } from './verify_ki';

export const registerStepDefinitions = (
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup,
  deps: VerifyKiStepDeps
): void => {
  workflowsExtensions.registerStepDefinition(getVerifyKiStepDefinition(deps));
};

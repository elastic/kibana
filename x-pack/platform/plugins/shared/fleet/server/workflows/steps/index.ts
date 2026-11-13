/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';

import { awsOnboardingCredentialsStepDefinition } from './credentials';
import { awsOnboardingDiscoverStepDefinition } from './discover';
import { awsOnboardingResolveStepDefinition } from './resolve';

/**
 * Registered unconditionally: each handler checks the `fleet.agenticAwsOnboarding` flag when it
 * runs, because feature flags can change after setup.
 */
export const registerAwsOnboardingSteps = (setup: WorkflowsExtensionsServerPluginSetup): void => {
  setup.registerStepDefinition(awsOnboardingCredentialsStepDefinition);
  setup.registerStepDefinition(awsOnboardingDiscoverStepDefinition);
  setup.registerStepDefinition(awsOnboardingResolveStepDefinition);
};

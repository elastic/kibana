/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';

import { awsOnboardingCloudContextStepDefinition } from './cloud_context';
import { awsOnboardingCreateConnectorStepDefinition } from './create_connector';
import { awsOnboardingCreatePoliciesStepDefinition } from './create_policies';
import { awsOnboardingCreateStackStepDefinition } from './create_stack';
import { awsOnboardingCredentialsStepDefinition } from './credentials';
import { awsOnboardingDiscoverStepDefinition } from './discover';
import { awsOnboardingHasDataStepDefinition } from './has_data';
import { awsOnboardingListIdentitiesStepDefinition } from './list_identities';
import { awsOnboardingResolveStepDefinition } from './resolve';
import { awsOnboardingSettingsRequirementStepDefinition } from './settings_requirement';
import { awsOnboardingStackStatusStepDefinition } from './stack_status';

/**
 * Registered unconditionally: each handler checks the `fleet.agenticAwsOnboarding` flag when it
 * runs, because feature flags can change after setup.
 */
export const registerAwsOnboardingSteps = (setup: WorkflowsExtensionsServerPluginSetup): void => {
  setup.registerStepDefinition(awsOnboardingCredentialsStepDefinition);
  setup.registerStepDefinition(awsOnboardingDiscoverStepDefinition);
  setup.registerStepDefinition(awsOnboardingListIdentitiesStepDefinition);
  setup.registerStepDefinition(awsOnboardingSettingsRequirementStepDefinition);
  setup.registerStepDefinition(awsOnboardingResolveStepDefinition);
  setup.registerStepDefinition(awsOnboardingCloudContextStepDefinition);
  setup.registerStepDefinition(awsOnboardingCreateStackStepDefinition);
  setup.registerStepDefinition(awsOnboardingStackStatusStepDefinition);
  setup.registerStepDefinition(awsOnboardingCreateConnectorStepDefinition);
  setup.registerStepDefinition(awsOnboardingCreatePoliciesStepDefinition);
  setup.registerStepDefinition(awsOnboardingHasDataStepDefinition);
};

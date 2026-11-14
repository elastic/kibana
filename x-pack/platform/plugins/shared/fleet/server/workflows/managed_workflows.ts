/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FLEET_AWS_AGENTLESS_ONBOARDING_WORKFLOW_ID } from '@kbn/workflows/managed';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import type {
  WorkflowsExtensionsServerPluginSetup,
  WorkflowsExtensionsServerPluginStart,
} from '@kbn/workflows-extensions/server';

import { appContextService } from '../services';

export const FLEET_MANAGED_WORKFLOW_OWNER = 'fleet';

export const registerAwsOnboardingWorkflowOwner = (
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup
): void => {
  workflowsExtensions.registerManagedWorkflowOwner(FLEET_MANAGED_WORKFLOW_OWNER);
};

/**
 * Installs the AWS onboarding workflow in the global space. The install does not depend on the
 * feature flag, which can be switched on at runtime after Fleet starts: every step and agent tool
 * checks the flag when it runs, so the installed workflow stays inert while the flag is off.
 * `ready()` is always called, and failures are logged so they never fail Fleet start.
 */
export const installAwsOnboardingWorkflow = async (
  workflowsExtensions: WorkflowsExtensionsServerPluginStart
): Promise<void> => {
  const logger = appContextService.getLogger();
  try {
    const managedWorkflowsClient = await workflowsExtensions.initManagedWorkflowsClient(
      FLEET_MANAGED_WORKFLOW_OWNER
    );

    try {
      await managedWorkflowsClient.installMany([
        { id: FLEET_AWS_AGENTLESS_ONBOARDING_WORKFLOW_ID, spaceId: GLOBAL_WORKFLOW_SPACE_ID },
      ]);
    } finally {
      await managedWorkflowsClient.ready();
    }
  } catch (error) {
    logger.error(`Failed to install the AWS onboarding workflow: ${error.message}`);
  }
};

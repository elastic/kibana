/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { FLEET_PACKAGE_WORKFLOW } from '@kbn/workflows/managed';
import type { WorkflowsServerPluginStart } from '@kbn/workflows-management-plugin/server';
import type {
  WorkflowsExtensionsServerPluginSetup,
  WorkflowsExtensionsServerPluginStart,
} from '@kbn/workflows-extensions/server';

import type { ManagedWorkflowsClient } from '../../../app_context';

export const registerWorkflowAssetsOwner = ({
  workflowsExtensions,
}: {
  workflowsExtensions?: WorkflowsExtensionsServerPluginSetup;
}) => {
  workflowsExtensions?.registerManagedWorkflowOwner(FLEET_PACKAGE_WORKFLOW.pluginId);
};

/**
 * Initializes the managed workflows client. Resolves once the client is ready, or to `undefined`
 * if it is unavailable or failed.
 * Without the workflows management plugin the extensions plugin only provides a noop client whose
 * calls fail, so no client is created.
 * The client is kept even when Workflows is currently not available (license or
 * `workflowsManagement.available`): `isWorkflowsAvailable` follows license changes, so callers
 * check it on every use (see `appContextService.getManagedWorkflowsClient`).
 */
export const startManagedWorkflowsClient = async ({
  workflowsExtensions,
  workflowsManagement,
  logger,
}: {
  workflowsExtensions?: WorkflowsExtensionsServerPluginStart;
  workflowsManagement?: WorkflowsServerPluginStart;
  logger?: Logger;
}): Promise<ManagedWorkflowsClient | undefined> => {
  if (!workflowsManagement) return undefined;
  try {
    const client = await workflowsExtensions?.initManagedWorkflowsClient(
      FLEET_PACKAGE_WORKFLOW.pluginId
    );
    if (!client) return undefined;
    await client.ready();
    return client;
  } catch (error) {
    logger?.warn(`Failed to initialize the managed workflows client: ${error.message}`);
    return undefined;
  }
};

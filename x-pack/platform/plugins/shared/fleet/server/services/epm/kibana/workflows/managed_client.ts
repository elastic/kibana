/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { FLEET_PACKAGE_WORKFLOW } from '@kbn/workflows/managed';
import type {
  WorkflowsExtensionsServerPluginSetup,
  WorkflowsExtensionsServerPluginStart,
} from '@kbn/workflows-extensions/server';

import type { ManagedWorkflowsClient } from '../../../app_context';

export const registerWorkflowAssetsOwner = ({
  enabled,
  workflowsExtensions,
}: {
  enabled: boolean;
  workflowsExtensions?: WorkflowsExtensionsServerPluginSetup;
}) => {
  if (!enabled) return;
  workflowsExtensions?.registerManagedWorkflowOwner(FLEET_PACKAGE_WORKFLOW.pluginId);
};

/**
 * Initializes the managed workflows client and hands it over through `setClient` as soon as it is
 * created. Resolves once the client is ready, or to `undefined` if it is unavailable or failed.
 */
export const startManagedWorkflowsClient = async ({
  workflowsExtensions,
  setClient,
  logger,
}: {
  workflowsExtensions?: WorkflowsExtensionsServerPluginStart;
  setClient: (client: ManagedWorkflowsClient) => void;
  logger?: Logger;
}): Promise<ManagedWorkflowsClient | undefined> => {
  try {
    const client = await workflowsExtensions?.initManagedWorkflowsClient(
      FLEET_PACKAGE_WORKFLOW.pluginId
    );
    if (!client) return undefined;
    setClient(client);
    await client.ready();
    return client;
  } catch (error) {
    logger?.error(`Failed to initialize the managed workflows client: ${error.message}`);
    return undefined;
  }
};

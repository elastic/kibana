/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type {
  WorkflowsExtensionsServerPluginSetup,
  WorkflowsExtensionsServerPluginStart,
} from '@kbn/workflows-extensions/server';
import { ENTITY_GRAPH_TRAVERSAL_WORKFLOW_ID } from '@kbn/workflows/managed';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import { PLUGIN_ID } from '../../common/plugin_id';

export const registerManagedWorkflowOwner = (
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup
): void => {
  workflowsExtensions.registerManagedWorkflowOwner(PLUGIN_ID);
};

/**
 * Install the entity store's managed workflows once, in the global space, and mark the owner
 * ready so reconciliation can run. The graph traversal workflow is manual-only: it has no
 * schedule and runs only with a scenario id and a seed id.
 */
export const installManagedWorkflows = async (
  workflowsExtensions: WorkflowsExtensionsServerPluginStart,
  logger: Logger
): Promise<void> => {
  let client: Awaited<
    ReturnType<WorkflowsExtensionsServerPluginStart['initManagedWorkflowsClient']>
  >;
  try {
    client = await workflowsExtensions.initManagedWorkflowsClient(PLUGIN_ID);
  } catch (error) {
    logger.warn(`Failed to initialize the ${PLUGIN_ID} managed-workflows client`, { error });
    return;
  }
  try {
    await client.install(ENTITY_GRAPH_TRAVERSAL_WORKFLOW_ID, { spaceId: GLOBAL_WORKFLOW_SPACE_ID });
  } catch (error) {
    logger.warn('Failed to install the entity graph traversal workflow', { error });
  }
  try {
    await client.ready();
  } catch (error) {
    logger.warn(`Failed to mark ${PLUGIN_ID} managed workflows ready`, { error });
  }
};

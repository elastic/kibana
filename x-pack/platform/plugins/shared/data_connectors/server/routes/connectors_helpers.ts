/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/agent-builder-common';
import type { SavedObject } from '@kbn/core-saved-objects-common/src/server_types';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { ActionResult } from '@kbn/actions-plugin/server';
import type { Logger } from '@kbn/logging';
import type { DataTypeDefinition } from '@kbn/data-sources-registry-plugin/server';
import { DEFAULT_NAMESPACE_STRING } from '@kbn/core-saved-objects-utils-server';
import type {
  DataConnectorsServerSetupDependencies,
  DataConnectorsServerStartDependencies,
} from '../types';
import { DATA_CONNECTOR_SAVED_OBJECT_TYPE, type DataConnectorAttributes } from '../saved_objects';
import { createStackConnector } from '../utils/create_stack_connector';

interface CreateConnectorAndResourcesParams {
  name: string;
  type: string;
  credentials: string;
  savedObjectsClient: SavedObjectsClientContract;
  request: KibanaRequest;
  logger: Logger;
  workflowManagement: DataConnectorsServerSetupDependencies['workflowsManagement'];
  actions: DataConnectorsServerStartDependencies['actions'];
  dataConnectorTypeDef: DataTypeDefinition;
  agentBuilder: DataConnectorsServerStartDependencies['agentBuilder'];
}

/**
 * Creates data connector Saved Object, as well as all related resources (stack connectors, tools, workflows)
 */
export async function createConnectorAndRelatedResources(
  params: CreateConnectorAndResourcesParams
): Promise<string> {
  const {
    name,
    type,
    credentials,
    savedObjectsClient,
    request,
    logger,
    workflowManagement,
    actions,
    dataConnectorTypeDef,
    agentBuilder,
  } = params;

  const workflowIds: string[] = [];
  const toolIds: string[] = [];
  const toolRegistry = await agentBuilder.tools.getRegistry({ request });
  const stackConnectorConfig = dataConnectorTypeDef.stackConnector;
  const stackConnector: ActionResult = await createStackConnector(
    toolRegistry,
    actions,
    request,
    stackConnectorConfig,
    name,
    toolIds,
    credentials,
    logger
  );

  logger.info(`Imported tools in createConnectorAndRelatedResources: ${JSON.stringify(toolIds)}`);

  // Create workflows and tools
  const spaceId = getSpaceId(savedObjectsClient);
  const workflowInfos = dataConnectorTypeDef.generateWorkflows(stackConnector.id);

  logger.info(`Creating workflows and tools for data connector '${name}'`);

  for (const workflowInfo of workflowInfos) {
    const workflow = await workflowManagement.management.createWorkflow(
      { yaml: workflowInfo.content },
      spaceId,
      request
    );
    logger.debug(`Created workflow '${workflow.name}' with id '${workflow.id}'`);
    workflowIds.push(workflow.id);

    if (workflowInfo.shouldGenerateABTool) {
      const tool = await toolRegistry.create({
        id: `${type}-${workflow.id}`,
        type: ToolType.workflow,
        description: `Workflow tool for ${type} data connector`,
        tags: ['data-connector', type],
        configuration: {
          workflow_id: workflow.id,
        },
      });
      toolIds.push(tool.id);
      logger.debug(`Created tool for workflow '${workflow.name}' with id '${tool.id}'`);
    }
  }

  // Create the data connector saved object
  const now = new Date().toISOString();
  logger.info(`Creating ${DATA_CONNECTOR_SAVED_OBJECT_TYPE} SO at ${now}`);
  const savedObject = await savedObjectsClient.create(DATA_CONNECTOR_SAVED_OBJECT_TYPE, {
    name,
    type,
    createdAt: now,
    updatedAt: now,
    workflowIds,
    toolIds,
    kscIds: [stackConnector.id],
  });

  return savedObject.id;
}

interface DeleteRelatedResourcesParams {
  kscIds: string[];
  toolIds: string[];
  workflowIds: string[];
  spaceId: string;
  request: KibanaRequest;
  logger: Logger;
  workflowManagement: DataConnectorsServerSetupDependencies['workflowsManagement'];
  actionsClient: Awaited<
    ReturnType<DataConnectorsServerStartDependencies['actions']['getActionsClientWithRequest']>
  >;
  toolRegistry: Awaited<
    ReturnType<DataConnectorsServerStartDependencies['agentBuilder']['tools']['getRegistry']>
  >;
}

interface DeleteRelatedResourcesResult {
  deletedKscIds: string[];
  deletedToolIds: string[];
  deletedWorkflowIds: string[];
  failedKscIds: string[];
  failedToolIds: string[];
  failedWorkflowIds: string[];
  allSucceeded: boolean;
}

async function deleteSingleResource<T>(
  deleteFunc: () => Promise<T>,
  resourceId: string,
  resourceType: string,
  logger: Logger
): Promise<{ success: boolean; id: string }> {
  try {
    await deleteFunc();
    return { success: true, id: resourceId };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    const notFoundErrorMsgs: string[] = ['404', 'not found', 'does not exist'];
    const isNotFoundError = notFoundErrorMsgs.some((msg) => errorMessage.includes(msg));

    if (isNotFoundError) {
      logger.debug(
        `${resourceType} ${resourceId} already deleted or does not exist, treating as success`
      );
      return { success: true, id: resourceId };
    }

    logger.warn(`Failed to delete ${resourceType} ${resourceId}: ${errorMessage}`);
    return { success: false, id: resourceId };
  }
}

/**
 * Deletes all related resources for a data connector (stack connectors, tools, workflows)
 * This function is idempotent and handles partial failures gracefully
 */
async function deleteRelatedResources(
  params: DeleteRelatedResourcesParams
): Promise<DeleteRelatedResourcesResult> {
  const {
    kscIds,
    toolIds,
    workflowIds,
    spaceId,
    request,
    logger,
    workflowManagement,
    actionsClient,
    toolRegistry,
  } = params;

  const result: DeleteRelatedResourcesResult = {
    deletedKscIds: [],
    deletedToolIds: [],
    deletedWorkflowIds: [],
    failedKscIds: [],
    failedToolIds: [],
    failedWorkflowIds: [],
    allSucceeded: true,
  };

  // Delete stack connectors (idempotent)
  if (kscIds.length > 0) {
    logger.info(`Attempting to delete ${kscIds.length} stack connector(s)`);
    const kscResults = await Promise.all(
      kscIds.map((kscId) =>
        deleteSingleResource(
          () => actionsClient.delete({ id: kscId }),
          kscId,
          'stack connector',
          logger
        )
      )
    );

    kscResults.forEach((res) => {
      if (res.success) {
        result.deletedKscIds.push(res.id);
      } else {
        result.failedKscIds.push(res.id);
        result.allSucceeded = false;
      }
    });

    if (result.deletedKscIds.length > 0) {
      logger.info(`Deleted ${result.deletedKscIds.length} stack connector(s)`);
    }
    if (result.failedKscIds.length > 0) {
      logger.warn(
        `Failed to delete ${
          result.failedKscIds.length
        } stack connector(s): ${result.failedKscIds.join(', ')}`
      );
    }
  }

  // Delete tools (idempotent)
  if (toolIds.length > 0) {
    logger.info(`Attempting to delete ${toolIds.length} tool(s)`);
    const toolResults = await Promise.all(
      toolIds.map((toolId) =>
        deleteSingleResource(() => toolRegistry.delete(toolId), toolId, 'tool', logger)
      )
    );

    toolResults.forEach((res) => {
      if (res.success) {
        result.deletedToolIds.push(res.id);
      } else {
        result.failedToolIds.push(res.id);
        result.allSucceeded = false;
      }
    });

    if (result.deletedToolIds.length > 0) {
      logger.info(`Deleted ${result.deletedToolIds.length} tool(s)`);
    }
    if (result.failedToolIds.length > 0) {
      logger.warn(
        `Failed to delete ${result.failedToolIds.length} tool(s): ${result.failedToolIds.join(
          ', '
        )}`
      );
    }
  }

  // Delete workflows (idempotent)
  if (workflowIds.length > 0) {
    logger.info(`Attempting to delete ${workflowIds.length} workflow(s)`);

    // Delete all workflows at once - the API now handles partial failures gracefully
    const deleteResult = await workflowManagement.management.deleteWorkflows(
      workflowIds,
      spaceId,
      request
    );

    logger.info(`Deleted ${deleteResult.deleted}/${deleteResult.total} workflow(s)`);

    if (deleteResult.failures.length > 0) {
      const failedIds = deleteResult.failures.map((f) => f.id);
      result.failedWorkflowIds.push(...failedIds);
      result.allSucceeded = false;
      logger.warn(`Failed to delete ${failedIds.length} workflow(s): ${failedIds.join(', ')}`);
    }
  }

  return result;
}

interface DeleteConnectorAndRelatedResourcesParams {
  connector: SavedObject<DataConnectorAttributes>;
  savedObjectsClient: SavedObjectsClientContract;
  actionsClient: Awaited<
    ReturnType<DataConnectorsServerStartDependencies['actions']['getActionsClientWithRequest']>
  >;
  toolRegistry: Awaited<
    ReturnType<DataConnectorsServerStartDependencies['agentBuilder']['tools']['getRegistry']>
  >;
  workflowManagement: DataConnectorsServerSetupDependencies['workflowsManagement'];
  request: KibanaRequest;
  logger: Logger;
}

interface DeleteConnectorAndRelatedResourcesResult {
  success: boolean;
  fullyDeleted: boolean;
  remaining?: {
    kscIds: string[];
    toolIds: string[];
    workflowIds: string[];
  };
}

/**
 * Deletes a data connector and all its related resources (stack connectors, tools, workflows)
 * This function is idempotent and handles partial failures by updating the saved object with remaining resources
 */
export async function deleteConnectorAndRelatedResources(
  params: DeleteConnectorAndRelatedResourcesParams
): Promise<DeleteConnectorAndRelatedResourcesResult> {
  const {
    connector,
    savedObjectsClient,
    actionsClient,
    toolRegistry,
    workflowManagement,
    request,
    logger,
  } = params;

  const { kscIds, toolIds, workflowIds } = connector.attributes;
  const spaceId = getSpaceId(savedObjectsClient);

  // Delete all related resources
  const deletionResult = await deleteRelatedResources({
    kscIds,
    toolIds,
    workflowIds,
    spaceId,
    request,
    logger,
    workflowManagement,
    actionsClient,
    toolRegistry,
  });

  // Check if all deletions succeeded
  if (deletionResult.allSucceeded) {
    // All resources deleted successfully - delete the saved object
    await savedObjectsClient.delete(DATA_CONNECTOR_SAVED_OBJECT_TYPE, connector.id);
    logger.info(`Fully deleted data connector ${connector.id}`);

    return {
      success: true,
      fullyDeleted: true,
    };
  } else {
    // Some resources failed to delete - update SO with remaining (failed) resources
    const remainingResources = {
      kscIds: deletionResult.failedKscIds,
      toolIds: deletionResult.failedToolIds,
      workflowIds: deletionResult.failedWorkflowIds,
      updatedAt: new Date().toISOString(),
    };

    await savedObjectsClient.update(
      DATA_CONNECTOR_SAVED_OBJECT_TYPE,
      connector.id,
      remainingResources
    );

    logger.warn(
      `Partially deleted data connector ${connector.id}. Remaining resources: ${deletionResult.failedKscIds.length} KSCs, ${deletionResult.failedToolIds.length} tools, ${deletionResult.failedWorkflowIds.length} workflows`
    );

    return {
      success: true,
      fullyDeleted: false,
      remaining: {
        kscIds: deletionResult.failedKscIds,
        toolIds: deletionResult.failedToolIds,
        workflowIds: deletionResult.failedWorkflowIds,
      },
    };
  }
}

function getSpaceId(savedObjectsClient: SavedObjectsClientContract): string {
  return savedObjectsClient.getCurrentNamespace() ?? DEFAULT_NAMESPACE_STRING;
}

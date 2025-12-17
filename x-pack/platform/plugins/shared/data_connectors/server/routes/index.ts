/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IRouter,
  KibanaRequest,
  KibanaResponseFactory,
  Logger,
  SavedObject,
  SavedObjectsClientContract,
  SavedObjectsFindResponse,
  StartServicesAccessor,
} from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { connectorsSpecs } from '@kbn/connector-specs';
import { DEFAULT_NAMESPACE_STRING } from '@kbn/core-saved-objects-utils-server';
import { ToolType } from '@kbn/onechat-common';
import type { DataConnectorAttributes } from '../saved_objects';
import { DATA_CONNECTOR_SAVED_OBJECT_TYPE } from '../saved_objects';
import type {
  DataConnectorsServerSetupDependencies,
  DataConnectorsServerStartDependencies,
} from '../types';
import { convertSOtoAPIResponse, createDataConnectorRequestSchema } from './schema';

// Constants
const DEFAULT_PAGE_SIZE = 100;
const MAX_PAGE_SIZE = 1000;

/**
 * Builds the secrets object for a connector based on its spec
 * @param connectorType - The connector type ID (e.g., '.notion')
 * @param token - The authentication token
 * @returns The secrets object to pass to the actions client
 * @throws Error if the connector spec is not found
 * @internal exported for testing
 */
export function buildSecretsFromConnectorSpec(
  connectorType: string,
  token: string
): Record<string, string> {
  const connectorSpec = Object.values(connectorsSpecs).find(
    (spec) => spec.metadata.id === connectorType
  );
  if (!connectorSpec) {
    throw new Error(`Stack connector spec not found for type "${connectorType}"`);
  }

  const hasBearerAuth = connectorSpec.auth?.types.some((authType) => {
    const typeId = typeof authType === 'string' ? authType : authType.type;
    return typeId === 'bearer';
  });

  const secrets: Record<string, string> = {};
  if (hasBearerAuth) {
    secrets.authType = 'bearer';
    secrets.token = token;
  } else {
    const apiKeyHeaderAuth = connectorSpec.auth?.types.find((authType) => {
      const typeId = typeof authType === 'string' ? authType : authType.type;
      return typeId === 'api_key_header';
    });

    const headerField =
      typeof apiKeyHeaderAuth !== 'string' && apiKeyHeaderAuth?.defaults?.headerField
        ? String(apiKeyHeaderAuth.defaults.headerField)
        : 'ApiKey'; // default fallback

    secrets.authType = 'api_key_header';
    secrets.apiKey = token;
    secrets.headerField = headerField;
  }

  return secrets;
}

interface CreateWorkflowsAndToolsParams {
  workflowInfos: Array<{ content: string; shouldGenerateABTool: boolean }>;
  stackConnectorId: string;
  type: string;
  spaceId: string;
  request: KibanaRequest;
  logger: Logger;
  workflowManagement: DataConnectorsServerSetupDependencies['workflowsManagement'];
  onechatTools: DataConnectorsServerStartDependencies['onechat']['tools'];
}

interface CreateWorkflowsAndToolsResult {
  workflowIds: string[];
  toolIds: string[];
}

/**
 * Creates workflows and associated tools for a data connector
 */
async function createWorkflowsAndTools(
  params: CreateWorkflowsAndToolsParams
): Promise<CreateWorkflowsAndToolsResult> {
  const { workflowInfos, type, spaceId, request, logger, workflowManagement, onechatTools } =
    params;

  const workflowIds: string[] = [];
  const toolIds: string[] = [];

  for (const workflowInfo of workflowInfos) {
    const workflow = await workflowManagement.management.createWorkflow(
      { yaml: workflowInfo.content },
      spaceId,
      request
    );
    workflowIds.push(workflow.id);

    if (workflowInfo.shouldGenerateABTool) {
      const toolRegistry = await onechatTools.getRegistry({ request });
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
      logger.info(`Created tool for workflow '${workflow.name}'`);
    }
  }

  return { workflowIds, toolIds };
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
    ReturnType<DataConnectorsServerStartDependencies['onechat']['tools']['getRegistry']>
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

/**
 * Deletes a single resource and handles errors gracefully
 */
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
    // Delete workflows individually for better error handling
    const workflowResults = await Promise.all(
      workflowIds.map((workflowId) =>
        deleteSingleResource(
          () => workflowManagement.management.deleteWorkflows([workflowId], spaceId, request),
          workflowId,
          'workflow',
          logger
        )
      )
    );

    workflowResults.forEach((res) => {
      if (res.success) {
        result.deletedWorkflowIds.push(res.id);
      } else {
        result.failedWorkflowIds.push(res.id);
        result.allSucceeded = false;
      }
    });

    if (result.deletedWorkflowIds.length > 0) {
      logger.info(`Deleted ${result.deletedWorkflowIds.length} workflow(s)`);
    }
    if (result.failedWorkflowIds.length > 0) {
      logger.warn(
        `Failed to delete ${
          result.failedWorkflowIds.length
        } workflow(s): ${result.failedWorkflowIds.join(', ')}`
      );
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
    ReturnType<DataConnectorsServerStartDependencies['onechat']['tools']['getRegistry']>
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
async function deleteConnectorAndRelatedResources(
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

/**
 * Gets the current space ID from the saved objects client
 */
function getSpaceId(savedObjectsClient: SavedObjectsClientContract): string {
  return savedObjectsClient.getCurrentNamespace() ?? DEFAULT_NAMESPACE_STRING;
}

/**
 * Creates a standardized error response
 */
function createErrorResponse(
  response: KibanaResponseFactory,
  message: string,
  error: Error,
  statusCode: number = 500
) {
  return response.customError({
    statusCode,
    body: {
      message: `${message}: ${error.message}`,
    },
  });
}

/**
 * Dependencies required for registering data connector routes
 */
export interface RouteDependencies {
  router: IRouter;
  logger: Logger;
  getStartServices: StartServicesAccessor<DataConnectorsServerStartDependencies>;
  workflowManagement: DataConnectorsServerSetupDependencies['workflowsManagement'];
}

/**
 * Registers all data connector routes
 */
export function registerRoutes(dependencies: RouteDependencies) {
  const { router, logger, getStartServices, workflowManagement } = dependencies;
  // List all data connectors
  router.get(
    {
      path: '/api/data_connectors',
      validate: false,
      security: {
        authz: {
          enabled: false,
          reason: 'This route is opted out from authorization',
        },
      },
    },
    async (context, _request, response) => {
      const coreContext = await context.core;

      try {
        const savedObjectsClient = coreContext.savedObjects.client;
        const findResult: SavedObjectsFindResponse<DataConnectorAttributes> =
          await savedObjectsClient.find({
            type: DATA_CONNECTOR_SAVED_OBJECT_TYPE,
            perPage: DEFAULT_PAGE_SIZE,
          });

        const connectors = findResult.saved_objects.map((savedObject) => {
          return convertSOtoAPIResponse(savedObject);
        });

        return response.ok({
          body: {
            connectors,
            total: findResult.total,
          },
        });
      } catch (error) {
        logger.error(`Failed to list all data connectors: ${(error as Error).message}`);
        return createErrorResponse(response, 'Failed to list connectors', error as Error);
      }
    }
  );

  // Get one data connector by ID
  router.get(
    {
      path: '/api/data_connectors/{id}',
      validate: { params: schema.object({ id: schema.string() }) },
      security: {
        authz: {
          enabled: false,
          reason: 'This route is opted out from authorization',
        },
      },
    },
    async (context, request, response) => {
      const coreContext = await context.core;

      try {
        const savedObjectsClient = coreContext.savedObjects.client;
        const savedObject: SavedObject<DataConnectorAttributes> = await savedObjectsClient.get(
          DATA_CONNECTOR_SAVED_OBJECT_TYPE,
          request.params.id
        );

        return response.ok({
          body: convertSOtoAPIResponse(savedObject),
        });
      } catch (error) {
        logger.error(`Error fetching data connector: ${(error as Error).message}`);
        return createErrorResponse(response, 'Failed to fetch data connector', error as Error);
      }
    }
  );

  // Create data connector
  router.post(
    {
      path: '/api/data_connectors',
      validate: {
        body: createDataConnectorRequestSchema,
      },
      security: {
        authz: {
          enabled: false,
          reason: 'This route is opted out from authorization',
        },
      },
    },
    async (context, request, response) => {
      const coreContext = await context.core;

      try {
        const { name, type, token } = request.body;
        const [, { actions, dataSourcesRegistry, onechat }] = await getStartServices();

        // Validate data connector type exists
        const dataCatalog = dataSourcesRegistry.getCatalog();
        const dataConnectorTypeDef = dataCatalog.get(type);
        if (!dataConnectorTypeDef) {
          return response.customError({
            statusCode: 400,
            body: {
              message: `Data connector type "${request.body.type}" not found`,
            },
          });
        }

        // Create stack connector
        const connectorType = dataConnectorTypeDef.stackConnector.type;
        const secrets = buildSecretsFromConnectorSpec(connectorType, token);

        logger.info(`Creating Kibana stack connector for data connector '${name}'`);
        const actionsClient = await actions.getActionsClientWithRequest(request);
        const stackConnector = await actionsClient.create({
          action: {
            name: `${type} stack connector for data connector '${name}'`,
            actionTypeId: connectorType,
            config: {},
            secrets,
          },
        });

        // Create workflows and tools
        const savedObjectsClient = coreContext.savedObjects.client;
        const spaceId = getSpaceId(savedObjectsClient);

        logger.info(`Creating workflows for data connector '${name}'`);
        const { workflowIds, toolIds } = await createWorkflowsAndTools({
          workflowInfos: dataConnectorTypeDef.generateWorkflows(stackConnector.id),
          stackConnectorId: stackConnector.id,
          type,
          spaceId,
          request,
          logger,
          workflowManagement,
          onechatTools: onechat.tools,
        });

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

        return response.ok({
          body: {
            message: 'Data connector created successfully!',
            dataConnectorId: savedObject.id,
            stackConnectorId: stackConnector.id,
          },
        });
      } catch (error) {
        logger.error(`Error creating data connector: ${(error as Error).message}`);
        return createErrorResponse(response, 'Failed to create data connector', error as Error);
      }
    }
  );

  // Delete all data connectors
  router.delete(
    {
      path: '/api/data_connectors',
      validate: false,
      security: {
        authz: {
          enabled: false,
          reason: 'This route is opted out from authorization',
        },
      },
    },
    async (context, request, response) => {
      const coreContext = await context.core;

      try {
        const savedObjectsClient = coreContext.savedObjects.client;
        const findResponse: SavedObjectsFindResponse<DataConnectorAttributes> =
          await savedObjectsClient.find({
            type: DATA_CONNECTOR_SAVED_OBJECT_TYPE,
            perPage: MAX_PAGE_SIZE,
          });
        const connectors = findResponse.saved_objects;

        logger.info(`Found ${connectors.length} data connector(s) to delete`);

        if (connectors.length === 0) {
          return response.ok({
            body: {
              success: true,
              deletedCount: 0,
              fullyDeletedCount: 0,
              partiallyDeletedCount: 0,
            },
          });
        }

        // Delete all related resources and saved objects for each connector
        const [, { actions, onechat }] = await getStartServices();
        const actionsClient = await actions.getActionsClientWithRequest(request);
        const toolRegistry = await onechat.tools.getRegistry({ request });

        let fullyDeletedCount = 0;
        let partiallyDeletedCount = 0;

        // Process each connector individually to handle partial failures
        for (const connector of connectors) {
          const result = await deleteConnectorAndRelatedResources({
            connector,
            savedObjectsClient,
            actionsClient,
            toolRegistry,
            workflowManagement,
            request,
            logger,
          });

          if (result.fullyDeleted) {
            fullyDeletedCount++;
          } else {
            partiallyDeletedCount++;
          }
        }

        return response.ok({
          body: {
            success: true,
            deletedCount: connectors.length,
            fullyDeletedCount,
            partiallyDeletedCount,
          },
        });
      } catch (error) {
        logger.error(`Failed to delete all connectors: ${(error as Error).message}`);
        return createErrorResponse(response, 'Failed to delete all connectors', error as Error);
      }
    }
  );

  // Delete data connector by ID
  router.delete(
    {
      path: '/api/data_connectors/{id}',
      validate: { params: schema.object({ id: schema.string() }) },
      security: {
        authz: {
          enabled: false,
          reason: 'This route is opted out from authorization',
        },
      },
    },
    async (context, request, response) => {
      const coreContext = await context.core;

      try {
        const savedObjectsClient = coreContext.savedObjects.client;
        const savedObject: SavedObject<DataConnectorAttributes> = await savedObjectsClient.get(
          DATA_CONNECTOR_SAVED_OBJECT_TYPE,
          request.params.id
        );

        // Delete the connector and all related resources
        const [, { actions, onechat }] = await getStartServices();
        const actionsClient = await actions.getActionsClientWithRequest(request);
        const toolRegistry = await onechat.tools.getRegistry({ request });

        const result = await deleteConnectorAndRelatedResources({
          connector: savedObject,
          savedObjectsClient,
          actionsClient,
          toolRegistry,
          workflowManagement,
          request,
          logger,
        });

        return response.ok({
          body: result,
        });
      } catch (error) {
        logger.error(`Failed to delete connector: ${(error as Error).message}`);
        return createErrorResponse(response, 'Failed to delete connector', error as Error);
      }
    }
  );
}

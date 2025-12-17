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

/**
 * Deletes all related resources for a data connector (stack connectors, tools, workflows)
 */
async function deleteRelatedResources(params: DeleteRelatedResourcesParams): Promise<void> {
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

  // Delete stack connectors
  if (kscIds.length > 0) {
    const deleteKscPromises = kscIds.map((kscId) => actionsClient.delete({ id: kscId }));
    await Promise.all(deleteKscPromises);
    logger.info(`Deleted ${kscIds.length} stack connector(s): ${kscIds.join(', ')}`);
  }

  // Delete tools
  if (toolIds.length > 0) {
    const deleteToolPromises = toolIds.map((toolId) => toolRegistry.delete(toolId));
    await Promise.all(deleteToolPromises);
    logger.info(`Deleted ${toolIds.length} tool(s): ${toolIds.join(', ')}`);
  }

  // Delete workflows
  if (workflowIds.length > 0) {
    await workflowManagement.management.deleteWorkflows(workflowIds, spaceId, request);
    logger.info(`Deleted ${workflowIds.length} workflow(s): ${workflowIds.join(', ')}`);
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

        // Get all resource IDs to delete
        const kscIds = connectors.flatMap((connector) => connector.attributes.kscIds);
        const toolIds = connectors.flatMap((connector) => connector.attributes.toolIds);
        const workflowIds = connectors.flatMap((connector) => connector.attributes.workflowIds);

        // Delete all related resources
        const [, { actions, onechat }] = await getStartServices();
        const actionsClient = await actions.getActionsClientWithRequest(request);
        const toolRegistry = await onechat.tools.getRegistry({ request });
        const spaceId = getSpaceId(savedObjectsClient);

        await deleteRelatedResources({
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

        // Delete the saved objects
        const deletePromises = connectors.map((connector) =>
          savedObjectsClient.delete(DATA_CONNECTOR_SAVED_OBJECT_TYPE, connector.id)
        );
        await Promise.all(deletePromises);
        logger.info(`Deleted ${connectors.length} data connector(s)`);

        return response.ok({
          body: {
            success: true,
            deletedCount: connectors.length,
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

        // Get resource IDs from the saved object
        const { kscIds, toolIds, workflowIds } = savedObject.attributes;

        // Delete all related resources
        const [, { actions, onechat }] = await getStartServices();
        const actionsClient = await actions.getActionsClientWithRequest(request);
        const toolRegistry = await onechat.tools.getRegistry({ request });
        const spaceId = getSpaceId(savedObjectsClient);

        await deleteRelatedResources({
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

        // Delete the saved object
        await savedObjectsClient.delete(DATA_CONNECTOR_SAVED_OBJECT_TYPE, savedObject.id);
        logger.info(`Deleted data connector ${savedObject.id}`);

        return response.ok({
          body: {
            success: true,
          },
        });
      } catch (error) {
        logger.error(`Failed to delete connector: ${(error as Error).message}`);
        return createErrorResponse(response, 'Failed to delete connector', error as Error);
      }
    }
  );
}

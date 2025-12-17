/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IRouter,
  Logger,
  SavedObject,
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

export function registerRoutes(
  router: IRouter,
  logger: Logger,
  getStartServices: StartServicesAccessor<DataConnectorsServerStartDependencies>,
  workflowManagement: DataConnectorsServerSetupDependencies['workflowsManagement']
) {
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
    async (context, request, response) => {
      const coreContext = await context.core;

      try {
        const savedObjectsClient = coreContext.savedObjects.client;
        const findResult: SavedObjectsFindResponse<DataConnectorAttributes> =
          await savedObjectsClient.find({
            type: DATA_CONNECTOR_SAVED_OBJECT_TYPE,
            perPage: 100,
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
        return response.customError({
          statusCode: 500,
          body: {
            message: `Failed to list connectors: ${(error as Error).message}`,
          },
        });
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
        return response.customError({
          statusCode: 500,
          body: {
            message: `Failed to fetch data connector: ${(error as Error).message}`,
          },
        });
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

        const savedObjectsClient = coreContext.savedObjects.client;
        const spaceId = savedObjectsClient.getCurrentNamespace() ?? DEFAULT_NAMESPACE_STRING;

        logger.info(`Creating workflows for data connector '${name}'`);
        const workflowIds: string[] = [];
        const toolIds: string[] = [];
        for (const workflowInfo of dataConnectorTypeDef.generateWorkflows(stackConnector.id)) {
          const workflow = await workflowManagement.management.createWorkflow(
            { yaml: workflowInfo.content },
            spaceId,
            request
          );
          workflowIds.push(workflow.id);
          if (workflowInfo.shouldGenerateABTool) {
            const toolRegistry = await onechat.tools.getRegistry({ request });
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

        const now = new Date().toISOString();
        logger.info(`Creating ${DATA_CONNECTOR_SAVED_OBJECT_TYPE} SO created at ${now}`);
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
        return response.customError({
          statusCode: 500,
          body: {
            message: `Failed to create data connector: ${(error as Error).message}`,
          },
        });
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
            perPage: 1000,
          });
        const connectors = findResponse.saved_objects;

        const kscIds: string[] = connectors.flatMap((connector) => connector.attributes.kscIds);
        logger.info(
          `Found ${connectors.length} data connectors and ${kscIds.length} stack connectors to delete.`
        );

        const [, { actions, onechat }] = await getStartServices();
        const actionsClient = await actions.getActionsClientWithRequest(request);
        const deleteKscPromises = kscIds.map((kscId) => actionsClient.delete({ id: kscId }));
        await Promise.all(deleteKscPromises);

        const toolIds: string[] = connectors.flatMap((connector) => connector.attributes.toolIds);
        const toolRegistry = await onechat.tools.getRegistry({ request });
        const deleteToolPromises = toolIds.map((toolId) => toolRegistry.delete(toolId));
        await Promise.all(deleteToolPromises);

        const workflowIds: string[] = connectors.flatMap(
          (connector) => connector.attributes.workflowIds
        );
        const spaceId = savedObjectsClient.getCurrentNamespace() ?? DEFAULT_NAMESPACE_STRING;
        await workflowManagement.management.deleteWorkflows(workflowIds, spaceId, request);

        const deletePromises = connectors.map((connector) =>
          savedObjectsClient.delete(DATA_CONNECTOR_SAVED_OBJECT_TYPE, connector.id)
        );
        await Promise.all(deletePromises);

        return response.ok({
          body: {
            success: true,
            deletedCount: connectors.length,
          },
        });
      } catch (error) {
        logger.error(`Failed to delete all connectors: ${(error as Error).message}`);
        return response.customError({
          statusCode: 500,
          body: {
            message: `Failed to delete all connectors: ${(error as Error).message}`,
          },
        });
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
      const [, { onechat }] = await getStartServices();

      try {
        const savedObjectsClient = coreContext.savedObjects.client;
        const savedObject: SavedObject<DataConnectorAttributes> = await savedObjectsClient.get(
          DATA_CONNECTOR_SAVED_OBJECT_TYPE,
          request.params.id
        );
        const kscIds: string[] = savedObject.attributes.kscIds;

        const [, { actions }] = await getStartServices();
        const actionsClient = await actions.getActionsClientWithRequest(request);
        kscIds.forEach((kscId) => actionsClient.delete({ id: kscId }));
        logger.info(`Successfully deleted Kibana stack connectors: ${kscIds.join(', ')}`);

        const toolIds: string[] = savedObject.attributes.toolIds;
        const toolRegistry = await onechat.tools.getRegistry({ request });
        toolIds.forEach((toolId) => toolRegistry.delete(toolId));
        logger.info(`Successfully deleted tools: ${toolIds.join(', ')}`);

        const workflowIds: string[] = savedObject.attributes.workflowIds;
        const spaceId = savedObjectsClient.getCurrentNamespace() ?? DEFAULT_NAMESPACE_STRING;
        await workflowManagement.management.deleteWorkflows(workflowIds, spaceId, request);
        logger.info(`Successfully deleted workflows: ${workflowIds.join(', ')}`);

        await savedObjectsClient.delete(DATA_CONNECTOR_SAVED_OBJECT_TYPE, savedObject.id);
        logger.info(`Successfully deleted data connector ${savedObject.id}`);
        return response.ok({
          body: {
            success: true,
          },
        });
      } catch (error) {
        logger.error(`Failed to delete connector: ${(error as Error).message}`);
        return response.customError({
          statusCode: 500,
          body: {
            message: `Failed to delete connector: ${(error as Error).message}`,
          },
        });
      }
    }
  );
}

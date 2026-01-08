/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IRouter,
  KibanaResponseFactory,
  Logger,
  SavedObject,
  SavedObjectsFindResponse,
  StartServicesAccessor,
} from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import {
  createConnectorAndRelatedResources,
  deleteConnectorAndRelatedResources,
} from './connectors_helpers';
import type { DataConnectorAttributes } from '../saved_objects';
import { DATA_CONNECTOR_SAVED_OBJECT_TYPE } from '../saved_objects';
import type {
  DataConnectorsServerSetupDependencies,
  DataConnectorsServerStartDependencies,
} from '../types';
import { convertSOtoAPIResponse, createDataConnectorRequestSchema } from './schema';
import { API_BASE_PATH } from '../../common/constants';

// Constants
const DEFAULT_PAGE_SIZE = 100;
const MAX_PAGE_SIZE = 1000;

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

  // List available source types from Data Sources Registry
  router.get(
    {
      path: `${API_BASE_PATH}/types`,
      validate: false,
      security: {
        authz: {
          enabled: false,
          reason: 'Authorization is delegated to underlying service plugins',
        },
      },
    },
    async (context, request, response) => {
      try {
        const [, { dataSourcesRegistry }] = await getStartServices();
        const dataCatalog = dataSourcesRegistry.getCatalog();
        const types = dataCatalog.list();

        return response.ok({
          body: types,
        });
      } catch (error) {
        logger.error(`Failed to list connector types: ${(error as Error).message}`);
        return response.customError({
          statusCode: 500,
          body: {
            message: `Failed to list connector types: ${(error as Error).message}`,
          },
        });
      }
    }
  );

  // Get a specific source type by ID
  router.get(
    {
      path: `${API_BASE_PATH}/types/{id}`,
      validate: { params: schema.object({ id: schema.string() }) },
      security: {
        authz: {
          enabled: false,
          reason: 'Authorization is delegated to underlying service plugins',
        },
      },
    },
    async (context, request, response) => {
      try {
        const [, { dataSourcesRegistry }] = await getStartServices();
        const dataCatalog = dataSourcesRegistry.getCatalog();
        const type = dataCatalog.get(request.params.id);

        if (!type) {
          return response.notFound({
            body: { message: `Connector type "${request.params.id}" not found` },
          });
        }

        // Include workflow information
        const workflowInfos = type.generateWorkflows('<fake-stack-connector-id>');

        return response.ok({
          body: {
            ...type,
            workflowInfos,
          },
        });
      } catch (error) {
        logger.error(`Failed to get connector type: ${(error as Error).message}`);
        return response.customError({
          statusCode: 500,
          body: {
            message: `Failed to get connector type: ${(error as Error).message}`,
          },
        });
      }
    }
  );

  // List all data connectors
  router.get(
    {
      path: API_BASE_PATH,
      validate: false,
      security: {
        authz: {
          enabled: false,
          reason: 'Authorization is delegated to underlying service plugins',
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
      path: `${API_BASE_PATH}/{id}`,
      validate: { params: schema.object({ id: schema.string() }) },
      security: {
        authz: {
          enabled: false,
          reason: 'Authorization is delegated to underlying service plugins',
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
      path: API_BASE_PATH,
      validate: {
        body: createDataConnectorRequestSchema,
      },
      security: {
        authz: {
          enabled: false,
          reason: 'Authorization is delegated to underlying service plugins',
        },
      },
    },
    async (context, request, response) => {
      const coreContext = await context.core;

      try {
        const { name, type, token } = request.body;
        const [, { actions, dataSourcesRegistry, agentBuilder }] = await getStartServices();
        const savedObjectsClient = coreContext.savedObjects.client;

        // Validate data connector type exists
        const dataCatalog = dataSourcesRegistry.getCatalog();
        const dataConnectorTypeDef = dataCatalog.get(type);
        if (!dataConnectorTypeDef) {
          return response.customError({
            statusCode: 400,
            body: {
              message: `Data connector type "${type}" not found`,
            },
          });
        }

        const dataConnectorId = await createConnectorAndRelatedResources({
          name,
          type,
          token,
          savedObjectsClient,
          request,
          logger,
          workflowManagement,
          actions,
          dataConnectorTypeDef,
          agentBuilder,
        });

        return response.ok({
          body: {
            message: 'Data connector created successfully!',
            dataConnectorId,
          },
        });
      } catch (error) {
        logger.error(`Error creating data connector: ${(error as Error).message}`);
        return createErrorResponse(response, 'Failed to create data connector', error as Error);
      }
    }
  );

  // Update data connector by ID
  router.put(
    {
      path: `${API_BASE_PATH}/{id}`,
      validate: {
        params: schema.object({ id: schema.string() }),
        body: schema.object({
          name: schema.maybe(schema.string()),
        }),
      },
      security: {
        authz: {
          enabled: false,
          reason: 'Authorization is delegated to underlying service plugins',
        },
      },
    },
    async (context, request, response) => {
      const coreContext = await context.core;

      try {
        const { name } = request.body;
        const savedObjectsClient = coreContext.savedObjects.client;

        // Get existing data connector
        const savedObject: SavedObject<DataConnectorAttributes> = await savedObjectsClient.get(
          DATA_CONNECTOR_SAVED_OBJECT_TYPE,
          request.params.id
        );

        // Update only if name is provided
        if (name !== undefined) {
          await savedObjectsClient.update<DataConnectorAttributes>(
            DATA_CONNECTOR_SAVED_OBJECT_TYPE,
            request.params.id,
            {
              ...savedObject.attributes,
              name,
            }
          );

          // Fetch the updated saved object
          const updatedSavedObject: SavedObject<DataConnectorAttributes> =
            await savedObjectsClient.get(DATA_CONNECTOR_SAVED_OBJECT_TYPE, request.params.id);

          logger.info(`Successfully updated data connector ${request.params.id}`);
          return response.ok({
            body: convertSOtoAPIResponse(updatedSavedObject),
          });
        }

        // If no updates provided, return current state
        return response.ok({
          body: convertSOtoAPIResponse(savedObject),
        });
      } catch (error) {
        logger.error(`Failed to update data connector: ${(error as Error).message}`);
        return response.customError({
          statusCode: 500,
          body: {
            message: `Failed to update data connector: ${(error as Error).message}`,
          },
        });
      }
    }
  );

  // Delete all data connectors
  router.delete(
    {
      path: API_BASE_PATH,
      validate: false,
      security: {
        authz: {
          enabled: false,
          reason: 'Authorization is delegated to underlying service plugins',
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

        logger.debug(`Found ${connectors.length} data connector(s) to delete`);

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
        const [, { actions, agentBuilder }] = await getStartServices();
        const actionsClient = await actions.getActionsClientWithRequest(request);
        const toolRegistry = await agentBuilder.tools.getRegistry({ request });

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
      path: `${API_BASE_PATH}/{id}`,
      validate: { params: schema.object({ id: schema.string() }) },
      security: {
        authz: {
          enabled: false,
          reason: 'Authorization is delegated to underlying service plugins',
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
        const [, { actions, agentBuilder }] = await getStartServices();
        const actionsClient = await actions.getActionsClientWithRequest(request);
        const toolRegistry = await agentBuilder.tools.getRegistry({ request });

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

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
  createDataSourceAndRelatedResources,
  deleteDataSourceAndRelatedResources,
} from './data_sources_helpers';
import type { DataSourceAttributes } from '../saved_objects';
import { DATA_SOURCE_SAVED_OBJECT_TYPE } from '../saved_objects';
import type {
  DataSourcesServerSetupDependencies,
  DataSourcesServerStartDependencies,
} from '../types';
import { convertSOtoAPIResponse, createDataSourceRequestSchema } from './schema';
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
  getStartServices: StartServicesAccessor<DataSourcesServerStartDependencies>;
  workflowManagement: DataSourcesServerSetupDependencies['workflowsManagement'];
}

/**
 * Registers all data sources routes
 */
export function registerRoutes(dependencies: RouteDependencies) {
  const { router, logger, getStartServices, workflowManagement } = dependencies;
  // List all data sources
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
        const findResult: SavedObjectsFindResponse<DataSourceAttributes> =
          await savedObjectsClient.find({
            type: DATA_SOURCE_SAVED_OBJECT_TYPE,
            perPage: DEFAULT_PAGE_SIZE,
          });

        const dataSources = findResult.saved_objects.map((savedObject) => {
          return convertSOtoAPIResponse(savedObject);
        });

        return response.ok({
          body: {
            dataSources,
            total: findResult.total,
          },
        });
      } catch (error) {
        logger.error(`Failed to list all data sources: ${(error as Error).message}`);
        return createErrorResponse(response, 'Failed to list data sources', error as Error);
      }
    }
  );

  // Get one data source by ID
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
        const savedObject: SavedObject<DataSourceAttributes> = await savedObjectsClient.get(
          DATA_SOURCE_SAVED_OBJECT_TYPE,
          request.params.id
        );

        return response.ok({
          body: convertSOtoAPIResponse(savedObject),
        });
      } catch (error) {
        logger.error(`Error fetching data source: ${(error as Error).message}`);
        return createErrorResponse(response, 'Failed to fetch data source', error as Error);
      }
    }
  );

  // Create data source
  router.post(
    {
      path: API_BASE_PATH,
      validate: {
        body: createDataSourceRequestSchema,
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
        const { name, type, credentials, stack_connector_id } = request.body;
        const [, { actions, dataCatalog, agentBuilder }] = await getStartServices();
        const savedObjectsClient = coreContext.savedObjects.client;

        // Validate data source type exists
        const catalog = dataCatalog.getCatalog();
        const dataSource = catalog.get(type);
        if (!dataSource) {
          return response.customError({
            statusCode: 400,
            body: {
              message: `Data source type "${type}" not found`,
            },
          });
        }

        // Validate required fields based on pattern
        if (!stack_connector_id && (!name || !credentials)) {
          return response.badRequest({
            body: {
              message: 'name and token are required when stack_connector_id is not provided',
            },
          });
        }

        const dataSourceId = await createDataSourceAndRelatedResources({
          name: name || `Data source for ${type}`,
          type,
          credentials: credentials || '',
          stackConnectorId: stack_connector_id,
          savedObjectsClient,
          request,
          logger,
          workflowManagement,
          actions,
          dataSource,
          agentBuilder,
        });

        return response.ok({
          body: {
            message: 'Data source created successfully!',
            dataSourceId,
          },
        });
      } catch (error) {
        logger.error(`Error creating data source: ${(error as Error).message}`);
        return createErrorResponse(response, 'Failed to create data source', error as Error);
      }
    }
  );

  // Update data source by ID
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
        const savedObject: SavedObject<DataSourceAttributes> = await savedObjectsClient.get(
          DATA_SOURCE_SAVED_OBJECT_TYPE,
          request.params.id
        );

        // Update only if name is provided
        if (name !== undefined) {
          await savedObjectsClient.update<DataSourceAttributes>(
            DATA_SOURCE_SAVED_OBJECT_TYPE,
            request.params.id,
            {
              ...savedObject.attributes,
              name,
              updatedAt: new Date().toISOString(),
            }
          );

          // Fetch the updated saved object
          const updatedSavedObject: SavedObject<DataSourceAttributes> =
            await savedObjectsClient.get(DATA_SOURCE_SAVED_OBJECT_TYPE, request.params.id);

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

  // Delete all data sources
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
        const findResponse: SavedObjectsFindResponse<DataSourceAttributes> =
          await savedObjectsClient.find({
            type: DATA_SOURCE_SAVED_OBJECT_TYPE,
            perPage: MAX_PAGE_SIZE,
          });
        const dataSources = findResponse.saved_objects;

        logger.debug(`Found ${dataSources.length} data source(s) to delete`);

        if (dataSources.length === 0) {
          return response.ok({
            body: {
              success: true,
              deletedCount: 0,
              fullyDeletedCount: 0,
              partiallyDeletedCount: 0,
            },
          });
        }

        // Delete all related resources and saved objects for each data source
        const [, { actions, agentBuilder }] = await getStartServices();
        const actionsClient = await actions.getActionsClientWithRequest(request);
        const toolRegistry = await agentBuilder.tools.getRegistry({ request });

        let fullyDeletedCount = 0;
        let partiallyDeletedCount = 0;

        // Process each data source individually to handle partial failures
        for (const dataSource of dataSources) {
          const result = await deleteDataSourceAndRelatedResources({
            dataSource,
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
            deletedCount: dataSources.length,
            fullyDeletedCount,
            partiallyDeletedCount,
          },
        });
      } catch (error) {
        logger.error(`Failed to delete all data sources: ${(error as Error).message}`);
        return createErrorResponse(response, 'Failed to delete all data sources', error as Error);
      }
    }
  );

  // Delete data source by ID
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
        const dataSource: SavedObject<DataSourceAttributes> = await savedObjectsClient.get(
          DATA_SOURCE_SAVED_OBJECT_TYPE,
          request.params.id
        );

        // Delete the data source and all related resources
        const [, { actions, agentBuilder }] = await getStartServices();
        const actionsClient = await actions.getActionsClientWithRequest(request);
        const toolRegistry = await agentBuilder.tools.getRegistry({ request });

        const result = await deleteDataSourceAndRelatedResources({
          dataSource,
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
        logger.error(`Failed to delete data source: ${(error as Error).message}`);
        return createErrorResponse(response, 'Failed to delete data source', error as Error);
      }
    }
  );
}

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
import { DATA_SOURCES_ROUTE } from '../../common';
import {
  createDataSourceAndRelatedResources,
  deleteDataSourceAndRelatedResources,
} from './data_sources_helpers';
import type { DataSourceAttributes } from '../saved_objects';
import { DATA_SOURCE_SAVED_OBJECT_TYPE } from '../saved_objects';
import type {
  DataConnectorsServerSetupDependencies,
  DataConnectorsServerStartDependencies,
} from '../types';
import { convertSOtoAPIResponse, createDataSourceRequestSchema } from './schema';

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
 * Registers all data sources routes
 */
export function registerRoutes(dependencies: RouteDependencies) {
  const { router, logger, getStartServices, workflowManagement } = dependencies;
  // List all data sources
  router.get(
    {
      path: DATA_SOURCES_ROUTE,
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
      path: `${DATA_SOURCES_ROUTE}/{id}`,
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
      path: DATA_SOURCES_ROUTE,
      validate: {
        body: createDataSourceRequestSchema,
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
        const [, { actions, dataSourcesRegistry, agentBuilder }] = await getStartServices();
        const savedObjectsClient = coreContext.savedObjects.client;

        // Validate data source type exists
        const dataCatalog = dataSourcesRegistry.getCatalog();
        const dataSource = dataCatalog.get(type);
        if (!dataSource) {
          return response.customError({
            statusCode: 400,
            body: {
              message: `Data source of type "${request.body.type}" not found`,
            },
          });
        }

        const dataSourceId = await createDataSourceAndRelatedResources({
          name,
          type,
          token,
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

  // Delete all data sources
  router.delete(
    {
      path: DATA_SOURCES_ROUTE,
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
      path: `${DATA_SOURCES_ROUTE}/{id}`,
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

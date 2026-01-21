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
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { connectorsSpecs } from '@kbn/connector-specs';
import { v4 } from 'uuid';
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
import { TYPE } from '../tasks/bulk_delete_task';

// Constants
// Note: MAX_PAGE_SIZE removed as bulk delete now uses task manager with point-in-time finder

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
      validate: {
        query: schema.object({
          per_page: schema.number({ min: 1, defaultValue: 100, max: 1000 }),
          page: schema.number({ min: 1, defaultValue: 1 }),
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
      const query = request.query;

      try {
        const savedObjectsClient = coreContext.savedObjects.client;
        const findResult: SavedObjectsFindResponse<DataSourceAttributes> =
          await savedObjectsClient.find({
            type: DATA_SOURCE_SAVED_OBJECT_TYPE,
            perPage: query.per_page,
            page: query.page,
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
      try {
        const [, plugins] = await getStartServices();
        const taskManager = plugins.taskManager;

        if (!taskManager) {
          logger.error('Task Manager is not available');
          return response.customError({
            statusCode: 503,
            body: {
              message: 'Task Manager is not available',
            },
          });
        }

        const taskId = v4();
        await taskManager.ensureScheduled(
          {
            id: taskId,
            taskType: TYPE,
            scope: ['dataSources'],
            state: { isDone: false, deletedCount: 0, errors: [] },
            runAt: new Date(Date.now() + 3 * 1000),
            params: {},
          },
          { request }
        );

        logger.info(`Scheduled bulk delete task: ${taskId}`);
        return response.ok({
          body: {
            taskId,
          },
        });
      } catch (error) {
        logger.error(`Failed to schedule bulk delete task: ${(error as Error).message}`);
        return response.customError({
          statusCode: 500,
          body: {
            message: `Failed to schedule bulk delete task: ${(error as Error).message}`,
          },
        });
      }
    }
  );

  // Get bulk delete status
  router.get(
    {
      path: `${API_BASE_PATH}/_bulk_delete/{taskId}`,
      validate: {
        params: schema.object({ taskId: schema.string() }),
      },
      security: {
        authz: {
          enabled: false,
          reason: 'Authorization is delegated to underlying service plugins',
        },
      },
    },
    async (context, request, response) => {
      try {
        const [, plugins] = await getStartServices();
        const taskManager = plugins.taskManager;

        if (!taskManager) {
          return response.customError({
            statusCode: 503,
            body: {
              message: 'Task Manager is not available',
            },
          });
        }

        let task;
        try {
          task = await taskManager.get(request.params.taskId);
        } catch (error) {
          // If it's a "not found" error, return 404 response
          if (SavedObjectsErrorHelpers.isNotFoundError(error as Error)) {
            return response.notFound({
              body: {
                message: 'Task not found',
              },
            });
          }
          // For other errors, rethrow to be caught by outer catch block
          throw error;
        }

        const state = (task.state || {}) as {
          isDone: boolean;
          deletedCount: number;
          errors: Array<{ dataSourceId: string; error: string }>;
        };

        return response.ok({
          body: {
            isDone: state.isDone || false,
            deletedCount: state.deletedCount || 0,
            errors: state.errors || [],
          },
        });
      } catch (error) {
        logger.error(`Failed to get bulk delete status: ${(error as Error).message}`);
        return response.customError({
          statusCode: 500,
          body: {
            message: `Failed to get bulk delete status: ${(error as Error).message}`,
          },
        });
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

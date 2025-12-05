/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IRouter,
  Logger,
  SavedObjectsFindResponse,
  StartServicesAccessor,
} from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import type { DataConnectorAttributes } from '../saved_objects';
import { DATA_CONNECTOR_SAVED_OBJECT_TYPE } from '../saved_objects';
import type { DataConnectorsServerStartDependencies } from '../types';

const createDataConnectorRequestSchema = schema.object({
  type: schema.string({ minLength: 1 }),
  name: schema.string({ minLength: 1 }),
  token: schema.string({ minLength: 1 }),
});

export function registerRoutes(
  router: IRouter,
  logger: Logger,
  getStartServices: StartServicesAccessor<DataConnectorsServerStartDependencies>
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
          return {
            ...savedObject.attributes,
            id: savedObject.id,
          };
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
        const [, { actions, dataSourcesRegistry }] = await getStartServices();

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

        const actionsClient = await actions.getActionsClientWithRequest(request);
        const stackConnector = await actionsClient.create({
          action: {
            name: `${type} stack connector for data connector '${name}'`,
            actionTypeId: dataConnectorTypeDef.stackConnector.type,
            config: {},
            secrets: {
              authType: 'bearer', // TODO: can we get away without specifying this again
              token,
            },
          },
        });

        const savedObjectsClient = coreContext.savedObjects.client;
        const now = new Date().toISOString();
        const savedObject = await savedObjectsClient.create(DATA_CONNECTOR_SAVED_OBJECT_TYPE, {
          name,
          type,
          config: {},
          features: [],
          createdAt: now,
          updatedAt: now,
          workflowIds: [],
          toolIds: [],
          kscId: stackConnector.id,
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
        const findResponse = await savedObjectsClient.find({
          type: DATA_CONNECTOR_SAVED_OBJECT_TYPE,
          perPage: 1000,
        });
        const connectors = findResponse.saved_objects;
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
}

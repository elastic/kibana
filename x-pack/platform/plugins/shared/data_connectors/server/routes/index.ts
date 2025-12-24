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
import type { DataConnectorAttributes } from '../saved_objects';
import { DATA_CONNECTOR_SAVED_OBJECT_TYPE } from '../saved_objects';
import type { DataConnectorsServerStartDependencies } from '../types';
import { convertSOtoAPIResponse, createDataConnectorRequestSchema } from './schema';
import { API_BASE_PATH } from '../../common/constants';

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
  getStartServices: StartServicesAccessor<DataConnectorsServerStartDependencies>
) {
  // List available connector types from Data Sources Registry
  router.get(
    {
      path: `${API_BASE_PATH}/types`,
      validate: false,
      security: {
        authz: {
          enabled: false,
          reason: 'This route is opted out from authorization',
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

  // Get a specific connector type by ID
  router.get(
    {
      path: `${API_BASE_PATH}/types/{id}`,
      validate: { params: schema.object({ id: schema.string() }) },
      security: {
        authz: {
          enabled: false,
          reason: 'This route is opted out from authorization',
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
      path: `${API_BASE_PATH}/{id}`,
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
      path: API_BASE_PATH,
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
        const { name, type, token, stack_connector_id: stackConnectorId } = request.body;
        const [, { actions, dataSourcesRegistry }] = await getStartServices();

        // Validate: either use existing connector OR create new one
        if (!stackConnectorId && (!name || !token)) {
          return response.badRequest({
            body: {
              message: 'Either stack_connector_id or both name and token are required',
            },
          });
        }

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

        const actionsClient = await actions.getActionsClientWithRequest(request);
        let stackConnector;
        let dataConnectorName: string;

        if (stackConnectorId) {
          try {
            stackConnector = await actionsClient.get({ id: stackConnectorId });
            dataConnectorName = stackConnector.name;
          } catch (error) {
            logger.error(`Stack connector not found: ${stackConnectorId}`);
            return response.notFound({
              body: {
                message: `Stack connector "${stackConnectorId}" not found`,
              },
            });
          }

          // Validate connector type matches
          if (stackConnector.actionTypeId !== dataConnectorTypeDef.stackConnector.type) {
            return response.badRequest({
              body: {
                message: `Stack connector type "${stackConnector.actionTypeId}" does not match expected type "${dataConnectorTypeDef.stackConnector.type}"`,
              },
            });
          }
        } else {
          const connectorType = dataConnectorTypeDef.stackConnector.type;
          const secrets = buildSecretsFromConnectorSpec(connectorType, token!);

          stackConnector = await actionsClient.create({
            action: {
              name: `${type} stack connector for data connector '${name}'`,
              actionTypeId: connectorType,
              config: {},
              secrets,
            },
          });
          dataConnectorName = name!;
          logger.info(`Created new stack connector: ${stackConnector.id}`);
        }

        // Create data connector saved object
        const savedObjectsClient = coreContext.savedObjects.client;
        const savedObject = await savedObjectsClient.create(DATA_CONNECTOR_SAVED_OBJECT_TYPE, {
          name: dataConnectorName,
          type,
          workflowIds: [],
          toolIds: [],
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
      path: API_BASE_PATH,
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

        const [, { actions }] = await getStartServices();
        const actionsClient = await actions.getActionsClientWithRequest(request);
        const deleteKscPromises = kscIds.map((kscId) => actionsClient.delete({ id: kscId }));
        await Promise.all(deleteKscPromises);

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
      path: `${API_BASE_PATH}/{id}`,
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
        const kscIds: string[] = savedObject.attributes.kscIds;

        const [, { actions }] = await getStartServices();
        const actionsClient = await actions.getActionsClientWithRequest(request);
        kscIds.forEach((kscId) => actionsClient.delete({ id: kscId }));
        logger.info(`Successfully deleted Kibana stack connectors: ${kscIds.join(', ')}`);

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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type {
  IRouter,
  Logger,
  SavedObject,
  SavedObjectsFindResponse,
  StartServicesAccessor,
} from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { connectorsSpecs } from '@kbn/connector-specs';
import { generateSecretsSchemaFromSpec } from '@kbn/connector-specs/src/lib';
import type { DataConnectorAttributes } from '../saved_objects';
import { DATA_CONNECTOR_SAVED_OBJECT_TYPE } from '../saved_objects';
import type { DataConnectorsServerStartDependencies } from '../types';
import { convertSOtoAPIResponse, createDataConnectorRequestSchema } from './schema';

interface JSONSchema {
  [k: string]: unknown;
}
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

  const secretSchema = generateSecretsSchemaFromSpec(connectorSpec.auth, true);
  const jsonSecretSchema = z.toJSONSchema(secretSchema);
  if (jsonSecretSchema.type !== 'object' || !jsonSecretSchema.properties) {
    throw new Error('Stack connector spec has multiple auth types');
  }

  const authType = (jsonSecretSchema.properties?.authType as JSONSchema)?.const;

  const secrets: Record<string, string> = {};
  switch (authType) {
    case 'bearer':
      secrets.authType = authType;
      secrets.token = token;
      break;
    case 'api_key_header':
      secrets.authType = authType;
      const keyValue = Object.keys(jsonSecretSchema.properties).filter(
        (key) => key !== 'authType'
      )?.[0];
      secrets[keyValue] = token;
      break;
    default:
      throw new Error(`Unsupported auth type "${authType}" in stack connector spec`);
  }

  return secrets;
}

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

        const connectorType = dataConnectorTypeDef.stackConnector.type;
        const secrets = buildSecretsFromConnectorSpec(connectorType, token);

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
        const findResponse: SavedObjectsFindResponse<DataConnectorAttributes> =
          await savedObjectsClient.find({
            type: DATA_CONNECTOR_SAVED_OBJECT_TYPE,
            perPage: 1000,
          });
        const connectors = findResponse.saved_objects;

        const kscIds: string[] = connectors.map((connector) => connector.attributes.kscId);
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
        const kscId: string = savedObject.attributes.kscId;

        const [, { actions }] = await getStartServices();
        const actionsClient = await actions.getActionsClientWithRequest(request);
        await actionsClient.delete({ id: kscId });
        logger.info(`Successfully deleted Kibana stack connector ${kscId}`);

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

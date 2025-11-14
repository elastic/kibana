/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios, { type AxiosResponse } from 'axios';
import https from 'https';
import { schema } from '@kbn/config-schema';
import type { IRouter, Logger, KibanaRequest } from '@kbn/core/server';
import type {
  SavedObjectsClientContract,
  SavedObject,
  SavedObjectsFindResponse,
} from '@kbn/core-saved-objects-api-server';
import { DEFAULT_NAMESPACE_STRING } from '@kbn/core-saved-objects-utils-server';
import { WORKPLACE_CONNECTOR_SAVED_OBJECT_TYPE } from '../saved_objects';
import type {
  CreateWorkplaceConnectorRequest,
  UpdateWorkplaceConnectorRequest,
  WorkplaceConnectorResponse,
  WorkplaceConnectorAttributes,
} from '../../common';
import {
  createConnectorRequestSchema,
  updateConnectorRequestSchema,
  connectorIdSchema,
} from './schemas';
import type { WorkflowCreatorService } from '../services/workflow_creator';
import { CONNECTOR_CONFIG } from '../data/connector_config';

// Helper function to build response from saved object
function buildConnectorResponse(
  savedObject: SavedObject<WorkplaceConnectorAttributes>
): WorkplaceConnectorResponse {
  const attrs = savedObject.attributes;
  return {
    id: savedObject.id,
    name: attrs.name,
    type: attrs.type,
    config: attrs.config,
    createdAt: attrs.createdAt,
    updatedAt: attrs.updatedAt,
    workflowId: attrs.workflowId,
    workflowIds: attrs.workflowIds,
    toolIds: attrs.toolIds,
    features: attrs.features,
    hasSecrets: !!attrs.secrets,
  };
}

// Helper function to create workflows for a connector
async function createWorkflowsForConnector(
  connectorId: string,
  connectorType: string,
  features: string[],
  savedObjectsClient: SavedObjectsClientContract,
  workflowCreator: WorkflowCreatorService,
  request: KibanaRequest,
  logger: Logger
): Promise<{ workflowId?: string; workflowIds: string[]; toolIds: string[] }> {
  const workflowIds: string[] = [];
  const toolIds: string[] = [];

  try {
    const spaceId = savedObjectsClient.getCurrentNamespace() ?? DEFAULT_NAMESPACE_STRING;

    for (const feature of features) {
      const createdWorkflowId = await workflowCreator.createWorkflowForConnector(
        connectorId,
        connectorType,
        spaceId,
        request,
        feature
      );
      workflowIds.push(createdWorkflowId);
      toolIds.push(`${connectorType}.${feature}`.slice(0, 64));
    }

    const workflowId = workflowIds[0];

    await savedObjectsClient.update(WORKPLACE_CONNECTOR_SAVED_OBJECT_TYPE, connectorId, {
      workflowId,
      workflowIds,
      toolIds,
    });

    return { workflowId, workflowIds, toolIds };
  } catch (workflowError) {
    logger.error(
      `Failed to create workflow for connector ${connectorId}: ${(workflowError as Error).message}`
    );
    return { workflowIds, toolIds };
  }
}

// Helper function to get default features for a connector type
function getDefaultFeatures(connectorType: string): string[] {
  return CONNECTOR_CONFIG[connectorType]?.defaultFeatures || [];
}

// Helper function to create initial connector for OAuth flow
async function createOAuthConnector(
  connectorType: string,
  savedObjectsClient: SavedObjectsClientContract
): Promise<{ id: string }> {
  const connectorConfig = CONNECTOR_CONFIG[connectorType];
  if (!connectorConfig) {
    throw new Error(`Connector config not found for type: ${connectorType}`);
  }

  const now = new Date().toISOString();

  const savedObject = await savedObjectsClient.create(WORKPLACE_CONNECTOR_SAVED_OBJECT_TYPE, {
    name: connectorConfig.name,
    type: connectorType,
    config: { status: 'pending_oauth' },
    secrets: {},
    features: connectorConfig.defaultFeatures,
    createdAt: now,
    updatedAt: now,
  });

  return savedObject;
}

// Helper function to fetch OAuth secrets with retry logic
interface OAuthSecretsResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: string;
}

async function fetchOAuthSecrets(
  secretsUrl: string,
  maxRetries: number,
  retryDelay: number,
  logger: Logger
): Promise<OAuthSecretsResponse> {
  let secretsresponse: AxiosResponse<OAuthSecretsResponse> | undefined;
  let accessToken: string | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      secretsresponse = await axios.get<OAuthSecretsResponse>(secretsUrl, {
        headers: {
          'Content-Type': 'application/json',
        },
        httpsAgent: new https.Agent({
          rejectUnauthorized: false,
        }),
      });

      accessToken = secretsresponse.data.access_token;

      if (accessToken) {
        logger.info(`Access token found on attempt ${attempt}`);
        break;
      }

      if (attempt < maxRetries) {
        logger.info(`No access token found on attempt ${attempt}, retrying...`);
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    } catch (err) {
      if (attempt < maxRetries) {
        logger.warn(`Error fetching secrets on attempt ${attempt}, retrying...`, err);
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      } else {
        throw err;
      }
    }
  }

  if (!accessToken || !secretsresponse) {
    throw new Error('Access token not found after 5 attempts');
  }

  return secretsresponse.data;
}

export function registerConnectorRoutes(
  router: IRouter,
  workflowCreator: WorkflowCreatorService,
  logger: Logger
) {
  // Get connector configurations for UI
  router.get(
    {
      path: '/api/workplace_connectors/config',
      validate: {},
      security: {
        authz: {
          enabled: false,
          reason: 'This route is opted out from authorization',
        },
      },
    },
    async (context, request, response) => {
      try {
        // Transform config to include connectorType and match frontend format
        const connectors = Object.entries(CONNECTOR_CONFIG).map(([connectorType, config]) => ({
          connectorType,
          title: config.name,
          description: config.description,
          defaultFeatures: config.defaultFeatures,
          flyoutComponentId: config.flyoutComponentId,
          customFlyoutComponentId: config.customFlyoutComponentId,
          saveConfig: config.saveConfig,
          oauthConfig: config.oauthConfig,
        }));

        return response.ok({
          body: {
            connectors,
          },
        });
      } catch (error) {
        return response.customError({
          statusCode: 500,
          body: {
            message: `Failed to get connector config: ${(error as Error).message}`,
          },
        });
      }
    }
  );

  // Initiate OAuth for connectors - dynamic route based on provider
  router.post(
    {
      path: '/api/workplace_connectors/{provider}/initiate',
      validate: {
        params: schema.object({
          provider: schema.string(),
        }),
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
      const { provider } = request.params;

      // Find connector type by OAuth provider
      const connectorType = Object.keys(CONNECTOR_CONFIG).find(
        (type) => CONNECTOR_CONFIG[type].oauthConfig?.provider === provider
      );

      if (!connectorType) {
        return response.customError({
          statusCode: 400,
          body: {
            message: `No connector found for OAuth provider: ${provider}`,
          },
        });
      }

      const connectorConfig = CONNECTOR_CONFIG[connectorType];

      if (!connectorConfig?.oauthConfig) {
        return response.customError({
          statusCode: 400,
          body: {
            message: `OAuth not configured for connector type: ${connectorType}`,
          },
        });
      }

      try {
        const savedObjectsClient = coreContext.savedObjects.client;

        // Create connector using data-driven helper
        const savedObject = await createOAuthConnector(connectorType, savedObjectsClient);

        const oauthBaseUrl = connectorConfig.oauthConfig.oauthBaseUrl || 'https://localhost:8052';
        const oauthUrl = `${oauthBaseUrl}${connectorConfig.oauthConfig.initiatePath}`;
        const authresponse = await axios.post<{ auth_url: string; request_id: string }>(
          oauthUrl,
          {
            scope: connectorConfig.oauthConfig.scopes,
          },
          {
            httpsAgent: new https.Agent({
              rejectUnauthorized: false,
            }),
          }
        );

        const authUrl = authresponse.data.auth_url;
        const requestId = authresponse.data.request_id;

        logger.info(`OAuth URL for ${provider}: ${authUrl}`);

        return response.ok({
          body: {
            connectorId: savedObject.id,
            requestId,
            authUrl,
          },
        });
      } catch (error) {
        logger.error(`Failed to initiate OAuth: ${(error as Error).message}`);
        return response.customError({
          statusCode: 500,
          body: {
            message: `Failed to initiate OAuth: ${(error as Error).message}`,
          },
        });
      }
    }
  );

  // Handle OAuth callback - fetches secrets and updates connector
  router.get(
    {
      path: '/api/workplace_connectors/oauth/complete',
      validate: {
        query: schema.object({
          requestId: schema.string(),
          connectorId: schema.string(),
        }),
      },
      options: {
        access: 'public',
      },
      security: {
        authz: {
          enabled: false,
          reason: 'This route is opted out from authorization',
        },
        authc: {
          enabled: false,
          reason: 'OAuth callback must be accessible without authentication',
        },
      },
    },
    async (context, request, response) => {
      logger.info(`Oauth response received`);

      const coreContext = await context.core;

      try {
        const { requestId, connectorId } = request.query;
        const savedObjectsClient = coreContext.savedObjects.client;

        // Get connector to determine type and config
        const connector = await savedObjectsClient.get(
          WORKPLACE_CONNECTOR_SAVED_OBJECT_TYPE,
          connectorId
        );
        const connectorType = (connector.attributes as WorkplaceConnectorAttributes).type;
        const connectorConfig = CONNECTOR_CONFIG[connectorType];

        if (!connectorConfig?.oauthConfig) {
          return response.customError({
            statusCode: 400,
            body: {
              message: `OAuth not configured for connector type: ${connectorType}`,
            },
          });
        }

        // Fetch secrets from OAuth service using data-driven helper
        const oauthBaseUrl = connectorConfig.oauthConfig.oauthBaseUrl || 'https://localhost:8052';
        const secretsUrl = `${oauthBaseUrl}${connectorConfig.oauthConfig.fetchSecretsPath}?request_id=${requestId}`;
        const maxRetries = 5;
        const retryDelay = 2000;

        const oauthSecrets = await fetchOAuthSecrets(secretsUrl, maxRetries, retryDelay, logger);

        logger.info(`Secrets fetched for connector ${connectorId}`);

        // Update connector with OAuth tokens
        await savedObjectsClient.update(WORKPLACE_CONNECTOR_SAVED_OBJECT_TYPE, connectorId, {
          secrets: {
            access_token: oauthSecrets.access_token || '',
            refresh_token: oauthSecrets.refresh_token || '',
            expires_in: oauthSecrets.expires_in || '3600',
          },
          config: { status: 'connected' },
          updatedAt: new Date().toISOString(),
        });

        // Create workflows for the connector
        const features = connectorConfig.defaultFeatures;
        await createWorkflowsForConnector(
          connectorId,
          connectorType,
          features,
          savedObjectsClient,
          workflowCreator,
          request,
          logger
        );

        return response.ok({
          body: {
            success: true,
            connectorId,
          },
        });
      } catch (error) {
        logger.error(`OAuth complete error: ${(error as Error).message}`);
        return response.customError({
          statusCode: 500,
          body: {
            message: (error as Error).message || 'Failed to complete OAuth',
          },
        });
      }
    }
  );

  // Create connector
  router.post(
    {
      path: '/api/workplace_connectors',
      validate: {
        body: createConnectorRequestSchema,
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
      const {
        name,
        type,
        config = {},
        secrets,
        features = [],
      } = request.body as CreateWorkplaceConnectorRequest;

      try {
        const savedObjectsClient = coreContext.savedObjects.client;
        const now = new Date().toISOString();

        // Use provided features or default features for connector type
        const featuresToUse = features.length > 0 ? features : getDefaultFeatures(type);

        const savedObject = await savedObjectsClient.create(WORKPLACE_CONNECTOR_SAVED_OBJECT_TYPE, {
          name,
          type,
          config,
          secrets,
          features: featuresToUse,
          createdAt: now,
          updatedAt: now,
        });

        // Create workflows for the connector
        const { workflowId, workflowIds, toolIds } = await createWorkflowsForConnector(
          savedObject.id,
          type,
          featuresToUse,
          savedObjectsClient,
          workflowCreator,
          request,
          logger
        );

        const responseData: WorkplaceConnectorResponse = {
          ...buildConnectorResponse(savedObject),
          workflowId,
          workflowIds,
          toolIds,
        };

        return response.ok({
          body: responseData,
        });
      } catch (error) {
        return response.customError({
          statusCode: 500,
          body: {
            message: `Failed to create connector: ${(error as Error).message}`,
          },
        });
      }
    }
  );

  // Get connector by ID
  router.get(
    {
      path: '/api/workplace_connectors/{id}',
      validate: {
        params: connectorIdSchema,
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
      const { id } = request.params;

      try {
        const savedObjectsClient = coreContext.savedObjects.client;
        const savedObject: SavedObject<WorkplaceConnectorAttributes> = await savedObjectsClient.get(
          WORKPLACE_CONNECTOR_SAVED_OBJECT_TYPE,
          id
        );

        const responseData = buildConnectorResponse(savedObject);

        return response.ok({
          body: responseData,
        });
      } catch (error) {
        if ((error as any).output?.statusCode === 404) {
          return response.notFound({
            body: {
              message: `Connector with ID ${id} not found`,
            },
          });
        }
        return response.customError({
          statusCode: 500,
          body: {
            message: `Failed to get connector: ${(error as Error).message}`,
          },
        });
      }
    }
  );

  // List all connectors
  router.get(
    {
      path: '/api/workplace_connectors',
      validate: {},
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
        const findResult: SavedObjectsFindResponse<WorkplaceConnectorAttributes> =
          await savedObjectsClient.find({
            type: WORKPLACE_CONNECTOR_SAVED_OBJECT_TYPE,
            perPage: 100,
          });

        const connectors: WorkplaceConnectorResponse[] = findResult.saved_objects.map(
          (savedObject) => buildConnectorResponse(savedObject)
        );

        return response.ok({
          body: {
            connectors,
            total: findResult.total,
          },
        });
      } catch (error) {
        return response.customError({
          statusCode: 500,
          body: {
            message: `Failed to list connectors: ${(error as Error).message}`,
          },
        });
      }
    }
  );

  // Update connector
  router.put(
    {
      path: '/api/workplace_connectors/{id}',
      validate: {
        params: connectorIdSchema,
        body: updateConnectorRequestSchema,
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
      const { id } = request.params;
      const updates = request.body as UpdateWorkplaceConnectorRequest;

      try {
        const savedObjectsClient = coreContext.savedObjects.client;
        const now = new Date().toISOString();

        await savedObjectsClient.update(WORKPLACE_CONNECTOR_SAVED_OBJECT_TYPE, id, {
          ...updates,
          updatedAt: now,
        });

        // Fetch the full updated object to get all attributes
        const savedObject: SavedObject<WorkplaceConnectorAttributes> = await savedObjectsClient.get(
          WORKPLACE_CONNECTOR_SAVED_OBJECT_TYPE,
          id
        );

        const responseData = buildConnectorResponse(savedObject);

        return response.ok({
          body: responseData,
        });
      } catch (error) {
        if ((error as any).output?.statusCode === 404) {
          return response.notFound({
            body: {
              message: `Connector with ID ${id} not found`,
            },
          });
        }
        return response.customError({
          statusCode: 500,
          body: {
            message: `Failed to update connector: ${(error as Error).message}`,
          },
        });
      }
    }
  );

  // Delete connector
  router.delete(
    {
      path: '/api/workplace_connectors/{id}',
      validate: {
        params: connectorIdSchema,
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
      const { id } = request.params;

      try {
        const savedObjectsClient = coreContext.savedObjects.client;
        // Cascade delete related workflows/tools (best-effort)
        const workflowIds: string[] = [];
        let toolIds: string[] = [];
        try {
          const existing = await savedObjectsClient.get(WORKPLACE_CONNECTOR_SAVED_OBJECT_TYPE, id);
          const attrs = existing.attributes as unknown as {
            workflowId?: string;
            workflowIds?: string[];
            toolIds?: string[];
          };
          if (attrs.workflowId) workflowIds.push(attrs.workflowId);
          if (attrs.workflowIds?.length) workflowIds.push(...attrs.workflowIds);
          if (attrs.toolIds?.length) toolIds = attrs.toolIds;
        } catch (e) {
          // ignore if not found
        }

        const spaceId = savedObjectsClient.getCurrentNamespace() ?? DEFAULT_NAMESPACE_STRING;
        try {
          if (workflowIds.length > 0 && workflowCreator.deleteWorkflows) {
            await workflowCreator.deleteWorkflows(workflowIds, spaceId, request);
          }
        } catch {
          // ignore
        }
        try {
          if (toolIds.length > 0 && workflowCreator.deleteTools) {
            await workflowCreator.deleteTools(toolIds, request);
          }
        } catch {
          // ignore
        }

        await savedObjectsClient.delete(WORKPLACE_CONNECTOR_SAVED_OBJECT_TYPE, id);

        return response.ok({
          body: {
            success: true,
          },
        });
      } catch (error) {
        if ((error as any).output?.statusCode === 404) {
          return response.notFound({
            body: {
              message: `Connector with ID ${id} not found`,
            },
          });
        }
        return response.customError({
          statusCode: 500,
          body: {
            message: `Failed to delete connector: ${(error as Error).message}`,
          },
        });
      }
    }
  );

  // Delete all connectors
  router.delete(
    {
      path: '/api/workplace_connectors',
      validate: {},
      security: {
        authz: {
          enabled: false,
          reason: 'This is open for now (should be secured)',
        },
      },
    },
    async (context, request, response) => {
      const coreContext = await context.core;

      try {
        const savedObjectsClient = coreContext.savedObjects.client;
        const spaceId = savedObjectsClient.getCurrentNamespace() ?? DEFAULT_NAMESPACE_STRING;

        // Find all connectors
        const findResponse = await savedObjectsClient.find({
          type: WORKPLACE_CONNECTOR_SAVED_OBJECT_TYPE,
          perPage: 1000, // Should be enough for most cases
        });

        const connectors = findResponse.saved_objects;
        const workflowIds: string[] = [];
        const toolIds: string[] = [];

        // Collect all workflow and tool IDs before deletion
        for (const connector of connectors) {
          const attrs = connector.attributes as unknown as {
            workflowId?: string;
            workflowIds?: string[];
            toolIds?: string[];
          };
          if (attrs.workflowId) workflowIds.push(attrs.workflowId);
          if (attrs.workflowIds?.length) workflowIds.push(...attrs.workflowIds);
          if (attrs.toolIds?.length) toolIds.push(...attrs.toolIds);
        }

        // Delete all connectors
        const deletePromises = connectors.map((connector) =>
          savedObjectsClient.delete(WORKPLACE_CONNECTOR_SAVED_OBJECT_TYPE, connector.id)
        );
        await Promise.all(deletePromises);

        // Cascade delete related workflows/tools (best-effort)
        try {
          if (workflowIds.length > 0 && workflowCreator.deleteWorkflows) {
            await workflowCreator.deleteWorkflows(workflowIds, spaceId, request);
          }
        } catch (err) {
          logger.warn(`Failed to delete some workflows: ${(err as Error).message}`);
        }

        try {
          if (toolIds.length > 0 && workflowCreator.deleteTools) {
            await workflowCreator.deleteTools(toolIds, request);
          }
        } catch (err) {
          logger.warn(`Failed to delete some tools: ${(err as Error).message}`);
        }

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

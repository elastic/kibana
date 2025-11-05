/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';
import https from 'https';
import { schema } from '@kbn/config-schema';
import type { IRouter, Logger } from '@kbn/core/server';
import { DEFAULT_NAMESPACE_STRING } from '@kbn/core-saved-objects-utils-server';
import { WORKPLACE_CONNECTOR_SAVED_OBJECT_TYPE } from '../saved_objects';
import type {
  CreateWorkplaceConnectorRequest,
  UpdateWorkplaceConnectorRequest,
  WorkplaceConnectorResponse,
} from '../../common';
import {
  createConnectorRequestSchema,
  updateConnectorRequestSchema,
  connectorIdSchema,
} from './schemas';
import type { WorkflowCreatorService } from '../services/workflow_creator';

export function registerConnectorRoutes(
  router: IRouter,
  workflowCreator: WorkflowCreatorService,
  logger: Logger
) {
  // Initiate Google Drive OAuth
  router.post(
    {
      path: '/api/workplace_connectors/google/initiate',
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
        const now = new Date().toISOString();

        logger.info('HEYYYOOO');

        const savedObject = await savedObjectsClient.create(WORKPLACE_CONNECTOR_SAVED_OBJECT_TYPE, {
          name: 'Google Drive',
          type: 'google_drive',
          config: { status: 'pending_oauth' },
          secrets: {},
          features: ['search_files'],
          createdAt: now,
          updatedAt: now,
        });

        const scope = [
          'email',
          'profile',
          'https://www.googleapis.com/auth/drive.readonly',
          'https://www.googleapis.com/auth/drive.metadata.readonly',
        ];

        const oauthUrl = `https://localhost:8052/oauth/start/google`;
        const authresponse = await axios.post(oauthUrl, {
          scope
        }, {
          httpsAgent: new https.Agent({
            rejectUnauthorized: false
          })
        });

        const googleUrl = authresponse.data['auth_url']
        const requestId = authresponse.data['request_id'];

        logger.info(`Google URL: ${googleUrl}`);

        return response.ok({
          body: {
            connectorId: savedObject.id,
            requestId,
            googleUrl,
          },
        });
      } catch (error) {
        logger.error(`Failed to initiate OAuth: ${error.message}`);
        return response.customError({
          statusCode: 500,
          body: {
            message: `Failed to initiate OAuth: ${error.message}`,
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
          request_id: schema.string(),
          connector_id: schema.string(),
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
      
      try {
        const { request_id, connector_id } = request.query;
        const savedObjectsClient = coreContext.savedObjects.client;

        // Fetch secrets from OAuth service
        const secretsUrl = `https://localhost:8052/oauth/fetch_request_secrets?request_id=${request_id}`;
        const maxRetries = 5;
        const retryDelay = 2000;
        let secretsresponse;
        let access_token: string | undefined;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            secretsresponse = await axios.get(secretsUrl, {
              headers: {
                'Content-Type': 'application/json'
              },
              httpsAgent: new https.Agent({
                rejectUnauthorized: false
              })
            });

            access_token = secretsresponse.data['access_token'];
            
            if (access_token) {
              logger.info(`Access token found on attempt ${attempt}`);
              break;
            }

            if (attempt < maxRetries) {
              logger.info(`No access token found on attempt ${attempt}, retrying...`);
              await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
          } catch (err) {
            if (attempt < maxRetries) {
              logger.warn(`Error fetching secrets on attempt ${attempt}, retrying...`, err);
              await new Promise(resolve => setTimeout(resolve, retryDelay));
            } else {
              throw err;
            }
          }
        }

        if (!access_token) {
          throw new Error('Access token not found after 5 attempts');
        }

        const refresh_token = secretsresponse!.data['refresh_token'];
        const expires_in = secretsresponse!.data['expires_in'];

        logger.info(`Secrets fetched for connector ${connector_id}`);

        logger.info(`Access Token: ${access_token}`);
        logger.info(`Refresh Token: ${refresh_token}`);
        logger.info(`Expires In: ${expires_in}`);

        // Update connector with OAuth tokens
        await savedObjectsClient.update(WORKPLACE_CONNECTOR_SAVED_OBJECT_TYPE, connector_id, {
          secrets: {
            access_token,
            refresh_token: refresh_token || '',
            expires_in: expires_in || '3600',
          },
          config: { status: 'connected' },
          updatedAt: new Date().toISOString(),
        });

        // Create workflows for the connector
        try {
          const spaceId = savedObjectsClient.getCurrentNamespace() ?? DEFAULT_NAMESPACE_STRING;
          const workflowIds: string[] = [];
          const toolIds: string[] = [];

          const features = ['search_files'];
          for (const feature of features) {
            const workflowId = await workflowCreator.createWorkflowForConnector(
              connector_id,
              'google_drive',
              spaceId,
              request,
              feature
            );
            workflowIds.push(workflowId);
            toolIds.push(`google_drive.${feature}`.slice(0, 64));
          }

          await savedObjectsClient.update(WORKPLACE_CONNECTOR_SAVED_OBJECT_TYPE, connector_id, {
            workflowId: workflowIds[0],
            workflowIds,
            toolIds,
          });
        } catch (workflowError) {
          logger.error(`Failed to create workflows: ${workflowError.message}`);
        }

        return response.ok({
          body: {
            success: true,
            connector_id,
          },
        });
      } catch (error) {
        logger.error(`OAuth complete error: ${error.message}`);
        return response.customError({
          statusCode: 500,
          body: {
            message: error.message || 'Failed to complete OAuth',
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

        const savedObject = await savedObjectsClient.create(WORKPLACE_CONNECTOR_SAVED_OBJECT_TYPE, {
          name,
          type,
          config,
          secrets,
          features,
          createdAt: now,
          updatedAt: now,
        });
        let workflowId: string | undefined;
        const workflowIds: string[] = [];
        const toolIds: string[] = [];
        try {
          const spaceId = savedObjectsClient.getCurrentNamespace() ?? DEFAULT_NAMESPACE_STRING;

          const featuresToCreate = features.length > 0 ? features : ['search_web'];
          for (const feature of featuresToCreate) {
            const createdWorkflowId = await workflowCreator.createWorkflowForConnector(
              savedObject.id,
              type,
              spaceId,
              request,
              feature
            );
            workflowIds.push(createdWorkflowId);
            toolIds.push(`${type}.${feature}`.slice(0, 64));
          }
          workflowId = workflowIds[0];
          await savedObjectsClient.update(WORKPLACE_CONNECTOR_SAVED_OBJECT_TYPE, savedObject.id, {
            workflowId,
            workflowIds,
            toolIds,
          });
        } catch (workflowError) {
          logger.error(
            `Failed to create workflow for connector ${savedObject.id}: ${
              (workflowError as Error).message
            }`
          );
        }

        const attrs = savedObject.attributes as unknown as {
          name: string;
          type: string;
          config: Record<string, unknown>;
          features?: string[];
          createdAt: string;
          updatedAt: string;
        };
        const responseData: WorkplaceConnectorResponse = {
          id: savedObject.id,
          name: attrs.name,
          type: attrs.type,
          config: attrs.config,
          createdAt: attrs.createdAt,
          updatedAt: attrs.updatedAt,
          workflowId,
          workflowIds,
          toolIds,
          features: attrs.features,
          hasSecrets: true,
        };

        return response.ok({
          body: responseData,
        });
      } catch (error) {
        return response.customError({
          statusCode: 500,
          body: {
            message: `Failed to create connector: ${error.message}`,
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
        const savedObject = await savedObjectsClient.get(WORKPLACE_CONNECTOR_SAVED_OBJECT_TYPE, id);

        const attrs = savedObject.attributes as unknown as {
          name: string;
          type: string;
          config: Record<string, unknown>;
          createdAt: string;
          updatedAt: string;
          workflowId?: string;
          workflowIds?: string[];
          toolIds?: string[];
          features?: string[];
          secrets?: Record<string, unknown>;
        };

        const responseData: WorkplaceConnectorResponse = {
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

        return response.ok({
          body: responseData,
        });
      } catch (error) {
        if (error.output?.statusCode === 404) {
          return response.notFound({
            body: {
              message: `Connector with ID ${id} not found`,
            },
          });
        }
        return response.customError({
          statusCode: 500,
          body: {
            message: `Failed to get connector: ${error.message}`,
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
        const findResult = await savedObjectsClient.find({
          type: WORKPLACE_CONNECTOR_SAVED_OBJECT_TYPE,
          perPage: 100,
        });

        const connectors: WorkplaceConnectorResponse[] = findResult.saved_objects.map(
          (savedObject) => {
            const attrs = savedObject.attributes as unknown as {
              name: string;
              type: string;
              config: Record<string, unknown>;
              createdAt: string;
              updatedAt: string;
              workflowId?: string;
              workflowIds?: string[];
              toolIds?: string[];
              features?: string[];
              secrets?: Record<string, unknown>;
            };
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
            message: `Failed to list connectors: ${error.message}`,
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

        const savedObject = await savedObjectsClient.update(
          WORKPLACE_CONNECTOR_SAVED_OBJECT_TYPE,
          id,
          {
            ...updates,
            updatedAt: now,
          }
        );

        const attrs = savedObject.attributes as unknown as {
          name: string;
          type: string;
          config: Record<string, unknown>;
          createdAt: string;
          updatedAt: string;
          workflowId?: string;
          secrets?: Record<string, unknown>;
        };

        const responseData: WorkplaceConnectorResponse = {
          id: savedObject.id,
          name: attrs.name,
          type: attrs.type,
          config: attrs.config,
          createdAt: attrs.createdAt,
          updatedAt: attrs.updatedAt,
          workflowId: attrs.workflowId,
          hasSecrets: !!attrs.secrets,
        };

        return response.ok({
          body: responseData,
        });
      } catch (error) {
        if (error.output?.statusCode === 404) {
          return response.notFound({
            body: {
              message: `Connector with ID ${id} not found`,
            },
          });
        }
        return response.customError({
          statusCode: 500,
          body: {
            message: `Failed to update connector: ${error.message}`,
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
        if (error.output?.statusCode === 404) {
          return response.notFound({
            body: {
              message: `Connector with ID ${id} not found`,
            },
          });
        }
        return response.customError({
          statusCode: 500,
          body: {
            message: `Failed to delete connector: ${error.message}`,
          },
        });
      }
    }
  );
}

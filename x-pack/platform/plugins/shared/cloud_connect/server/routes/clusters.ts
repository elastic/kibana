/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter, Logger, StartServicesAccessor } from '@kbn/core/server';
import type { EncryptedSavedObjectsPluginStart } from '@kbn/encrypted-saved-objects-plugin/server';
import axios from 'axios';
import { CloudConnectClient } from '../services/cloud_connect_client';
import { StorageService } from '../services/storage';
import { CLOUD_CONNECT_API_KEY_TYPE } from '../../common/constants';

interface CloudConnectedStartDeps {
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
}

export interface ClustersRouteOptions {
  router: IRouter;
  logger: Logger;
  getStartServices: StartServicesAccessor<CloudConnectedStartDeps, unknown>;
}

export const registerClustersRoute = ({
  router,
  logger,
  getStartServices,
}: ClustersRouteOptions) => {
  // GET /internal/cloud_connect/cluster_details
  router.get(
    {
      path: '/internal/cloud_connect/cluster_details',
      security: {
        authz: {
          enabled: false,
          reason:
            'This route delegates to the Cloud Connect API for authentication and authorization.',
        },
      },
      validate: false,
      options: {
        access: 'internal',
      },
    },
    async (context, request, response) => {
      try {
        // Initialize storage service for retrieving the API key
        const coreContext = await context.core;
        const [, { encryptedSavedObjects }] = await getStartServices();
        const encryptedSavedObjectsClient = encryptedSavedObjects.getClient({
          includedHiddenTypes: [CLOUD_CONNECT_API_KEY_TYPE],
        });
        const savedObjectsClient = coreContext.savedObjects.getClient({
          includedHiddenTypes: [CLOUD_CONNECT_API_KEY_TYPE],
        });
        const storageService = new StorageService({
          encryptedSavedObjectsClient,
          savedObjectsClient,
          logger,
        });

        // Retrieve stored API key
        const apiKeyData = await storageService.getApiKey();

        if (!apiKeyData) {
          logger.warn('No API key found in saved object');
          return response.customError({
            statusCode: 503,
            body: {
              message: 'Failed to retrieve API key from saved object',
            },
          });
        }

        // Fetch cluster details from Cloud Connect API
        const cloudConnectClient = new CloudConnectClient(logger);
        const clusterDetails = await cloudConnectClient.getClusterDetails(
          apiKeyData.apiKey,
          apiKeyData.clusterId
        );

        logger.debug(`Successfully retrieved cluster details: ${clusterDetails.id}`);

        return response.ok({
          body: clusterDetails,
        });
      } catch (error) {
        logger.error('Failed to retrieve cluster details', { error });

        if (axios.isAxiosError(error)) {
          const status = error.response?.status;
          const errorData = error.response?.data;

          if (status === 401) {
            return response.unauthorized({
              body: {
                message: 'Invalid or expired API key',
              },
            });
          }

          if (status === 403) {
            return response.forbidden({
              body: {
                message: 'Insufficient permissions to access cluster details',
              },
            });
          }

          if (status === 404) {
            return response.notFound({
              body: {
                message: 'Cluster not found',
              },
            });
          }

          if (status === 400) {
            return response.badRequest({
              body: {
                message: errorData?.message || 'Invalid request',
              },
            });
          }
        }

        return response.customError({
          statusCode: 500,
          body: {
            message: 'An error occurred while retrieving cluster details',
          },
        });
      }
    }
  );

  // DELETE /internal/cloud_connect/cluster
  router.delete(
    {
      path: '/internal/cloud_connect/cluster',
      security: {
        authz: {
          enabled: false,
          reason: 'This route performs internal cleanup of stored credentials.',
        },
      },
      validate: false,
      options: {
        access: 'internal',
      },
    },
    async (context, request, response) => {
      try {
        // Initialize storage service for deleting the API key
        const coreContext = await context.core;
        const [, { encryptedSavedObjects }] = await getStartServices();
        const encryptedSavedObjectsClient = encryptedSavedObjects.getClient({
          includedHiddenTypes: [CLOUD_CONNECT_API_KEY_TYPE],
        });
        const savedObjectsClient = coreContext.savedObjects.getClient({
          includedHiddenTypes: [CLOUD_CONNECT_API_KEY_TYPE],
        });
        const storageService = new StorageService({
          encryptedSavedObjectsClient,
          savedObjectsClient,
          logger,
        });

        // Delete the stored API key
        await storageService.deleteApiKey();

        logger.info('Cluster disconnected successfully - API key removed');

        return response.ok({
          body: {
            success: true,
            message: 'Cluster disconnected successfully',
          },
        });
      } catch (error) {
        logger.error('Failed to disconnect cluster', { error });

        return response.customError({
          statusCode: 500,
          body: {
            message: 'An error occurred while disconnecting the cluster',
          },
        });
      }
    }
  );

  // PUT /internal/cloud_connect/cluster_details
  router.put(
    {
      path: '/internal/cloud_connect/cluster_details',
      security: {
        authz: {
          enabled: false,
          reason:
            'This route delegates to the Cloud Connect API for authentication and authorization.',
        },
      },
      validate: {
        body: schema.object({
          services: schema.recordOf(
            schema.string(),
            schema.object({
              enabled: schema.boolean(),
            })
          ),
        }),
      },
      options: {
        access: 'internal',
      },
    },
    async (context, request, response) => {
      try {
        // Initialize storage service for retrieving the API key
        const coreContext = await context.core;
        const [, { encryptedSavedObjects }] = await getStartServices();
        const encryptedSavedObjectsClient = encryptedSavedObjects.getClient({
          includedHiddenTypes: [CLOUD_CONNECT_API_KEY_TYPE],
        });
        const savedObjectsClient = coreContext.savedObjects.getClient({
          includedHiddenTypes: [CLOUD_CONNECT_API_KEY_TYPE],
        });
        const storageService = new StorageService({
          encryptedSavedObjectsClient,
          savedObjectsClient,
          logger,
        });

        // Retrieve stored API key
        const apiKeyData = await storageService.getApiKey();

        if (!apiKeyData) {
          logger.warn('No API key found in saved object');
          return response.customError({
            statusCode: 503,
            body: {
              message: 'Failed to retrieve API key from saved object',
            },
          });
        }

        // Update cluster services via Cloud Connect API
        const cloudConnectClient = new CloudConnectClient(logger);
        const updatedCluster = await cloudConnectClient.updateClusterServices(
          apiKeyData.apiKey,
          apiKeyData.clusterId,
          request.body.services
        );

        logger.debug(`Successfully updated cluster services: ${updatedCluster.id}`);

        return response.ok({
          body: updatedCluster,
        });
      } catch (error) {
        logger.error('Failed to update cluster services', { error });
        console.log(JSON.stringify(error, null, 2));

        if (axios.isAxiosError(error)) {
          const status = error.response?.status;
          const errorData = error.response?.data;

          // Extract the actual error message from Cloud API if available
          let errorMessage = 'An error occurred while updating cluster services';
          if (errorData?.errors && Array.isArray(errorData.errors) && errorData.errors.length > 0) {
            errorMessage = errorData.errors[0].message || errorMessage;
          } else if (errorData?.message) {
            errorMessage = errorData.message;
          }

          if (status === 401) {
            return response.unauthorized({
              body: {
                message: 'Invalid or expired API key',
              },
            });
          }

          if (status === 403) {
            return response.forbidden({
              body: {
                message: errorMessage,
              },
            });
          }

          if (status === 404) {
            return response.notFound({
              body: {
                message: 'Cluster not found',
              },
            });
          }

          if (status === 400) {
            return response.badRequest({
              body: {
                message: errorMessage,
              },
            });
          }
        }

        return response.customError({
          statusCode: 500,
          body: {
            message: 'An error occurred while updating cluster services',
          },
        });
      }
    }
  );
};

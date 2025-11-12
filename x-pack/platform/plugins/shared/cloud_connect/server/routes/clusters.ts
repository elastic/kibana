/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
};

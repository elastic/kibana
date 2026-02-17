/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter, Logger } from '@kbn/core/server';
import axios from 'axios';
import type { EncryptedSavedObjectsPluginStart } from '@kbn/encrypted-saved-objects-plugin/server';
import type { StartServicesAccessor } from '@kbn/core/server';
import { API_BASE_PATH } from '../../common/constants';
import { CloudConnectClient } from '../services/cloud_connect_client';
import type { OnboardClusterResponse } from '../types';
import { getCurrentClusterData } from '../lib/cluster_info';
import { createStorageService } from '../lib/create_storage_service';

const bodySchema = schema.object({
  apiKey: schema.string({ minLength: 1 }),
});

interface CloudConnectedStartDeps {
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
}

export interface AuthenticateRouteOptions {
  router: IRouter;
  logger: Logger;
  getStartServices: StartServicesAccessor<CloudConnectedStartDeps, unknown>;
  hasEncryptedSOEnabled: boolean;
  cloudApiUrl: string;
}

export const registerAuthenticateRoute = ({
  router,
  logger,
  getStartServices,
  hasEncryptedSOEnabled,
  cloudApiUrl,
}: AuthenticateRouteOptions) => {
  router.get(
    {
      path: `${API_BASE_PATH}/config`,
      security: {
        authz: {
          enabled: false,
          reason: 'This route returns public configuration information.',
        },
      },
      validate: false,
      options: {
        access: 'internal',
      },
    },
    async (context, request, response) => {
      try {
        const coreContext = await context.core;
        const esClient = coreContext.elasticsearch.client.asCurrentUser;

        // Fetch cluster and license information from Elasticsearch
        const [licenseResponse, clusterResponse] = await Promise.all([
          esClient.license.get(),
          esClient.info(),
        ]);

        return response.ok({
          body: {
            hasEncryptedSOEnabled,
            license: {
              type: licenseResponse.license.type,
              uid: licenseResponse.license.uid,
            },
            cluster: {
              id: clusterResponse.cluster_uuid,
              name: clusterResponse.cluster_name,
              version: clusterResponse.version.number,
            },
          },
        });
      } catch (error) {
        logger.error('Failed to fetch cluster and license information', { error });

        // Return partial data if ES calls fail
        return response.ok({
          body: {
            hasEncryptedSOEnabled,
          },
        });
      }
    }
  );

  router.post(
    {
      path: `${API_BASE_PATH}/authenticate`,
      security: {
        authz: {
          enabled: false,
          reason:
            'This route delegates authentication to the Cloud Connect API and handles authorization there.',
        },
      },
      validate: {
        body: bodySchema,
      },
      options: {
        access: 'internal',
      },
    },
    async (context, request, response) => {
      const { apiKey } = request.body;

      try {
        const cloudConnectClient = new CloudConnectClient(logger, cloudApiUrl);
        const coreContext = await context.core;

        // Initialize storage service for saving the API key
        const storageService = await createStorageService(context, getStartServices, logger);

        // Step 1: Validate the API key scope
        const validationResult = await cloudConnectClient.validateApiKeyScope(apiKey);

        if (!validationResult.hasValidScope) {
          const errorMessage = validationResult.errorMessage || 'Invalid API key';
          logger.warn(`API key validation failed: ${errorMessage}`);
          return response.badRequest({
            body: {
              message: errorMessage,
            },
          });
        }

        // Step 2: Onboard the cluster based on the key type
        let onboardingResponse: OnboardClusterResponse;

        // Cluster-scoped key: use existing key directly
        if (validationResult.isClusterScoped) {
          const clusterDetails = await cloudConnectClient.getClusterDetails(
            apiKey,
            validationResult.clusterId!
          );

          // Use the fetched cluster details to onboard
          const clusterData = {
            self_managed_cluster: clusterDetails.self_managed_cluster,
            license: clusterDetails.license,
          };

          onboardingResponse = await cloudConnectClient.onboardCluster(apiKey, clusterData);

          // Store the API key after successful onboarding
          await storageService.saveApiKey(apiKey, onboardingResponse.id);
        } else {
          // Generate a new cluster-scoped API key
          const esClient = coreContext.elasticsearch.client.asCurrentUser;
          const clusterData = await getCurrentClusterData(esClient);

          // Use cluster details to onboard
          onboardingResponse = await cloudConnectClient.onboardClusterWithKeyGeneration(
            apiKey,
            clusterData
          );

          // Store the generated API key after successful onboarding
          await storageService.saveApiKey(onboardingResponse.key!, onboardingResponse.id);
        }

        logger.info(
          `Cluster onboarded successfully: ${onboardingResponse.id} (org: ${onboardingResponse.metadata.organization_id})`
        );

        return response.ok({
          body: {
            success: true,
            cluster_id: onboardingResponse.id,
            organization_id: onboardingResponse.metadata.organization_id,
            message: 'Cluster authenticated and onboarded successfully',
          },
        });
      } catch (error) {
        logger.error('Failed to authenticate with Cloud Connect', { error });

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
                message:
                  'Terms and Conditions not accepted or no cloud organization found. Please complete the setup in Elastic Cloud.',
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
            message: 'An error occurred while authenticating with Cloud Connect',
          },
        });
      }
    }
  );
};

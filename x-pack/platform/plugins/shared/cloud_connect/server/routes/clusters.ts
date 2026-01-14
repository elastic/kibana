/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter, Logger, StartServicesAccessor } from '@kbn/core/server';
import type { EncryptedSavedObjectsPluginStart } from '@kbn/encrypted-saved-objects-plugin/server';
import { i18n } from '@kbn/i18n';
import axios from 'axios';
import { CloudConnectClient } from '../services/cloud_connect_client';
import { createStorageService } from '../lib/create_storage_service';
import { enableInferenceCCM, disableInferenceCCM } from '../services/inference_ccm';

interface CloudConnectedStartDeps {
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
}

export interface ClustersRouteOptions {
  router: IRouter;
  logger: Logger;
  getStartServices: StartServicesAccessor<CloudConnectedStartDeps, unknown>;
  hasEncryptedSOEnabled: boolean;
  cloudApiUrl: string;
}

export const registerClustersRoute = ({
  router,
  logger,
  getStartServices,
  cloudApiUrl,
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
        const storageService = await createStorageService(context, getStartServices, logger);

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
        const cloudConnectClient = new CloudConnectClient(logger, cloudApiUrl);
        const clusterDetails = await cloudConnectClient.getClusterDetails(
          apiKeyData.apiKey,
          apiKeyData.clusterId
        );

        logger.debug(`Successfully retrieved cluster details: ${clusterDetails.id}`);

        // Fetch subscription state for the organization
        try {
          const subscription = await cloudConnectClient.getOrganizationSubscription(
            apiKeyData.apiKey,
            clusterDetails.metadata.organization_id
          );

          return response.ok({
            body: {
              ...clusterDetails,
              metadata: {
                ...clusterDetails.metadata,
                subscription: subscription.state,
              },
            },
          });
        } catch (subscriptionError) {
          // Log the error but return cluster details without subscription
          logger.warn(
            `Failed to fetch subscription for organization ${clusterDetails.metadata.organization_id}`,
            { error: subscriptionError }
          );

          // Return cluster details without subscription field
          return response.ok({
            body: clusterDetails,
          });
        }
      } catch (error) {
        logger.error('Failed to retrieve cluster details', { error });

        if (axios.isAxiosError(error)) {
          const errorData = error.response?.data;
          const apiStatusCode = error.response?.status;

          // Extract error message from backend response
          const errorMessage =
            errorData?.errors?.[0]?.message ||
            errorData?.message ||
            'Failed to retrieve cluster details';

          // Use 500 for 401 errors to prevent Kibana logout
          // For all other errors, use the status code from the API
          const statusCode = apiStatusCode === 401 ? 500 : apiStatusCode || 500;

          return response.customError({
            statusCode,
            body: {
              message: errorMessage,
            },
          });
        }

        return response.customError({
          statusCode: 500,
          body: {
            message: error,
          },
        });
      }
    }
  );

  router.delete(
    {
      path: '/internal/cloud_connect/cluster',
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
        // Initialize storage service for retrieving and deleting the API key
        const storageService = await createStorageService(context, getStartServices, logger);

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

        // Delete cluster from Cloud Connect API first
        const cloudConnectClient = new CloudConnectClient(logger, cloudApiUrl);
        await cloudConnectClient.deleteCluster(apiKeyData.apiKey, apiKeyData.clusterId);

        logger.debug(`Successfully deleted cluster from Cloud API: ${apiKeyData.clusterId}`);

        // Only delete the saved object after successful Cloud API deletion
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

        if (axios.isAxiosError(error)) {
          const errorData = error.response?.data;

          return response.customError({
            statusCode: 500,
            body: errorData || {
              message: 'An error occurred while disconnecting the cluster',
            },
          });
        }

        return response.customError({
          statusCode: 500,
          body: {
            message: 'An error occurred while disconnecting the cluster',
          },
        });
      }
    }
  );

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
        const coreContext = await context.core;
        const storageService = await createStorageService(context, getStartServices, logger);

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
        const cloudConnectClient = new CloudConnectClient(logger, cloudApiUrl);
        const updatedCluster = await cloudConnectClient.updateCluster(
          apiKeyData.apiKey,
          apiKeyData.clusterId,
          { services: request.body.services }
        );

        logger.debug(`Successfully updated cluster services: ${updatedCluster.id}`);

        // If EIS service is enabled, the response will return a keys.eis string that
        // needs to be stored in ES for inference nodes to use EIS.
        const eisRequest = request.body.services.eis;
        if (eisRequest) {
          const esClient = coreContext.elasticsearch.client.asCurrentUser;
          const eisKey = updatedCluster.keys?.eis;

          // When enabling EIS, it should(TM) always return an eisKey. But in case it
          // doesnt, lets rollback the change and return an error since we wont be able
          // to configure inference CCM without the key.
          if (eisRequest?.enabled && !eisKey) {
            logger.error(
              'EIS was enabled but Cloud API did not return an API key for Cloud Connect inference'
            );

            try {
              await cloudConnectClient.updateCluster(apiKeyData.apiKey, apiKeyData.clusterId, {
                services: {
                  eis: { enabled: false },
                },
              });
              logger.info('Successfully rolled back EIS enablement in Cloud API');
            } catch (rollbackError) {
              logger.error('Failed to rollback Cloud API changes', { error: rollbackError });
            }

            return response.customError({
              statusCode: 500,
              body: {
                message: 'EIS was enabled but Cloud API did not return an API key',
              },
            });
          }

          try {
            if (eisRequest?.enabled) {
              await enableInferenceCCM(esClient, eisKey!, logger);
            } else {
              await disableInferenceCCM(esClient, logger);
            }
          } catch (inferenceError) {
            logger.error('Failed to update Cloud Connect inference settings, rolling back', {
              error: inferenceError,
            });

            // If enabling the inference CCM settings failed, we need to rollback the service state
            const rollbackEnabled = !eisRequest.enabled;
            try {
              await cloudConnectClient.updateCluster(apiKeyData.apiKey, apiKeyData.clusterId, {
                services: {
                  eis: { enabled: rollbackEnabled },
                },
              });
              logger.info(
                `Successfully rolled back EIS to enabled=${rollbackEnabled} in Cloud API`
              );
            } catch (rollbackError) {
              logger.error('Failed to rollback Cloud API changes', { error: rollbackError });
              return response.customError({
                statusCode: 500,
                body: {
                  message:
                    'Failed to update Cloud Connect inference settings and rollback also failed',
                  attributes: {
                    inferenceError: (inferenceError as Error).message,
                    rollbackError: (rollbackError as Error).message,
                  },
                },
              });
            }

            return response.customError({
              statusCode: 500,
              body: {
                message: (inferenceError as Error).message,
              },
            });
          }
        }

        return response.ok({ body: { success: true } });
      } catch (error) {
        logger.error('Failed to update cluster services', { error });

        if (axios.isAxiosError(error)) {
          const errorData = error.response?.data;

          // Extract error code from Cloud Connect API error format
          // API returns: { "errors": [{ "code": "...", "message": "..." }] }
          const errorCode = errorData?.errors?.[0]?.code;

          // Check for specific error codes and return user-friendly messages
          let errorMessage;
          if (errorCode === 'clusters.patch_cluster.invalid_state') {
            errorMessage = i18n.translate('xpack.cloudConnect.clusterUpdate.invalidState', {
              defaultMessage: 'The API is still completing an operation, please try again later',
            });
          } else {
            errorMessage =
              errorData?.errors?.[0]?.message ||
              errorData?.message ||
              'An error occurred while updating cluster services';
          }

          return response.customError({
            statusCode: 500,
            body: {
              message: errorMessage,
              ...(errorCode && { code: errorCode }),
            },
          });
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

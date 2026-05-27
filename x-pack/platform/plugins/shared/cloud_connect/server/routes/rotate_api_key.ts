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
import { getApiKeyData, ApiKeyNotFoundError } from '../lib/create_storage_service';
import { enableInferenceCCM } from '../services/inference_ccm';

interface CloudConnectedStartDeps {
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
}

export interface RotateApiKeyRouteOptions {
  router: IRouter;
  logger: Logger;
  getStartServices: StartServicesAccessor<CloudConnectedStartDeps, unknown>;
  cloudApiUrl: string;
}

export const registerRotateApiKeyRoute = ({
  router,
  logger,
  getStartServices,
  cloudApiUrl,
}: RotateApiKeyRouteOptions) => {
  router.post(
    {
      path: '/internal/cloud_connect/cluster/rotate_api_key',
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
        const { apiKeyData, storageService } = await getApiKeyData(
          context,
          getStartServices,
          logger
        );

        // Call Cloud API to rotate the key
        const cloudConnectClient = new CloudConnectClient(logger, cloudApiUrl);
        const rotateResponse = await cloudConnectClient.rotateClusterApiKey(
          apiKeyData.apiKey,
          apiKeyData.clusterId
        );

        // Save the new API key
        await storageService.saveApiKey(rotateResponse.key, apiKeyData.clusterId);

        logger.info('Cluster API key rotated successfully');

        return response.ok({
          body: {
            success: true,
            message: 'API key rotated successfully',
          },
        });
      } catch (error) {
        logger.error('Failed to rotate cluster API key', { error });

        if (error instanceof ApiKeyNotFoundError) {
          return response.customError({
            statusCode: error.statusCode,
            body: { message: error.message },
          });
        }

        if (axios.isAxiosError(error)) {
          const errorData = error.response?.data;
          const apiStatusCode = error.response?.status;

          const errorMessage =
            errorData?.errors?.[0]?.message || errorData?.message || 'Failed to rotate API key';

          // Use 500 for 401 errors to prevent Kibana logout
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
            message: 'An error occurred while rotating the API key',
          },
        });
      }
    }
  );

  router.post(
    {
      path: '/internal/cloud_connect/cluster/{service_key}/rotate_api_key',
      security: {
        authz: {
          enabled: false,
          reason:
            'This route delegates to the Cloud Connect API for authentication and authorization.',
        },
      },
      validate: {
        params: schema.object({
          // Only EIS is currently supported
          service_key: schema.oneOf([schema.literal('eis')]),
        }),
      },
      options: {
        access: 'internal',
      },
    },
    async (context, request, response) => {
      const { service_key: serviceKey } = request.params;

      try {
        const coreContext = await context.core;
        const { apiKeyData } = await getApiKeyData(context, getStartServices, logger);

        // Call Cloud API to rotate the service key
        const cloudConnectClient = new CloudConnectClient(logger, cloudApiUrl);
        const rotateResponse = await cloudConnectClient.rotateServiceApiKey(
          apiKeyData.apiKey,
          apiKeyData.clusterId,
          serviceKey
        );

        // Update inference CCM with the new key for EIS
        if (serviceKey === 'eis') {
          const esClient = coreContext.elasticsearch.client.asCurrentUser;
          await enableInferenceCCM(esClient, rotateResponse.key, logger);
        }

        logger.info(`Service API key rotated successfully for: ${serviceKey}`);

        return response.ok({
          body: {
            success: true,
            message: 'Service API key rotated successfully',
          },
        });
      } catch (error) {
        logger.error(`Failed to rotate service API key for: ${serviceKey}`, { error });

        if (error instanceof ApiKeyNotFoundError) {
          return response.customError({
            statusCode: error.statusCode,
            body: { message: error.message },
          });
        }

        if (axios.isAxiosError(error)) {
          const errorData = error.response?.data;
          const apiStatusCode = error.response?.status;

          const errorMessage =
            errorData?.errors?.[0]?.message ||
            errorData?.message ||
            'Failed to rotate service API key';

          // Use 500 for 401 errors to prevent Kibana logout
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
            message: 'An error occurred while rotating the service API key',
          },
        });
      }
    }
  );
};

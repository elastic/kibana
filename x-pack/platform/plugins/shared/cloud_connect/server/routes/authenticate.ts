/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter, Logger } from '@kbn/core/server';
import axios from 'axios';
import { CloudConnectClient } from '../services/cloud_connect_client';
import type { OnboardClusterResponse } from '../types';

const bodySchema = schema.object({
  apiKey: schema.string({ minLength: 1 }),
});

export interface AuthenticateRouteOptions {
  router: IRouter;
  logger: Logger;
}

export const registerAuthenticateRoute = ({ router, logger }: AuthenticateRouteOptions) => {
  router.post(
    {
      path: '/internal/cloud_connect/authenticate',
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
        const cloudConnectClient = new CloudConnectClient(logger);

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

        if (validationResult.isHappyPath) {
          // Happy path: Fetch existing cluster details and use them to onboard
          console.log('======= Happy Path: Fetching Cluster Details =======');
          console.log('Cluster ID:', validationResult.clusterId);

          const clusterDetails = await cloudConnectClient.getClusterDetails(
            apiKey,
            validationResult.clusterId!
          );

          console.log('======= Cluster Details Retrieved =======');
          console.log('Cluster Data:', JSON.stringify(clusterDetails, null, 2));

          // Use the fetched cluster details to onboard
          const clusterData = {
            self_managed_cluster: clusterDetails.self_managed_cluster,
            license: clusterDetails.license,
          };

          console.log('======= Onboarding with Retrieved Data =======');
          onboardingResponse = await cloudConnectClient.onboardCluster(apiKey, clusterData);

          // eslint-disable-next-line no-console
          console.log('Final API Key (Happy Path):', apiKey);
        } else {
          // Admin key: Generate a new cluster-scoped API key
          const clusterData = {
            self_managed_cluster: {
              id: 'kibana-cluster-id-2',
              name: 'Self-Managed Cluster',
              version: '8.0.0',
            },
            license: {
              type: 'trial',
              uid: 'temporary-license-uid-6',
            },
          };

          console.log('======= Admin Path: Onboarding with Key Generation =======');
          console.log('Cluster Data:', JSON.stringify(clusterData, null, 2));

          onboardingResponse = await cloudConnectClient.onboardClusterWithKeyGeneration(
            apiKey,
            clusterData
          );

          // eslint-disable-next-line no-console
          console.log('Final API Key (Generated):', onboardingResponse.key);
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

        console.log('%%%%%%%%%%%%%%%%%%%%%%%%');
        console.log('ERROR');
        console.log(JSON.stringify(error.response?.data));

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
                  'Terms and Conditions not accepted or no Cloud Organization found. Please complete the setup in Elastic Cloud.',
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

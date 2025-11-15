/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AxiosInstance } from 'axios';
import axios from 'axios';
import type { Logger } from '@kbn/core/server';
import type {
  CloudConnectUserResponse,
  OnboardClusterRequest,
  OnboardClusterResponse,
  ApiKeyValidationResult,
} from '../types';
import { CLOUD_API_BASE_URL } from '../../common/constants';

export class CloudConnectClient {
  private axiosInstance: AxiosInstance;
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
    this.axiosInstance = axios.create({
      baseURL: CLOUD_API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Validates the API key scope by checking user role assignments
   * Returns whether the key is a "happy path" key (cluster-scoped) or an admin key
   */
  async validateApiKeyScope(apiKey: string): Promise<ApiKeyValidationResult> {
    try {
      this.logger.debug('Validating API key scope');

      const response = await axios.get<CloudConnectUserResponse>(
        `${CLOUD_API_BASE_URL}/saas/user?show_role_assignments=true`,
        {
          headers: {
            Authorization: `apiKey ${apiKey}`,
          },
          timeout: 30000,
        }
      );

      const roleAssignments = response.data.user.role_assignments.cloud_connected_resource;

      if (!roleAssignments || roleAssignments.length === 0) {
        return {
          isHappyPath: false,
          hasValidScope: false,
          errorMessage: 'API key does not have cloud_connected_resource role assignments',
        };
      }

      // Check if this is a "happy path" key (cluster-scoped)
      if (roleAssignments.length === 1) {
        const assignment = roleAssignments[0];
        const isHappyPath =
          assignment.role_id === 'cloud-connected-admin' &&
          assignment.all === false &&
          assignment.resource_ids.length === 1;

        if (isHappyPath) {
          const clusterId = assignment.resource_ids[0];
          this.logger.debug('API key is a happy path key (cluster-scoped)');
          return {
            isHappyPath: true,
            hasValidScope: true,
            clusterId,
          };
        }
      }

      // If we get here, it's an admin key with broader permissions
      this.logger.debug('API key is an admin key with broader permissions');
      return {
        isHappyPath: false,
        hasValidScope: true,
      };
    } catch (error) {
      this.logger.error('Failed to validate API key scope', { error });

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          return {
            isHappyPath: false,
            hasValidScope: false,
            errorMessage: 'Invalid or expired API key',
          };
        }
      }

      return {
        isHappyPath: false,
        hasValidScope: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Gets cluster details for a specific cluster ID
   * Used in the happy path flow to retrieve existing cluster information
   */
  async getClusterDetails(apiKey: string, clusterId: string): Promise<OnboardClusterResponse> {
    try {
      this.logger.debug(`Fetching cluster details for cluster ID: ${clusterId}`);

      const response = await this.axiosInstance.get<OnboardClusterResponse>(
        `/cloud-connected/clusters/${clusterId}`,
        {
          headers: {
            Authorization: `apiKey ${apiKey}`,
          },
        }
      );

      this.logger.debug(`Successfully fetched cluster details for: ${response.data.id}`);

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch cluster details for cluster ID: ${clusterId}`, { error });
      throw error;
    }
  }

  /**
   * Onboards a cluster using the provided API key
   * For happy path keys, this validates the cluster can be onboarded.
   * This means that there is a cloud org, terms of use were accepted, etc.
   */
  async onboardCluster(
    apiKey: string,
    clusterData: OnboardClusterRequest
  ): Promise<OnboardClusterResponse> {
    try {
      this.logger.debug('Onboarding cluster with happy path key');

      const response = await this.axiosInstance.post<OnboardClusterResponse>(
        '/cloud-connected/clusters',
        clusterData,
        {
          headers: {
            Authorization: `apiKey ${apiKey}`,
          },
        }
      );

      this.logger.debug(`Cluster onboarded successfully: ${response.data.id}`);

      return response.data;
    } catch (error) {
      this.logger.error('Failed to onboard cluster', { error });
      throw error;
    }
  }

  /**
   * Onboards a cluster and generates a new cluster-scoped API key
   * This is used when the provided key is an admin key with broader permissions
   */
  async onboardClusterWithKeyGeneration(
    apiKey: string,
    clusterData: OnboardClusterRequest
  ): Promise<OnboardClusterResponse> {
    try {
      this.logger.debug('Onboarding cluster with admin key and generating new API key');

      const response = await this.axiosInstance.post<OnboardClusterResponse>(
        '/cloud-connected/clusters?create_api_key=true',
        clusterData,
        {
          headers: {
            Authorization: `apiKey ${apiKey}`,
          },
        }
      );

      this.logger.debug(
        `Cluster onboarded successfully with new API key generated: ${response.data.id}`
      );

      return response.data;
    } catch (error) {
      this.logger.error('Failed to onboard cluster with key generation', { error });
      throw error;
    }
  }
}

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
  SubscriptionResponse,
  UpdateClusterRequest,
} from '../types';

export class CloudConnectClient {
  private axiosInstance: AxiosInstance;
  private logger: Logger;
  private cloudApiUrl: string;

  constructor(logger: Logger, cloudApiUrl: string) {
    this.logger = logger;
    this.cloudApiUrl = cloudApiUrl;
    this.axiosInstance = axios.create({
      baseURL: cloudApiUrl,
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
        `${this.cloudApiUrl}/saas/user?show_role_assignments=true`,
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
          isClusterScoped: false,
          hasValidScope: false,
          errorMessage: 'API key does not have cloud_connected_resource role assignments',
        };
      }

      // Check if this is a cluster-scoped key
      if (roleAssignments.length === 1) {
        const assignment = roleAssignments[0];
        const isClusterScoped =
          assignment.role_id === 'cloud-connected-admin' &&
          assignment.all === false &&
          assignment.resource_ids.length === 1;

        if (isClusterScoped) {
          const clusterId = assignment.resource_ids[0];
          this.logger.debug('API key is cluster-scoped');
          return {
            isClusterScoped: true,
            hasValidScope: true,
            clusterId,
          };
        }
      }

      // If we get here, it's an admin key with broader permissions
      this.logger.debug('API key is an admin key with broader permissions');
      return {
        isClusterScoped: false,
        hasValidScope: true,
      };
    } catch (error) {
      this.logger.error('Failed to validate API key scope', { error });

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          return {
            isClusterScoped: false,
            hasValidScope: false,
            errorMessage: 'Invalid or expired API key',
          };
        }
      }

      return {
        isClusterScoped: false,
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

  /**
   * Updates cluster configuration, including services and license
   */
  async updateCluster(
    apiKey: string,
    clusterId: string,
    clusterData: Partial<UpdateClusterRequest>
  ): Promise<OnboardClusterResponse> {
    try {
      this.logger.debug(`Updating services for cluster ID: ${clusterId}`);

      const response = await this.axiosInstance.patch<OnboardClusterResponse>(
        `/cloud-connected/clusters/${clusterId}`,
        clusterData,
        {
          headers: {
            Authorization: `apiKey ${apiKey}`,
          },
        }
      );

      this.logger.debug(`Successfully updated services for cluster: ${response.data.id}`);

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to update services for cluster ID: ${clusterId}`, { error });
      throw error;
    }
  }

  /**
   * Deletes a cluster from Cloud Connect
   * This removes the cluster registration from the Cloud API
   */
  async deleteCluster(apiKey: string, clusterId: string): Promise<void> {
    try {
      this.logger.debug(`Deleting cluster from Cloud API: ${clusterId}`);

      await this.axiosInstance.delete(`/cloud-connected/clusters/${clusterId}`, {
        headers: {
          Authorization: `apiKey ${apiKey}`,
        },
      });

      this.logger.debug(`Successfully deleted cluster from Cloud API: ${clusterId}`);
    } catch (error) {
      this.logger.error(`Failed to delete cluster from Cloud API: ${clusterId}`, { error });
      throw error;
    }
  }

  /**
   * Gets subscription information for an organization
   * Returns the subscription state (trial, active, or inactive)
   */
  async getOrganizationSubscription(
    apiKey: string,
    organizationId: string
  ): Promise<SubscriptionResponse> {
    try {
      this.logger.debug(`Fetching subscription for organization ID: ${organizationId}`);

      const response = await this.axiosInstance.get<SubscriptionResponse>(
        `/cloud-connected/organizations/${organizationId}/subscription`,
        {
          headers: {
            Authorization: `apiKey ${apiKey}`,
          },
        }
      );

      this.logger.debug(
        `Successfully fetched subscription for organization: ${organizationId}, state: ${response.data.state}`
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch subscription for organization ID: ${organizationId}`, {
        error,
      });
      throw error;
    }
  }

  /**
   * Rotates the API key for a cluster
   * Returns a new API key that should be stored
   */
  async rotateClusterApiKey(apiKey: string, clusterId: string): Promise<{ key: string }> {
    try {
      this.logger.debug(`Rotating API key for cluster ID: ${clusterId}`);

      const response = await this.axiosInstance.post<{ key: string }>(
        `/cloud-connected/clusters/${clusterId}/apikey/_rotate`,
        {},
        {
          headers: {
            Authorization: `apiKey ${apiKey}`,
          },
        }
      );

      this.logger.debug(`Successfully rotated API key for cluster: ${clusterId}`);

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to rotate API key for cluster ID: ${clusterId}`, { error });
      throw error;
    }
  }

  /**
   * Rotates the API key for a specific service on a cluster
   * Returns a new API key that should be used to configure the service
   */
  async rotateServiceApiKey(
    apiKey: string,
    clusterId: string,
    serviceKey: string
  ): Promise<{ key: string }> {
    try {
      this.logger.debug(`Rotating API key for service ${serviceKey} on cluster ID: ${clusterId}`);

      const response = await this.axiosInstance.post<{ key: string }>(
        `/cloud-connected/clusters/${clusterId}/apikey/${serviceKey}/_rotate`,
        {},
        {
          headers: {
            Authorization: `apiKey ${apiKey}`,
          },
        }
      );

      this.logger.debug(
        `Successfully rotated API key for service ${serviceKey} on cluster: ${clusterId}`
      );

      return response.data;
    } catch (error) {
      this.logger.error(
        `Failed to rotate API key for service ${serviceKey} on cluster ID: ${clusterId}`,
        { error }
      );
      throw error;
    }
  }
}

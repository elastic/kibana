/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout';
import type {
  RoleApiCredentials,
  KibanaRole,
  ElasticsearchRoleDescriptor,
  ApiServicesFixture,
} from '@kbn/scout';
import type { TransformApiService } from '../services/transform_api_service';
import { getTransformApiService } from '../services/transform_api_service';
import { TRANSFORM_USERS } from './constants';

/**
 * Extended RequestAuth fixture with Transform-specific helper methods
 */
export interface TransformRequestAuthFixture {
  /**
   * Get API key for a predefined role
   */
  getApiKey: (role: string) => Promise<RoleApiCredentials>;

  /**
   * Get API key for a custom role
   */
  getApiKeyForCustomRole: (
    role: KibanaRole | ElasticsearchRoleDescriptor
  ) => Promise<RoleApiCredentials>;

  /**
   * Get API credentials for Transform Poweruser role
   * - Full transform management capabilities (create, update, delete)
   * - Access to source and destination indices
   * - Cluster privilege: manage_transform
   */
  loginAsTransformPowerUser: () => Promise<RoleApiCredentials>;

  /**
   * Get API credentials for Transform Viewer User role
   * - Read-only transform capabilities (view, monitor)
   * - Access to source indices only
   * - Cluster privilege: monitor_transform
   */
  loginAsTransformViewerUser: () => Promise<RoleApiCredentials>;

  /**
   * Get API credentials for Transform Unauthorized User role
   * - No transform capabilities
   * - No cluster privileges
   * - Used for testing unauthorized access scenarios
   */
  loginAsTransformUnauthorizedUser: () => Promise<RoleApiCredentials>;
}

/**
 * Extended API Services fixture with Transform-specific service
 */
export interface TransformApiServicesFixture extends ApiServicesFixture {
  transform: TransformApiService;
}

/**
 * Transform API test fixture with extended requestAuth and apiServices
 *
 * This extends the base apiTest with Transform-specific utilities:
 * - requestAuth.loginAsTransformPowerUser(): Get credentials for full transform management
 * - requestAuth.loginAsTransformViewerUser(): Get credentials for read-only transform access
 * - apiServices.transform: Transform API service for setup/teardown operations
 *
 * @example
 * ```typescript
 * import { transformApiTest as apiTest } from '../fixtures';
 *
 * apiTest('should get transforms as admin', async ({ requestAuth, apiClient }) => {
 *   const credentials = await requestAuth.loginAsTransformPowerUser();
 *   const response = await apiClient.get('internal/transform/transforms', {
 *     headers: {
 *       ...COMMON_HEADERS,
 *       ...credentials.apiKeyHeader,
 *     },
 *   });
 *   expect(response.statusCode).toBe(200);
 * });
 * ```
 */
export const transformApiTest = apiTest.extend<{
  requestAuth: TransformRequestAuthFixture;
  apiServices: TransformApiServicesFixture;
}>({
  requestAuth: async ({ requestAuth }, use) => {
    const loginAsTransformPowerUser = async () =>
      requestAuth.getApiKeyForCustomRole(TRANSFORM_USERS.transformPowerUser);

    const loginAsTransformViewerUser = async () =>
      requestAuth.getApiKeyForCustomRole(TRANSFORM_USERS.transformViewerUser);

    const loginAsTransformUnauthorizedUser = async () =>
      requestAuth.getApiKeyForCustomRole(TRANSFORM_USERS.transformUnauthorizedUser);

    const extendedAuth: TransformRequestAuthFixture = {
      ...requestAuth,
      loginAsTransformPowerUser,
      loginAsTransformViewerUser,
      loginAsTransformUnauthorizedUser,
    };
    await use(extendedAuth);
  },

  /**
   * Extended API services with Transform service
   */
  apiServices: async ({ apiServices, kbnClient, esClient }, use) => {
    const extendedApiServices = apiServices as TransformApiServicesFixture;
    extendedApiServices.transform = getTransformApiService(kbnClient, esClient);
    await use(extendedApiServices);
  },
});

export { TRANSFORM_USERS } from './constants';
export { COMMON_API_HEADERS } from './constants';

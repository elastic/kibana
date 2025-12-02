/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout';
import type { ApiKeyCredentials } from '@kbn/scout/src/common/services/custom_role';
import type { TransformApiService } from '../services/transform_api_service';
import { getTransformApiService } from '../services/transform_api_service';
import {
  getTransformPoweruserRoleDescriptor,
  getTransformViewerRoleDescriptor,
  getTransformUnauthorizedRoleDescriptor,
} from '../helpers/transform_users';
import { COMMON_API_HEADERS } from './constants';

/**
 * Extended test context with Transform-specific helpers and cached credentials
 */
export interface TransformTestFixture {
  /**
   * Pre-authenticated credentials for different user roles
   */
  transformCredentials: {
    /** Poweruser with full transform permissions */
    poweruser: ApiKeyCredentials;
    /** Viewer with read-only transform permissions */
    viewer: ApiKeyCredentials;
    /** Unauthorized user with no transform permissions */
    unauthorized: ApiKeyCredentials;
  };

  /**
   * Transform API service for setup/teardown operations
   */
  transformApi: TransformApiService;

  /**
   * Helper method to make authenticated API requests with common headers
   */
  makeTransformRequest: <T = any>(options: {
    method: 'get' | 'post' | 'put' | 'delete';
    path: string;
    role: 'poweruser' | 'viewer' | 'unauthorized';
    body?: any;
  }) => Promise<{ statusCode: number; body: T }>;
}

/**
 * Custom fixture extending apiTest with Transform-specific utilities
 *
 * This fixture provides:
 * - Pre-authenticated credentials for poweruser, viewer, and unauthorized roles
 * - A shared transformApi service instance
 * - Helper method for making authenticated requests
 *
 * @example
 * ```typescript
 * transformApiTest('should get transforms', async ({ makeTransformRequest }) => {
 *   const response = await makeTransformRequest({
 *     method: 'get',
 *     path: 'internal/transform/transforms',
 *     role: 'poweruser',
 *   });
 *   expect(response.statusCode).toBe(200);
 * });
 * ```
 */
export const transformApiTest = apiTest.extend<TransformTestFixture>({
  /**
   * Cached credentials for all transform user roles
   * Fetched once per test to avoid redundant API calls
   */
  transformCredentials: async ({ requestAuth }, use) => {
    const [poweruser, viewer, unauthorized] = await Promise.all([
      requestAuth.getApiKeyForCustomRole(getTransformPoweruserRoleDescriptor()),
      requestAuth.getApiKeyForCustomRole(getTransformViewerRoleDescriptor()),
      requestAuth.getApiKeyForCustomRole(getTransformUnauthorizedRoleDescriptor()),
    ]);

    await use({
      poweruser,
      viewer,
      unauthorized,
    });

    // Credentials are automatically cleaned up by Scout's requestAuth service
  },

  /**
   * Shared Transform API service instance
   * Created once per test for consistent access to transform operations
   */
  transformApi: async ({ kbnClient, esClient }, use) => {
    const transformApi = getTransformApiService(kbnClient, esClient);
    await use(transformApi);
    // No cleanup needed - transformApi is just a collection of helper methods
  },

  /**
   * Helper method to make authenticated Transform API requests
   * Automatically includes common headers and role-based credentials
   */
  makeTransformRequest: async ({ apiClient, transformCredentials }, use) => {
    const makeRequest = async <T = any>(options: {
      method: 'get' | 'post' | 'put' | 'delete';
      path: string;
      role: 'poweruser' | 'viewer' | 'unauthorized';
      body?: any;
    }) => {
      const { method, path, role, body } = options;
      const credentials = transformCredentials[role];

      const response = await apiClient[method](path, {
        headers: {
          ...COMMON_API_HEADERS,
          ...credentials.apiKeyHeader,
        },
        body,
        responseType: 'json',
      });

      return {
        statusCode: response.statusCode,
        body: response.body as T,
      };
    };

    await use(makeRequest);
  },
});

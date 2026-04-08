/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiServicesFixture, RequestAuthFixture, RoleApiCredentials } from '@kbn/scout';
import { apiTest as base } from '@kbn/scout';

import {
  getSpacesSetupApiService,
  type SpacesSetupApiService,
} from '../services/spaces_setup_api_service';

export interface SpacesRequestAuthFixture extends RequestAuthFixture {
  /**
   * Creates an API key with Saved Objects Management privileges across all spaces.
   * This is useful for testing saved object operations with minimal required permissions.
   */
  getSavedObjectsManagementApiKey: () => Promise<RoleApiCredentials>;
}

export interface SpacesApiServicesFixture extends ApiServicesFixture {
  /** Plugin-local helper for space create/delete in test setup and teardown. */
  spaces: SpacesSetupApiService;
}

export interface SpacesApiFixtures {
  requestAuth: SpacesRequestAuthFixture;
  apiServices: SpacesApiServicesFixture;
}

export const apiTest = base.extend<{}, SpacesApiFixtures>({
  requestAuth: [
    async ({ requestAuth }, use) => {
      const getSavedObjectsManagementApiKey = async (): Promise<RoleApiCredentials> => {
        return await requestAuth.getApiKeyForCustomRole({
          elasticsearch: {
            cluster: [],
            indices: [],
          },
          kibana: [
            {
              base: [],
              feature: {
                savedObjectsManagement: ['all'],
              },
              spaces: ['*'],
            },
          ],
        });
      };

      await use({ ...requestAuth, getSavedObjectsManagementApiKey });
    },
    { scope: 'worker' },
  ],

  apiServices: [
    async ({ apiServices, kbnClient, log }, use) => {
      await use({ ...apiServices, spaces: getSpacesSetupApiService(log, kbnClient) });
    },
    { scope: 'worker' },
  ],
});

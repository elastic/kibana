/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestAuthFixture, RoleApiCredentials } from '@kbn/scout';
import { apiTest as base } from '@kbn/scout';

export interface SpacesRequestAuthFixture extends RequestAuthFixture {
  /**
   * Creates an API key with Saved Objects Management privileges across all spaces.
   * This is useful for testing saved object operations with minimal required permissions.
   */
  getSavedObjectsManagementApiKey: () => Promise<RoleApiCredentials>;
}

export interface SpacesApiFixtures {
  requestAuth: SpacesRequestAuthFixture;
}

export const apiTest = base.extend<SpacesApiFixtures>({
  requestAuth: async ({ requestAuth }, use) => {
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
            spaces: ['*'], // Access to all spaces
          },
        ],
      });
    };

    const extendedRequestAuth: SpacesRequestAuthFixture = {
      ...requestAuth,
      getSavedObjectsManagementApiKey,
    };

    await use(extendedRequestAuth);
  },
});

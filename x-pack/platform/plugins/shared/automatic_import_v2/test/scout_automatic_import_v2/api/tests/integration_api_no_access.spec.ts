/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { autoImportApiTest as apiTest, COMMON_API_HEADERS } from '../fixtures';
import { INTEGRATION_API_BASE_PATH, SHARED_INTEGRATION_ID } from '../fixtures/api_test_constants';

apiTest.describe(
  'automatic_import_v2 Integration API (no automatic_import privilege)',
  { tag: tags.stateful.all },
  () => {
    let cookieHeader: Record<string, string>;

    apiTest.beforeAll(async ({ apiServices, samlAuth }) => {
      await apiServices.autoImport.createIntegration(
        SHARED_INTEGRATION_ID,
        'Scout Shared Integration'
      );
      ({ cookieHeader } = await samlAuth.asAutoImportNoAccess());
    });

    apiTest.afterAll(async ({ apiServices }) => {
      await apiServices.autoImport.cleanupIntegrations([SHARED_INTEGRATION_ID]);
    });

    apiTest('GET /integrations: returns 403 for no-access user', async ({ apiClient }) => {
      const response = await apiClient.get(INTEGRATION_API_BASE_PATH, {
        headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(403);
    });

    apiTest('GET /integrations/{id}: returns 403 for no-access user', async ({ apiClient }) => {
      const response = await apiClient.get(
        `${INTEGRATION_API_BASE_PATH}/${SHARED_INTEGRATION_ID}`,
        {
          headers: { ...COMMON_API_HEADERS, ...cookieHeader },
          responseType: 'json',
        }
      );
      expect(response).toHaveStatusCode(403);
    });

    apiTest('PUT /integrations: returns 403 for no-access user', async ({ apiClient }) => {
      const response = await apiClient.put(INTEGRATION_API_BASE_PATH, {
        headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        body: {
          connectorId: 'test-connector-placeholder',
          integrationId: 'scout-noaccess-create-attempt',
          title: 'No Access Create Attempt',
          description: 'Should be denied',
        },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(403);
    });

    apiTest(
      'GET /integrations/{id}/download: returns 403 for no-access user',
      async ({ apiClient }) => {
        const response = await apiClient.get(
          `${INTEGRATION_API_BASE_PATH}/${SHARED_INTEGRATION_ID}/download`,
          {
            headers: { ...COMMON_API_HEADERS, ...cookieHeader },
            responseType: 'json',
          }
        );
        expect(response).toHaveStatusCode(403);
      }
    );
  }
);

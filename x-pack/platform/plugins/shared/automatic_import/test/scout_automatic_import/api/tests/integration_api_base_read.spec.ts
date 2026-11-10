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

/**
 * A role with only the base Kibana `read` privilege and no automatic_import feature entry.
 * The feature follows base privileges, so this user gets the same access as `automatic_import: read`.
 */
apiTest.describe(
  'automatic_import Integration API (base "read" privilege)',
  { tag: tags.stateful.all },
  () => {
    let cookieHeader: Record<string, string>;

    apiTest.beforeAll(async ({ apiServices, samlAuth }) => {
      await apiServices.autoImport.createIntegration(
        SHARED_INTEGRATION_ID,
        'Scout Shared Integration'
      );
      ({ cookieHeader } = await samlAuth.asAutoImportBaseRead());
    });

    apiTest.afterAll(async ({ apiServices }) => {
      await apiServices.autoImport.cleanupIntegrations([SHARED_INTEGRATION_ID]);
    });

    apiTest('GET /integrations: returns 200 for base "read" user', async ({ apiClient }) => {
      const response = await apiClient.get(INTEGRATION_API_BASE_PATH, {
        headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    apiTest(
      'GET /integrations/{id}/download: returns 200 for base "read" user',
      async ({ apiClient }) => {
        const response = await apiClient.get(
          `${INTEGRATION_API_BASE_PATH}/${SHARED_INTEGRATION_ID}/download`,
          {
            headers: { ...COMMON_API_HEADERS, ...cookieHeader },
          }
        );
        expect(response).toHaveStatusCode(200);
        expect(response.headers['content-type']).toContain('application/zip');
      }
    );

    apiTest('PUT /integrations: returns 403 for base "read" user', async ({ apiClient }) => {
      const response = await apiClient.put(INTEGRATION_API_BASE_PATH, {
        headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        body: {},
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(403);
    });

    apiTest(
      'DELETE /integrations/{id}: returns 403 for base "read" user',
      async ({ apiClient }) => {
        const response = await apiClient.delete(
          `${INTEGRATION_API_BASE_PATH}/${SHARED_INTEGRATION_ID}`,
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

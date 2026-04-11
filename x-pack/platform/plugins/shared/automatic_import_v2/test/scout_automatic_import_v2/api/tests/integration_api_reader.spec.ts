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

apiTest.describe('automatic_import_v2 Integration API (reader)', { tag: tags.stateful.all }, () => {
  let cookieHeader: Record<string, string>;

  apiTest.beforeAll(async ({ apiServices, samlAuth }) => {
    await apiServices.autoImport.createIntegration(
      SHARED_INTEGRATION_ID,
      'Scout Shared Integration'
    );
    ({ cookieHeader } = await samlAuth.asAutoImportReader());
  });

  apiTest.afterAll(async ({ apiServices }) => {
    await apiServices.autoImport.cleanupIntegrations([SHARED_INTEGRATION_ID]);
  });

  apiTest('GET /integrations: returns 200 array for reader user', async ({ apiClient }) => {
    const response = await apiClient.get(INTEGRATION_API_BASE_PATH, {
      headers: { ...COMMON_API_HEADERS, ...cookieHeader },
      responseType: 'json',
    });
    expect(response).toHaveStatusCode(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  apiTest(
    'GET /integrations/{id}: returns 200 with correct shape for reader user',
    async ({ apiClient }) => {
      const response = await apiClient.get(
        `${INTEGRATION_API_BASE_PATH}/${SHARED_INTEGRATION_ID}`,
        {
          headers: { ...COMMON_API_HEADERS, ...cookieHeader },
          responseType: 'json',
        }
      );
      expect(response).toHaveStatusCode(200);
      expect(response.body.integrationResponse.integrationId).toBe(SHARED_INTEGRATION_ID);
      expect(typeof response.body.integrationResponse.title).toBe('string');
      expect(Array.isArray(response.body.integrationResponse.dataStreams)).toBe(true);
    }
  );

  apiTest('PUT /integrations: returns 403 for reader user', async ({ apiClient }) => {
    const response = await apiClient.put(INTEGRATION_API_BASE_PATH, {
      headers: { ...COMMON_API_HEADERS, ...cookieHeader },
      body: {
        connectorId: 'test-connector-placeholder',
        integrationId: 'scout-reader-create-attempt',
        title: 'Reader Create Attempt',
        description: 'Should be denied',
      },
      responseType: 'json',
    });
    expect(response).toHaveStatusCode(403);
  });

  apiTest('POST /integrations/{id}/approve: returns 403 for reader user', async ({ apiClient }) => {
    const response = await apiClient.post(
      `${INTEGRATION_API_BASE_PATH}/${SHARED_INTEGRATION_ID}/approve`,
      {
        headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        body: { version: '0.1.0', categories: ['security'] },
        responseType: 'json',
      }
    );
    expect(response).toHaveStatusCode(403);
  });

  apiTest(
    'DELETE /integrations/{id}: returns 403 for reader user',
    async ({ apiClient, apiServices }) => {
      const integrationId = 'scout-delete-reader-test';
      await apiServices.autoImport.createIntegration(integrationId, 'Scout Delete Reader Test');

      try {
        const response = await apiClient.delete(`${INTEGRATION_API_BASE_PATH}/${integrationId}`, {
          headers: { ...COMMON_API_HEADERS, ...cookieHeader },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(403);
      } finally {
        await apiServices.autoImport.cleanupIntegrations([integrationId]);
      }
    }
  );
});

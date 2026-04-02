/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { autoImportApiTest as apiTest, COMMON_API_HEADERS } from '../fixtures';
import {
  INTEGRATION_API_BASE_PATH,
  NON_EXISTENT_INTEGRATION_ID,
  SHARED_INTEGRATION_ID,
} from '../fixtures/api_test_constants';

apiTest.describe(
  'automatic_import_v2 Integration API (manager read)',
  { tag: tags.stateful.all },
  () => {
    let cookieHeader: Record<string, string>;

    apiTest.beforeAll(async ({ apiServices, samlAuth }) => {
      await apiServices.autoImport.createIntegration(
        SHARED_INTEGRATION_ID,
        'Scout Shared Integration'
      );
      ({ cookieHeader } = await samlAuth.asAutoImportManager());
    });

    apiTest.afterAll(async ({ apiServices }) => {
      await apiServices.autoImport.cleanupIntegrations([SHARED_INTEGRATION_ID]);
    });

    apiTest('GET /integrations: returns 200 array for manager user', async ({ apiClient }) => {
      const response = await apiClient.get(INTEGRATION_API_BASE_PATH, {
        headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    apiTest(
      'GET /integrations/{id}: returns 200 with correct shape for manager',
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

    apiTest(
      'GET /integrations/{id}: returns 404 for non-existent integration',
      async ({ apiClient }) => {
        const response = await apiClient.get(
          `${INTEGRATION_API_BASE_PATH}/${NON_EXISTENT_INTEGRATION_ID}`,
          {
            headers: { ...COMMON_API_HEADERS, ...cookieHeader },
            responseType: 'json',
          }
        );
        expect(response).toHaveStatusCode(404);
      }
    );
  }
);

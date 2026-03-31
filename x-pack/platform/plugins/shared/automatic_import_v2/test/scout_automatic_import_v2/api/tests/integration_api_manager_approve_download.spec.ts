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
  scoutApiErrorText,
} from '../fixtures/api_test_constants';

apiTest.describe(
  'automatic_import_v2 Integration API (manager approve & download)',
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

    apiTest(
      'POST /integrations/{id}/approve: returns 500 when integration has no data streams',
      async ({ apiClient }) => {
        // Contract today: server surfaces this as 500 + message. Prefer 4xx if the API is revised.
        const response = await apiClient.post(
          `${INTEGRATION_API_BASE_PATH}/${SHARED_INTEGRATION_ID}/approve`,
          {
            headers: { ...COMMON_API_HEADERS, ...cookieHeader },
            body: { version: '0.1.0', categories: ['security'] },
            responseType: 'json',
          }
        );
        expect(response).toHaveStatusCode(500);
        expect(scoutApiErrorText(response.body)).toContain('no data streams');
      }
    );

    apiTest(
      'POST /integrations/{id}/approve: returns 404 for non-existent integration',
      async ({ apiClient }) => {
        const response = await apiClient.post(
          `${INTEGRATION_API_BASE_PATH}/${NON_EXISTENT_INTEGRATION_ID}/approve`,
          {
            headers: { ...COMMON_API_HEADERS, ...cookieHeader },
            body: { version: '0.1.0', categories: ['security'] },
            responseType: 'json',
          }
        );
        expect(response).toHaveStatusCode(404);
      }
    );

    apiTest(
      'GET /integrations/{id}/download: returns 200 application/zip for manager',
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

    apiTest(
      'GET /integrations/{id}/download: returns 404 for non-existent integration',
      async ({ apiClient }) => {
        const response = await apiClient.get(
          `${INTEGRATION_API_BASE_PATH}/${NON_EXISTENT_INTEGRATION_ID}/download`,
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

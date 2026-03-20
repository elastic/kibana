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
  'automatic_import_v2 Integration API (manager)',
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

    apiTest(
      'PUT /integrations: creates integration without data streams',
      async ({ apiClient, apiServices }) => {
        const integrationId = 'scout-create-minimal';
        const response = await apiClient.put(INTEGRATION_API_BASE_PATH, {
          headers: { ...COMMON_API_HEADERS, ...cookieHeader },
          body: {
            connectorId: 'test-connector-placeholder',
            integrationId,
            title: 'Scout Create Minimal',
            description: 'Minimal integration without data streams',
          },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(200);
        expect(typeof response.body.integration_id).toBe('string');
        expect(response.body.integration_id).toBe(integrationId);
        await apiServices.autoImport.cleanupIntegrations([integrationId]);
      }
    );

    apiTest(
      'PUT /integrations: creates integration with empty data streams array',
      async ({ apiClient, apiServices }) => {
        const integrationId = 'scout-create-empty-ds';
        const response = await apiClient.put(INTEGRATION_API_BASE_PATH, {
          headers: { ...COMMON_API_HEADERS, ...cookieHeader },
          body: {
            connectorId: 'test-connector-placeholder',
            integrationId,
            title: 'Scout Create Empty DS',
            description: 'Integration with empty data streams',
            dataStreams: [],
          },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(200);
        expect(typeof response.body.integration_id).toBe('string');
        await apiServices.autoImport.cleanupIntegrations([integrationId]);
      }
    );

    apiTest('PUT /integrations: returns 400 for missing required fields', async ({ apiClient }) => {
      const response = await apiClient.put(INTEGRATION_API_BASE_PATH, {
        headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        body: {},
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(400);
    });

    apiTest(
      'POST /integrations/{id}/approve: returns 500 when integration has no data streams',
      async ({ apiClient }) => {
        const response = await apiClient.post(
          `${INTEGRATION_API_BASE_PATH}/${SHARED_INTEGRATION_ID}/approve`,
          {
            headers: { ...COMMON_API_HEADERS, ...cookieHeader },
            body: { version: '0.1.0' },
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
            body: { version: '0.1.0' },
            responseType: 'json',
          }
        );
        expect(response).toHaveStatusCode(404);
      }
    );

    apiTest(
      'DELETE /integrations/{id}: returns 200 with result for manager',
      async ({ apiClient, apiServices }) => {
        const integrationId = 'scout-delete-test';
        await apiServices.autoImport.createIntegration(integrationId, 'Scout Delete Test');

        const response = await apiClient.delete(`${INTEGRATION_API_BASE_PATH}/${integrationId}`, {
          headers: { ...COMMON_API_HEADERS, ...cookieHeader },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(200);
        expect(response.body.success).toBe(true);
        expect(typeof response.body.dataStreamsDeleted).toBe('number');
        expect(Array.isArray(response.body.errors)).toBe(true);
      }
    );

    apiTest(
      'DELETE /integrations/{id}: returns 404 for non-existent integration',
      async ({ apiClient }) => {
        const response = await apiClient.delete(
          `${INTEGRATION_API_BASE_PATH}/${NON_EXISTENT_INTEGRATION_ID}`,
          {
            headers: { ...COMMON_API_HEADERS, ...cookieHeader },
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

    apiTest(
      'lifecycle: integration appears in list after creation and is absent after deletion',
      async ({ apiClient, apiServices }) => {
        const integrationId = 'scout-lifecycle-test';

        try {
          const createResponse = await apiClient.put(INTEGRATION_API_BASE_PATH, {
            headers: { ...COMMON_API_HEADERS, ...cookieHeader },
            body: {
              connectorId: 'test-connector-placeholder',
              integrationId,
              title: 'Scout Lifecycle Test',
              description: 'Integration for lifecycle flow test',
            },
            responseType: 'json',
          });
          expect(createResponse).toHaveStatusCode(200);
          expect(createResponse.body.integration_id).toBe(integrationId);

          const listResponse = await apiClient.get(INTEGRATION_API_BASE_PATH, {
            headers: { ...COMMON_API_HEADERS, ...cookieHeader },
            responseType: 'json',
          });
          expect(listResponse).toHaveStatusCode(200);
          const found = (listResponse.body as Array<{ integrationId: string }>).find(
            (i) => i.integrationId === integrationId
          );
          expect(found).toBeDefined();

          const deleteResponse = await apiClient.delete(
            `${INTEGRATION_API_BASE_PATH}/${integrationId}`,
            {
              headers: { ...COMMON_API_HEADERS, ...cookieHeader },
              responseType: 'json',
            }
          );
          expect(deleteResponse).toHaveStatusCode(200);
          expect(deleteResponse.body.success).toBe(true);

          const listAfterDelete = await apiClient.get(INTEGRATION_API_BASE_PATH, {
            headers: { ...COMMON_API_HEADERS, ...cookieHeader },
            responseType: 'json',
          });
          expect(listAfterDelete).toHaveStatusCode(200);
          const stillFound = (listAfterDelete.body as Array<{ integrationId: string }>).find(
            (i) => i.integrationId === integrationId
          );
          expect(stillFound).toBeUndefined();
        } finally {
          await apiServices.autoImport.cleanupIntegrations([integrationId]);
        }
      }
    );
  }
);

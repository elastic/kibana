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
} from '../fixtures/api_test_constants';

apiTest.describe(
  'automatic_import Integration API (manager delete & lifecycle)',
  { tag: tags.stateful.all },
  () => {
    let cookieHeader: Record<string, string>;

    apiTest.beforeAll(async ({ samlAuth }) => {
      ({ cookieHeader } = await samlAuth.asAutoImportManager());
    });

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

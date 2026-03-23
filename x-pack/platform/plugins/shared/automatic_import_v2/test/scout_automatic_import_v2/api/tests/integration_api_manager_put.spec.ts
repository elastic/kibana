/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { autoImportApiTest as apiTest, COMMON_API_HEADERS } from '../fixtures';
import { INTEGRATION_API_BASE_PATH } from '../fixtures/api_test_constants';

apiTest.describe(
  'automatic_import_v2 Integration API (manager create / validation)',
  { tag: tags.stateful.all },
  () => {
    let cookieHeader: Record<string, string>;

    apiTest.beforeAll(async ({ samlAuth }) => {
      ({ cookieHeader } = await samlAuth.asAutoImportManager());
    });

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
  }
);

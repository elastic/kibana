/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RoleApiCredentials, RoleSessionCredentials } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import { apiTest, testData } from '../fixtures';
import { T1_ANALYST_ROLE } from '../fixtures/roles';

/**
 * Tests API enforcement for the t1_analyst role in an investigation guide context.
 * Replaces cypress/e2e/roles/alert_test.cy.ts (API half).
 *
 * The t1_analyst role has `runSavedQueries` but NOT `writeLiveQueries`.
 * Investigation guide queries reference a saved_query_id, so they should succeed.
 * Custom queries (no saved_query_id) should be rejected.
 */
apiTest.describe(
  'Osquery RBAC - alert test (investigation guide)',
  { tag: ['@local-stateful-classic', ...tags.serverless.security.complete] },
  () => {
    let t1Credentials: RoleApiCredentials;
    let adminCredentials: RoleSessionCredentials;
    let savedQueryId: string;
    let savedQuerySoId: string;

    apiTest.beforeAll(async ({ requestAuth, samlAuth, apiClient }) => {
      t1Credentials = await requestAuth.getApiKeyForCustomRole(T1_ANALYST_ROLE);
      adminCredentials = await samlAuth.asInteractiveUser('admin');

      // Create a saved query to simulate investigation guide query
      const createResponse = await apiClient.post(testData.API_PATHS.OSQUERY_SAVED_QUERIES, {
        headers: { ...testData.COMMON_HEADERS, ...adminCredentials.cookieHeader },
        body: testData.getMinimalSavedQuery({
          query: "SELECT * FROM os_version where name='{{host.os.name}}';",
        }),
        responseType: 'json',
      });
      expect(createResponse).toHaveStatusCode(200);
      savedQueryId = createResponse.body.data.id;
      savedQuerySoId = createResponse.body.data.saved_object_id;
    });

    apiTest.afterAll(async ({ apiServices }) => {
      if (savedQuerySoId) {
        await apiServices.osquery.savedQueries.delete(savedQuerySoId);
      }
    });

    apiTest('is not rejected when running an investigation guide query', async ({ apiClient }) => {
      const response = await apiClient.post(testData.API_PATHS.OSQUERY_LIVE_QUERIES, {
        headers: { ...testData.COMMON_HEADERS, ...t1Credentials.apiKeyHeader },
        body: testData.getMinimalLiveQuery({ saved_query_id: savedQueryId }),
        responseType: 'json',
      });

      // Permission check passes — NOT 403. Without enrolled agents the server may return 500
      // (cannot dispatch), but the RBAC boundary is what we're testing.
      expect(response.statusCode).not.toBe(403);
    });

    apiTest('returns 403 when running a custom query', async ({ apiClient }) => {
      const response = await apiClient.post(testData.API_PATHS.OSQUERY_LIVE_QUERIES, {
        headers: { ...testData.COMMON_HEADERS, ...t1Credentials.apiKeyHeader },
        body: testData.getMinimalLiveQuery({
          query: 'select * from processes limit 10;',
        }),
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(403);
    });
  }
);

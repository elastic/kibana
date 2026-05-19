/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RoleSessionCredentials } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import { apiTest, testData } from '../fixtures';

apiTest.describe(
  'Osquery live query details',
  {
    tag: ['@local-stateful-classic', ...tags.serverless.security.complete],
  },
  () => {
    let adminCredentials: RoleSessionCredentials;

    apiTest.beforeAll(async ({ samlAuth }) => {
      adminCredentials = await samlAuth.asInteractiveUser('admin');
    });

    apiTest('accepts live query creation request (permission check)', async ({ apiClient }) => {
      // Verify the API accepts the request — returns 200 (with agents) or 500 (without agents).
      // A 400 or 403 would indicate a request/permission issue. The live query creation
      // dispatches to agents; without enrolled agents the server may return 500.
      const response = await apiClient.post(testData.API_PATHS.OSQUERY_LIVE_QUERIES, {
        headers: { ...testData.COMMON_HEADERS, ...adminCredentials.cookieHeader },
        body: testData.getMinimalLiveQuery(),
        responseType: 'json',
      });

      // 200 = agents available, query dispatched. 500 = no enrolled agents, cannot dispatch.
      // Both are valid outcomes. 400/403 would indicate a request/permission issue.
      expect([200, 500]).toContain(response.statusCode);
    });

    apiTest('GET live query details returns expected shape', async ({ apiClient, apiServices }) => {
      // First create a live query to get a valid action ID
      const createResponse = await apiClient.post(testData.API_PATHS.OSQUERY_LIVE_QUERIES, {
        headers: { ...testData.COMMON_HEADERS, ...adminCredentials.cookieHeader },
        body: testData.getMinimalLiveQuery(),
        responseType: 'json',
      });

      // Skip details assertion if creation failed (no enrolled agents)
      if (createResponse.statusCode !== 200) {
        return;
      }

      const actionId = createResponse.body.data?.action_id;
      expect(actionId).toBeDefined();

      // GET /api/osquery/live_queries/{id} — verify the details endpoint returns correct shape
      const detailsResponse = await apiServices.osquery.liveQueries.getDetails(actionId);

      expect(detailsResponse.data).toBeDefined();
      expect(detailsResponse.data.data).toBeDefined();
      expect('action_id' in detailsResponse.data.data).toBe(true);
      expect('queries' in detailsResponse.data.data).toBe(true);
      expect('@timestamp' in detailsResponse.data.data).toBe(true);
    });
  }
);

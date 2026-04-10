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
    let liveQueryActionId: string;

    apiTest.beforeAll(async ({ samlAuth, apiClient }) => {
      adminCredentials = await samlAuth.asInteractiveUser('admin');

      const createResponse = await apiClient.post(testData.API_PATHS.OSQUERY_LIVE_QUERIES, {
        headers: { ...testData.COMMON_HEADERS, ...adminCredentials.cookieHeader },
        body: testData.getMinimalLiveQuery(),
        responseType: 'json',
      });
      expect(createResponse).toHaveStatusCode(200);
      liveQueryActionId = createResponse.body.data.action_id;
    });

    apiTest('returns 200 with expected response shape', async ({ apiClient }) => {
      const response = await apiClient.get(
        `${testData.API_PATHS.OSQUERY_LIVE_QUERIES}/${liveQueryActionId}`,
        {
          headers: { ...testData.COMMON_HEADERS, ...adminCredentials.cookieHeader },
          responseType: 'json',
        }
      );

      expect(response).toHaveStatusCode(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data).toMatchObject({
        action_id: liveQueryActionId,
        agents: expect.any(Array),
        queries: expect.any(Array),
      });
    });

    apiTest('returns 404 for non-existent query', async ({ apiClient }) => {
      const response = await apiClient.get(
        `${testData.API_PATHS.OSQUERY_LIVE_QUERIES}/non-existent-id`,
        {
          headers: { ...testData.COMMON_HEADERS, ...adminCredentials.cookieHeader },
          responseType: 'json',
        }
      );

      expect(response).toHaveStatusCode(404);
    });
  }
);

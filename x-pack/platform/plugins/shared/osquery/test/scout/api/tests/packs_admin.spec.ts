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

// TODO: run on ECH once PR #258866 makes it to prod
apiTest.describe(
  'Osquery packs - admin',
  {
    tag: ['@local-stateful-classic', ...tags.serverless.security.complete],
  },
  () => {
    let adminCredentials: RoleSessionCredentials;
    const createdPackIds: string[] = [];

    apiTest.beforeAll(async ({ samlAuth }) => {
      // TODO: investigate why this test only passes with cookie-based authentication while similar
      // tests (saved_queries_admin.spec.ts) pass with API key-based authentication
      adminCredentials = await samlAuth.asInteractiveUser('admin');
    });

    apiTest.afterAll(async ({ apiServices }) => {
      for (const packId of createdPackIds) {
        await apiServices.osquery.packs.delete(packId);
      }
    });

    apiTest('includes profile_uid fields on create and find', async ({ apiClient }) => {
      const createResponse = await apiClient.post(testData.API_PATHS.OSQUERY_PACKS, {
        headers: { ...testData.COMMON_HEADERS, ...adminCredentials.cookieHeader },
        body: testData.getMinimalPack(),
        responseType: 'json',
      });
      expect(createResponse).toHaveStatusCode(200);
      expect(createResponse.body.data).toBeDefined();
      createdPackIds.push(createResponse.body.data.saved_object_id);

      expect('created_by_profile_uid' in createResponse.body.data).toBe(true);
      expect('updated_by_profile_uid' in createResponse.body.data).toBe(true);
      expect(createResponse.body.data.created_by).toBeDefined();

      const findResponse = await apiClient.get(
        `${testData.API_PATHS.OSQUERY_PACKS}?search=${createResponse.body.data.name}`,
        {
          headers: { ...testData.COMMON_HEADERS, ...adminCredentials.cookieHeader },
          responseType: 'json',
        }
      );
      expect(findResponse).toHaveStatusCode(200);
      expect(findResponse.body.data).toBeDefined();
      expect('created_by_profile_uid' in findResponse.body.data[0]).toBe(true);
    });
  }
);

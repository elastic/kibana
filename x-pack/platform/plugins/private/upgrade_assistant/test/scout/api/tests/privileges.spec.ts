/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CookieHeader } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, testData } from '../fixtures';
import { getAdminCookieHeader } from '../fixtures/helpers';

// All Upgrade Assistant API tests remain skipped until Kibana has a stable way to test them.
// See https://github.com/elastic/kibana/issues/266002.
apiTest.describe.skip(
  'Upgrade Assistant privileges API',
  { tag: testData.UPGRADE_ASSISTANT_API_TAGS },
  () => {
    let adminCookieHeader: CookieHeader;

    apiTest.beforeAll(async ({ samlAuth }) => {
      adminCookieHeader = await getAdminCookieHeader(samlAuth);
    });

    apiTest('returns all privileges for an admin user', async ({ apiClient }) => {
      const response = await apiClient.get(`${testData.API_BASE_PATH}/privileges`, {
        headers: { ...testData.COMMON_HEADERS, ...adminCookieHeader },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.hasAllPrivileges).toBe(true);
      expect(response.body.missingPrivileges.index).toHaveLength(0);
    });

    apiTest(
      'returns missing index privileges for a user without index privileges',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser(testData.NO_PRIVILEGES_ROLE);
        const response = await apiClient.get(`${testData.API_BASE_PATH}/privileges`, {
          headers: { ...testData.COMMON_HEADERS, ...cookieHeader },
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body.hasAllPrivileges).toBe(false);
        expect(response.body.missingPrivileges.index).toContain(testData.DEPRECATION_LOGS_INDEX);
      }
    );
  }
);

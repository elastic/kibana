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
  'Upgrade Assistant node disk space API',
  { tag: testData.UPGRADE_ASSISTANT_API_TAGS },
  () => {
    let adminCookieHeader: CookieHeader;

    apiTest.beforeAll(async ({ samlAuth }) => {
      adminCookieHeader = await getAdminCookieHeader(samlAuth);
    });

    apiTest('returns an array of nodes', async ({ apiClient }) => {
      const response = await apiClient.get(`${testData.API_BASE_PATH}/node_disk_space`, {
        headers: { ...testData.COMMON_HEADERS, ...adminCookieHeader },
      });

      expect(response).toHaveStatusCode(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  }
);

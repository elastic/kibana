/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { apiTest, testData } from '../fixtures';

// All Upgrade Assistant API tests remain skipped until Kibana has a stable way to test them.
// See https://github.com/elastic/kibana/issues/266002.
apiTest.describe.skip(
  'Upgrade Assistant Elasticsearch deprecations API',
  { tag: testData.UPGRADE_ASSISTANT_API_TAGS },
  () => {
    apiTest('returns forbidden for a user without privileges', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser(testData.NO_PRIVILEGES_ROLE);
      const response = await apiClient.get(`${testData.API_BASE_PATH}/es_deprecations`, {
        headers: { ...testData.COMMON_HEADERS, ...cookieHeader },
      });

      expect(response).toHaveStatusCode(403);
    });
  }
);

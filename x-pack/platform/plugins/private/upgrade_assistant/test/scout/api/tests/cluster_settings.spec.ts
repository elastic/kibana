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
  'Upgrade Assistant cluster settings API',
  { tag: testData.UPGRADE_ASSISTANT_API_TAGS },
  () => {
    let adminCookieHeader: CookieHeader;

    apiTest.beforeAll(async ({ esClient, samlAuth }) => {
      adminCookieHeader = await getAdminCookieHeader(samlAuth);
      await esClient.cluster.putSettings({
        persistent: {
          'cluster.routing.allocation.exclude._tier': 'data_cold',
        },
        transient: {
          'cluster.routing.allocation.include._tier': 'data_hot',
        },
      });
    });

    apiTest('removes cluster settings', async ({ apiClient }) => {
      const response = await apiClient.post(`${testData.API_BASE_PATH}/cluster_settings`, {
        headers: { ...testData.COMMON_HEADERS, ...adminCookieHeader },
        body: {
          settings: testData.CLUSTER_SETTINGS_TO_REMOVE,
        },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.persistent['cluster.routing.allocation.exclude._tier']).toBeUndefined();
      expect(response.body.transient['cluster.routing.allocation.include._tier']).toBeUndefined();
    });
  }
);

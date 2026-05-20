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
  'Upgrade Assistant remote clusters API',
  { tag: testData.UPGRADE_ASSISTANT_API_TAGS },
  () => {
    let adminCookieHeader: CookieHeader;

    apiTest.beforeAll(async ({ esClient, samlAuth }) => {
      adminCookieHeader = await getAdminCookieHeader(samlAuth);
      await esClient.cluster.putSettings({
        persistent: {
          cluster: {
            remote: {
              [testData.TEST_REMOTE_CLUSTER_NAME]: {
                seeds: testData.TEST_REMOTE_CLUSTER_SEEDS,
              },
            },
          },
        },
      });
    });

    apiTest.afterAll(async ({ esClient }) => {
      await esClient.cluster.putSettings({
        persistent: {
          cluster: {
            remote: {
              [testData.TEST_REMOTE_CLUSTER_NAME]: {
                seeds: null,
              },
            },
          },
        },
      });
    });

    apiTest('returns an array of remote clusters', async ({ apiClient }) => {
      const response = await apiClient.get(`${testData.API_BASE_PATH}/remote_clusters`, {
        headers: { ...testData.COMMON_HEADERS, ...adminCookieHeader },
      });

      expect(response).toHaveStatusCode(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);
    });
  }
);

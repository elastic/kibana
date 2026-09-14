/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CookieHeader } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, testData } from '../fixtures';
import {
  createDeprecationLog,
  deleteDeprecationLogs,
  getAdminCookieHeader,
} from '../fixtures/helpers';

// All Upgrade Assistant API tests remain skipped until Kibana has a stable way to test them.
// See https://github.com/elastic/kibana/issues/266002.
// Skipped to enable ES promotion.
apiTest.describe.skip(
  'Upgrade Assistant Elasticsearch deprecation logs API',
  { tag: testData.UPGRADE_ASSISTANT_API_TAGS },
  () => {
    let adminCookieHeader: CookieHeader;

    apiTest.beforeAll(async ({ samlAuth }) => {
      adminCookieHeader = await getAdminCookieHeader(samlAuth);
    });

    apiTest('filters out deprecations from Elastic products', async ({ apiClient, esClient }) => {
      const docIds = [`scout-deprecation-${Date.now()}-1`, `scout-deprecation-${Date.now()}-2`];

      await createDeprecationLog(esClient, docIds[0]);
      await createDeprecationLog(esClient, docIds[1], true);

      const allDeprecations = (
        await esClient.search<Record<string, string | undefined>>({
          index: testData.DEPRECATION_LOGS_INDEX,
          size: 10000,
        })
      ).hits.hits;

      const nonElasticProductDeprecations = allDeprecations.filter(
        (deprecation) =>
          !testData.APPS_WITH_DEPRECATION_LOGS.includes(
            deprecation._source?.[testData.DEPRECATION_LOGS_ORIGIN_FIELD] ?? ''
          )
      );

      const response = await apiClient.get(
        `${testData.API_BASE_PATH}/deprecation_logging/count?from=${testData.DEPRECATION_LOG_CHECKPOINT}`,
        {
          headers: { ...testData.COMMON_HEADERS, ...adminCookieHeader },
        }
      );

      expect(response).toHaveStatusCode(200);
      expect(nonElasticProductDeprecations.length).toBeLessThan(allDeprecations.length);
      expect(response.body.count).toBe(nonElasticProductDeprecations.length);

      await deleteDeprecationLogs(esClient, docIds);
    });
  }
);

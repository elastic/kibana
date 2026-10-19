/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RoleApiCredentials } from '@kbn/scout';
import { apiTest } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { COMMON_HEADERS, SEARCH_PROFILER_API_TAGS } from '../fixtures/constants';

const INDEX_NAME = 'search_profiler_scout_has_indices_index';

apiTest.describe(
  'GET api/searchprofiler/has_indices',
  {
    tag: SEARCH_PROFILER_API_TAGS,
  },
  () => {
    let adminApiCredentials: RoleApiCredentials;

    apiTest.beforeAll(async ({ esClient, requestAuth }) => {
      adminApiCredentials = await requestAuth.getApiKey('admin');
      // The route reports whether any index exists in the cluster; create one so
      // the expectation doesn't depend on indices leaked by unrelated suites.
      await esClient.indices.delete({ index: INDEX_NAME }, { ignore: [404] });
      await esClient.indices.create({ index: INDEX_NAME });
    });

    apiTest.afterAll(async ({ esClient }) => {
      await esClient.indices.delete({ index: INDEX_NAME }, { ignore: [404] });
    });

    apiTest('reports that the cluster has indices', async ({ apiClient }) => {
      const response = await apiClient.get('api/searchprofiler/has_indices', {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({ hasIndices: true });
    });
  }
);

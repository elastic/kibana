/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RoleApiCredentials } from '@kbn/scout';
import { apiTest } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { COMMON_HEADERS, SEARCH_PROFILER_API_TAGS, SIMPLE_QUERY } from '../fixtures/constants';

const INDEX_NAME = 'search_profiler_scout_api_index';

apiTest.describe(
  'POST api/searchprofiler/profile',
  {
    tag: SEARCH_PROFILER_API_TAGS,
  },
  () => {
    let adminApiCredentials: RoleApiCredentials;

    apiTest.beforeAll(async ({ esClient, requestAuth }) => {
      adminApiCredentials = await requestAuth.getApiKey('admin');
      await esClient.indices.create({
        index: INDEX_NAME,
        mappings: {
          properties: {
            message: { type: 'text' },
          },
        },
      });
      await esClient.index({
        index: INDEX_NAME,
        document: {
          message: 'hello scout',
        },
        refresh: true,
      });
    });

    apiTest.afterAll(async ({ esClient }) => {
      await esClient.indices.delete({ index: INDEX_NAME }).catch(() => {});
    });

    apiTest('profiles a valid query', async ({ apiClient }) => {
      const response = await apiClient.post('api/searchprofiler/profile', {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: JSON.stringify({
          index: INDEX_NAME,
          query: SIMPLE_QUERY,
        }),
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.resp.profile.shards.length).toBeGreaterThan(0);
    });

    apiTest('returns an error for an invalid index', async ({ apiClient }) => {
      const response = await apiClient.post('api/searchprofiler/profile', {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: JSON.stringify({
          index: 'search_profiler_scout_missing_index',
          query: SIMPLE_QUERY,
        }),
      });

      expect(response).toHaveStatusCode(404);
      expect(response.body.error).toBe('Not Found');
    });
  }
);

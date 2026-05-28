/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RoleApiCredentials } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, testData } from '../fixtures';

apiTest.describe(
  'GET /api/watcher/indices/index_patterns',
  { tag: testData.WATCHER_API_TAGS },
  () => {
    let credentials: RoleApiCredentials;
    let dataViewId: string;

    apiTest.beforeAll(async ({ requestAuth, apiClient }) => {
      credentials = await requestAuth.getApiKeyForCustomRole(testData.WATCHER_API_ROLE);

      // Create a data view so the route has something to return.
      const response = await apiClient.post(testData.API_PATHS.DATA_VIEWS, {
        headers: { ...testData.COMMON_HEADERS, ...credentials.apiKeyHeader },
        body: {
          data_view: {
            title: testData.DATA_VIEW_TITLE,
            timeFieldName: testData.DATA_VIEW_TIME_FIELD,
          },
        },
      });
      dataViewId = response.body.data_view.id;
    });

    apiTest.afterAll(async ({ apiClient }) => {
      if (dataViewId) {
        await apiClient.delete(testData.API_PATHS.DATA_VIEW_BY_ID(dataViewId), {
          headers: { ...testData.COMMON_HEADERS, ...credentials.apiKeyHeader },
        });
      }
    });

    apiTest('returns a list that includes the created data view title', async ({ apiClient }) => {
      const response = await apiClient.get(testData.API_PATHS.INDEX_PATTERNS, {
        headers: { ...testData.COMMON_HEADERS, ...credentials.apiKeyHeader },
      });

      expect(response).toHaveStatusCode(200);
      // Body is a flat string array of index-pattern titles.
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toContain(testData.DATA_VIEW_TITLE);
    });
  }
);

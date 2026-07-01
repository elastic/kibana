/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, testData } from '../fixtures';

apiTest.describe('GET /api/watcher/indices/index_patterns', { tag: tags.stateful.classic }, () => {
  let credentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth, apiServices }) => {
    credentials = await requestAuth.getApiKeyForCustomRole(testData.WATCHER_API_ROLE);
    // Use admin-level apiServices to create the fixture data view.
    // override: true handles leftovers from previously interrupted test runs.
    await apiServices.dataViews.create({ title: testData.DATA_VIEW_TITLE, override: true });
  });

  apiTest.afterAll(async ({ apiServices }) => {
    await apiServices.dataViews.deleteByTitle(testData.DATA_VIEW_TITLE);
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
});

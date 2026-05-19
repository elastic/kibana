/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

apiTest.describe('Search Profiler has indices API', { tag: tags.stateful.classic }, () => {
  apiTest('returns whether indices exist', async ({ apiClient, requestAuth }) => {
    const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();
    const response = await apiClient.get('/api/searchprofiler/has_indices', {
      headers: apiKeyHeader,
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body).toStrictEqual({ hasIndices: true });
  });
});

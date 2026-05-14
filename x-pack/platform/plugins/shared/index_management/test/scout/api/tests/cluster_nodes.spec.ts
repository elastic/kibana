/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import { apiTest, createHeaders, indexManagementApi } from '../fixtures';

apiTest.describe('Index Management cluster nodes API', { tag: tags.stateful.classic }, () => {
  apiTest('fetches node plugins', async ({ apiClient, requestAuth }) => {
    const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();
    const response = await indexManagementApi(
      apiClient,
      createHeaders(apiKeyHeader)
    ).clusterNodes.getPlugins();

    expect(response).toHaveStatusCode(200);
    expect(Array.isArray(response.body)).toBe(true);
  });
});

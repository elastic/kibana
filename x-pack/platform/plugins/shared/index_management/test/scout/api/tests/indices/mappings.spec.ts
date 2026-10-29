/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import type { RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, testData } from '../../fixtures';

const { API_BASE_PATH, COMMON_HEADERS } = testData;

const INDEX_NAME = 'index-management-api-mappings';

const MAPPINGS: MappingTypeMapping = {
  properties: {
    total: { type: 'long' },
    tag: { type: 'keyword' },
    createdAt: { type: 'date' },
  },
};

apiTest.describe('Index mappings API', { tag: tags.deploymentAgnostic }, () => {
  let credentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth }) => {
    credentials = await requestAuth.getApiKey('admin');
  });

  apiTest.beforeEach(async ({ esClient }) => {
    await esClient.indices.delete({ index: INDEX_NAME }, { ignore: [404] });
    await esClient.indices.create({ index: INDEX_NAME, mappings: MAPPINGS });
  });

  apiTest.afterEach(async ({ esClient }) => {
    await esClient.indices.delete({ index: INDEX_NAME }, { ignore: [404] });
  });

  apiTest('gets the index mappings', async ({ apiClient }) => {
    const response = await apiClient.get(`${API_BASE_PATH}/mapping/${INDEX_NAME}`, {
      headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.mappings).toStrictEqual(MAPPINGS);
  });

  apiTest('updates the index mappings', async ({ apiClient }) => {
    const updateResponse = await apiClient.put(`${API_BASE_PATH}/mapping/${INDEX_NAME}`, {
      headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
      responseType: 'json',
      body: JSON.stringify({ name: { type: 'text' } }),
    });
    expect(updateResponse).toHaveStatusCode(200);

    const response = await apiClient.get(`${API_BASE_PATH}/mapping/${INDEX_NAME}`, {
      headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
      responseType: 'json',
    });
    expect(response).toHaveStatusCode(200);
    expect(response.body.mappings).toStrictEqual({
      ...MAPPINGS,
      properties: { ...MAPPINGS.properties, name: { type: 'text' } },
    });
  });
});

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

const { API_BASE_PATH, COMMON_HEADERS } = testData;

const INDEX_NAME = 'index-management-disabled-enrichers-index';

// With rollup/ccr/ilm UIs disabled at boot, their data enrichers don't run either.
const EXPECTED_KEYS = [
  'aliases',
  'documents',
  'documents_deleted',
  'health',
  'hidden',
  'isFrozen',
  'name',
  'primary',
  'primary_size',
  'replica',
  'size',
  'status',
  'uuid',
].sort();

apiTest.describe('Indices API with disabled data enrichers', { tag: tags.stateful.classic }, () => {
  let credentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth }) => {
    credentials = await requestAuth.getApiKey('admin');
  });

  apiTest.beforeEach(async ({ esClient }) => {
    await esClient.indices.delete({ index: INDEX_NAME }, { ignore: [404] });
    await esClient.indices.create({ index: INDEX_NAME });
  });

  apiTest.afterEach(async ({ esClient }) => {
    await esClient.indices.delete({ index: INDEX_NAME }, { ignore: [404] });
  });

  apiTest("doesn't send ILM, CCR and Rollups requests", async ({ apiClient }) => {
    const response = await apiClient.get(`${API_BASE_PATH}/indices`, {
      headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    const index = (response.body as Array<{ name: string }>).find(
      ({ name }) => name === INDEX_NAME
    );
    expect(Object.keys(index ?? {}).sort()).toStrictEqual(EXPECTED_KEYS);
  });
});

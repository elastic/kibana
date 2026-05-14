/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import {
  apiTest,
  createHeaders,
  createIndex,
  deleteIndices,
  indexManagementApi,
  testData,
  uniqueName,
} from '../fixtures';

apiTest.describe('Index Management index details API', { tag: tags.stateful.classic }, () => {
  let indexName: string;

  apiTest.beforeAll(async ({ esClient }) => {
    indexName = await createIndex({ esClient, index: uniqueName('im-details') });
  });

  apiTest.afterAll(async ({ esClient, log }) => {
    await deleteIndices(esClient, [indexName], log);
  });

  apiTest('returns index details', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
    const response = await indexManagementApi(
      apiClient,
      createHeaders(cookieHeader)
    ).indices.getDetails(indexName);

    expect(response).toHaveStatusCode(200);
    expect(Object.keys(response.body).sort()).toStrictEqual(testData.SORTED_EXPECTED_INDEX_KEYS);
  });

  apiTest('returns 404 when index does not exist', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
    const response = await indexManagementApi(
      apiClient,
      createHeaders(cookieHeader)
    ).indices.getDetails(uniqueName('missing-index'));

    expect(response).toHaveStatusCode(404);
  });
});

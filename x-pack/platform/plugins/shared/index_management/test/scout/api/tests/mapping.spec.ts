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
  uniqueName,
} from '../fixtures';

apiTest.describe('Index Management mappings API', { tag: tags.stateful.classic }, () => {
  const mappings = {
    properties: {
      total: { type: 'long' },
      tag: { type: 'keyword' },
      createdAt: { type: 'date' },
    },
  } as const;

  let indexName: string;

  apiTest.beforeAll(async ({ esClient }) => {
    indexName = await createIndex({
      esClient,
      index: uniqueName('im-mapping'),
      mappings,
    });
  });

  apiTest.afterAll(async ({ esClient, log }) => {
    await deleteIndices(esClient, [indexName], log);
  });

  apiTest('gets index mappings', async ({ apiClient, requestAuth }) => {
    const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();
    const response = await indexManagementApi(apiClient, createHeaders(apiKeyHeader)).mappings.get(
      indexName
    );

    expect(response).toHaveStatusCode(200);
    expect(response.body.mappings).toStrictEqual(mappings);
  });

  apiTest('updates index mappings', async ({ apiClient, requestAuth }) => {
    const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();
    const api = indexManagementApi(apiClient, createHeaders(apiKeyHeader));

    const updateResponse = await api.mappings.update(indexName, { name: { type: 'text' } });
    expect(updateResponse).toHaveStatusCode(200);

    const getResponse = await api.mappings.get(indexName);
    expect(getResponse).toHaveStatusCode(200);
    expect(getResponse.body.mappings).toStrictEqual({
      ...mappings,
      properties: { ...mappings.properties, name: { type: 'text' } },
    });
  });
});

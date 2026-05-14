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
} from '../../../scout/api/fixtures';

apiTest.describe(
  'Index Management indices API without data enrichers',
  { tag: tags.stateful.classic },
  () => {
    let indexName: string;

    apiTest.beforeAll(async ({ esClient }) => {
      indexName = await createIndex({ esClient, index: uniqueName('im-disabled-enrichers') });
    });

    apiTest.afterAll(async ({ esClient, log }) => {
      await deleteIndices(esClient, [indexName], log);
    });

    apiTest(
      "doesn't return ILM, CCR, or Rollup enricher fields",
      async ({ apiClient, requestAuth }) => {
        const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();
        const response = await indexManagementApi(
          apiClient,
          createHeaders(apiKeyHeader)
        ).indices.list();

        expect(response).toHaveStatusCode(200);
        const index = response.body.find(({ name }: { name: string }) => name === indexName);
        const expectedKeys = testData.SORTED_EXPECTED_INDEX_KEYS.filter(
          (key) => !['isFollowerIndex', 'ilm', 'isRollupIndex'].includes(key)
        );

        expect(Object.keys(index).sort()).toStrictEqual(expectedKeys);
      }
    );
  }
);

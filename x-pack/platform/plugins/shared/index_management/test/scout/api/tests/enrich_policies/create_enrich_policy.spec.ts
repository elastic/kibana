/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, deleteIndices, testData } from '../../fixtures';

const { INTERNAL_API_BASE_PATH, COMMON_HEADERS } = testData;

const INDEX_PREFIX = 'index-management-api-create-enrich-source';
const INDEX_A_NAME = `${INDEX_PREFIX}-a`;
const INDEX_B_NAME = `${INDEX_PREFIX}-b`;

const DATA_STREAM_PREFIX = 'index-management-api-enrich-ds';
const DATA_STREAM_TEMPLATE = `${DATA_STREAM_PREFIX}-template`;
const DATA_STREAM_A_NAME = `${DATA_STREAM_PREFIX}-a`;
const DATA_STREAM_B_NAME = `${DATA_STREAM_PREFIX}-b`;

const POLICY_NAME = 'index-management-api-created-enrich-policy';

apiTest.describe('Create enrich policy API', { tag: tags.deploymentAgnostic }, () => {
  let credentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth, esClient }) => {
    credentials = await requestAuth.getApiKey('admin');

    await esClient.indices.create({
      index: INDEX_A_NAME,
      mappings: { properties: { email: { type: 'text' }, firstName: { type: 'text' } } },
    });
    await esClient.indices.create({
      index: INDEX_B_NAME,
      mappings: { properties: { email: { type: 'text' }, age: { type: 'long' } } },
    });

    await esClient.indices.putIndexTemplate({
      name: DATA_STREAM_TEMPLATE,
      index_patterns: [`${DATA_STREAM_PREFIX}-*`],
      data_stream: {},
    });
    await esClient.indices.createDataStream({ name: DATA_STREAM_A_NAME });
    await esClient.indices.createDataStream({ name: DATA_STREAM_B_NAME });
  });

  apiTest.afterAll(async ({ esClient }) => {
    await esClient.enrich.deletePolicy({ name: POLICY_NAME }, { ignore: [404] });
    await deleteIndices(esClient, `${INDEX_PREFIX}*`);
    for (const name of [DATA_STREAM_A_NAME, DATA_STREAM_B_NAME]) {
      await esClient.indices.deleteDataStream({ name }, { ignore: [404] });
    }
    await esClient.indices.deleteIndexTemplate({ name: DATA_STREAM_TEMPLATE }, { ignore: [404] });
  });

  apiTest('allows to create an enrich policy', async ({ apiClient }) => {
    const response = await apiClient.post(`${INTERNAL_API_BASE_PATH}/enrich_policies`, {
      headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
      responseType: 'json',
      body: JSON.stringify({
        policy: {
          name: POLICY_NAME,
          type: 'match',
          matchField: 'email',
          enrichFields: ['firstName'],
          sourceIndices: [INDEX_A_NAME],
        },
      }),
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body).toStrictEqual({ acknowledged: true });
  });

  apiTest('can retrieve fields from indices', async ({ apiClient }) => {
    const response = await apiClient.post(
      `${INTERNAL_API_BASE_PATH}/enrich_policies/get_fields_from_indices`,
      {
        headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
        responseType: 'json',
        body: JSON.stringify({
          indices: [INDEX_A_NAME, INDEX_B_NAME, DATA_STREAM_A_NAME, DATA_STREAM_B_NAME],
        }),
      }
    );

    expect(response).toHaveStatusCode(200);
    expect(response.body).toStrictEqual({
      commonFields: [
        { name: 'email', type: 'text', normalizedType: 'text' },
        { name: '@timestamp', type: 'date', normalizedType: 'date' },
      ],
      indices: [
        {
          index: INDEX_A_NAME,
          fields: [
            { name: 'email', type: 'text', normalizedType: 'text' },
            { name: 'firstName', type: 'text', normalizedType: 'text' },
          ],
        },
        {
          index: INDEX_B_NAME,
          fields: [
            { name: 'age', type: 'long', normalizedType: 'number' },
            { name: 'email', type: 'text', normalizedType: 'text' },
          ],
        },
        {
          index: DATA_STREAM_A_NAME,
          fields: [{ name: '@timestamp', type: 'date', normalizedType: 'date' }],
        },
        {
          index: DATA_STREAM_B_NAME,
          fields: [{ name: '@timestamp', type: 'date', normalizedType: 'date' }],
        },
      ],
    });
  });

  apiTest('can retrieve matching indices', async ({ apiClient }) => {
    const response = await apiClient.post(
      `${INTERNAL_API_BASE_PATH}/enrich_policies/get_matching_indices`,
      {
        headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
        responseType: 'json',
        body: JSON.stringify({ pattern: INDEX_PREFIX }),
      }
    );

    expect(response).toHaveStatusCode(200);
    expect([...response.body.indices].sort()).toStrictEqual([INDEX_A_NAME, INDEX_B_NAME]);
  });

  apiTest('can retrieve matching data streams', async ({ apiClient }) => {
    const response = await apiClient.post(
      `${INTERNAL_API_BASE_PATH}/enrich_policies/get_matching_data_streams`,
      {
        headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
        responseType: 'json',
        body: JSON.stringify({ pattern: DATA_STREAM_PREFIX }),
      }
    );

    expect(response).toHaveStatusCode(200);
    expect([...response.body.dataStreams].sort()).toStrictEqual([
      DATA_STREAM_A_NAME,
      DATA_STREAM_B_NAME,
    ]);
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, deleteIndices, forDeployment, testData } from '../../fixtures';

const { API_BASE_PATH, INTERNAL_API_BASE_PATH, COMMON_HEADERS } = testData;

const INDEX_PREFIX = 'index-management-api-indices';
const INDEX_NAME = `${INDEX_PREFIX}-main`;
const OTHER_INDEX_NAME = `${INDEX_PREFIX}-other`;
const CREATED_INDEX_NAME = `${INDEX_PREFIX}-created`;

// Serverless reports the metering shape instead of shard stats and data enrichers.
const EXPECTED_KEYS = [
  'aliases',
  'documents',
  'documents_deleted',
  'health',
  'hidden',
  'isFollowerIndex', // data enricher
  'isFrozen',
  'isRollupIndex', // data enricher
  'ilm', // data enricher
  'name',
  'primary',
  'primary_size',
  'replica',
  'size',
  'status',
  'uuid',
].sort();

const EXPECTED_KEYS_SERVERLESS = [
  'aliases',
  'documents',
  'hidden',
  'isFrozen',
  'name',
  'size',
].sort();

apiTest.describe('Indices API', { tag: tags.deploymentAgnostic }, () => {
  let credentials: RoleApiCredentials;
  let expectedKeys: string[];

  apiTest.beforeAll(async ({ requestAuth, config }) => {
    credentials = await requestAuth.getApiKey('admin');
    expectedKeys = forDeployment(config, {
      stateful: EXPECTED_KEYS,
      serverless: EXPECTED_KEYS_SERVERLESS,
    });
  });

  apiTest.beforeEach(async ({ esClient }) => {
    await deleteIndices(esClient, `${INDEX_PREFIX}*`);
    await esClient.indices.create({ index: INDEX_NAME });
  });

  apiTest.afterEach(async ({ esClient }) => {
    await deleteIndices(esClient, `${INDEX_PREFIX}*`);
  });

  apiTest('lists the indices with the expected properties', async ({ apiClient }) => {
    const response = await apiClient.get(`${API_BASE_PATH}/indices`, {
      headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    // The cluster is shared, so assert on this suite's index instead of the whole list.
    const index = (response.body as Array<{ name: string }>).find(
      ({ name }) => name === INDEX_NAME
    );
    expect(Object.keys(index ?? {}).sort()).toStrictEqual(expectedKeys);
  });

  apiTest('reloads the indices with the expected properties', async ({ apiClient, esClient }) => {
    await esClient.indices.create({ index: OTHER_INDEX_NAME });

    const response = await apiClient.post(`${API_BASE_PATH}/indices/reload`, {
      headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
      responseType: 'json',
      body: JSON.stringify({}),
    });

    expect(response).toHaveStatusCode(200);
    const index = (response.body as Array<{ name: string }>).find(
      ({ name }) => name === INDEX_NAME
    );
    expect(Object.keys(index ?? {}).sort()).toStrictEqual(expectedKeys);
    expect(response.body.length).toBeGreaterThan(1);
  });

  apiTest('reloads only the requested indices', async ({ apiClient, esClient }) => {
    await esClient.indices.create({ index: OTHER_INDEX_NAME });

    const response = await apiClient.post(`${API_BASE_PATH}/indices/reload`, {
      headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
      responseType: 'json',
      body: JSON.stringify({ indexNames: [INDEX_NAME] }),
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].name).toBe(INDEX_NAME);
  });

  apiTest('returns the details of a single index', async ({ apiClient }) => {
    const response = await apiClient.get(`${INTERNAL_API_BASE_PATH}/indices/${INDEX_NAME}`, {
      headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(Object.keys(response.body).sort()).toStrictEqual(expectedKeys);
  });

  apiTest('returns 404 for an index that does not exist', async ({ apiClient }) => {
    const response = await apiClient.get(`${INTERNAL_API_BASE_PATH}/indices/non_existent`, {
      headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(404);
  });

  apiTest('creates an index with an index mode', async ({ apiClient, esClient }) => {
    const response = await apiClient.put(`${INTERNAL_API_BASE_PATH}/indices/create`, {
      headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
      responseType: 'json',
      body: JSON.stringify({ indexName: CREATED_INDEX_NAME, indexMode: 'logsdb' }),
    });

    expect(response).toHaveStatusCode(200);
    const settings = await esClient.indices.getSettings({ index: CREATED_INDEX_NAME });
    expect(settings[CREATED_INDEX_NAME].settings?.index?.mode).toBe('logsdb');
  });

  apiTest('creates an index without an index mode', async ({ apiClient, esClient }) => {
    const response = await apiClient.put(`${INTERNAL_API_BASE_PATH}/indices/create`, {
      headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
      responseType: 'json',
      body: JSON.stringify({ indexName: CREATED_INDEX_NAME }),
    });

    expect(response).toHaveStatusCode(200);
    expect(await esClient.indices.exists({ index: CREATED_INDEX_NAME })).toBe(true);
  });

  apiTest('rejects creating an index without a name', async ({ apiClient }) => {
    const response = await apiClient.put(`${INTERNAL_API_BASE_PATH}/indices/create`, {
      headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
      responseType: 'json',
      body: JSON.stringify({ indexMode: 'standard' }),
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.message).toContain('expected value of type [string]');
  });

  apiTest('rejects creating an index that already exists', async ({ apiClient }) => {
    const response = await apiClient.put(`${INTERNAL_API_BASE_PATH}/indices/create`, {
      headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
      responseType: 'json',
      body: JSON.stringify({ indexName: INDEX_NAME }),
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest('deletes an index', async ({ apiClient, esClient }) => {
    const response = await apiClient.post(`${API_BASE_PATH}/indices/delete`, {
      headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
      responseType: 'json',
      body: JSON.stringify({ indices: [INDEX_NAME] }),
    });

    expect(response).toHaveStatusCode(200);
    expect(await esClient.indices.exists({ index: INDEX_NAME })).toBe(false);
  });

  apiTest('rejects a delete without an index name', async ({ apiClient }) => {
    const response = await apiClient.post(`${API_BASE_PATH}/indices/delete`, {
      headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
      responseType: 'json',
      body: JSON.stringify({ indices: [undefined] }),
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.message).toContain('expected value of type [string]');
  });
});

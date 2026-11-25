/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type { DataStream } from '../../../../../common';
import {
  apiTest,
  createDataStream,
  deleteDataStream,
  describeStorage,
  expectedDataStream,
  testData,
} from '../../fixtures';

const { API_BASE_PATH, COMMON_HEADERS } = testData;

const DATA_STREAM_NAME = 'index-management-api-ds-get';

const expectedLifecycle = { enabled: true };
const expectedHealth = 'green';
const expectedStats = { maxTimeStamp: 0 };
const expectedStorage = {
  storageSize: 'string (populated)',
  storageSizeBytes: 'number (populated)',
};

apiTest.describe('Data streams API - Get (stateful)', { tag: tags.stateful.classic }, () => {
  let credentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth }) => {
    credentials = await requestAuth.getApiKey('admin');
  });

  apiTest.beforeEach(async ({ esClient }) => {
    await deleteDataStream(esClient, DATA_STREAM_NAME);
    await createDataStream(esClient, DATA_STREAM_NAME);
  });

  apiTest.afterEach(async ({ esClient }) => {
    await deleteDataStream(esClient, DATA_STREAM_NAME);
  });

  apiTest('lists the data streams', async ({ apiClient }) => {
    const response = await apiClient.get(`${API_BASE_PATH}/data_streams`, {
      headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    const dataStream = (response.body as DataStream[]).find(
      ({ name }) => name === DATA_STREAM_NAME
    );
    expect(dataStream).toBeDefined();

    const { name: indexName, uuid } = dataStream!.indices[0];
    expect(dataStream).toStrictEqual(
      expectedDataStream({
        name: DATA_STREAM_NAME,
        indexName,
        uuid,
        health: expectedHealth,
        lifecycle: expectedLifecycle,
      })
    );
  });

  apiTest('includes stats when asked for them', async ({ apiClient }) => {
    const response = await apiClient.get(`${API_BASE_PATH}/data_streams?includeStats=true`, {
      headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    const dataStream = (response.body as DataStream[]).find(
      ({ name }) => name === DATA_STREAM_NAME
    );
    expect(dataStream).toBeDefined();

    const { storageSize, storageSizeBytes, ...rest } = dataStream!;
    expect(describeStorage(storageSize, storageSizeBytes)).toStrictEqual(expectedStorage);

    const { name: indexName, uuid } = rest.indices[0];
    expect(rest).toStrictEqual({
      ...expectedDataStream({
        name: DATA_STREAM_NAME,
        indexName,
        uuid,
        health: expectedHealth,
        lifecycle: expectedLifecycle,
      }),
      ...expectedStats,
    });
  });

  apiTest('returns a single data stream by name', async ({ apiClient }) => {
    const response = await apiClient.get(`${API_BASE_PATH}/data_streams/${DATA_STREAM_NAME}`, {
      headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    const { storageSize, storageSizeBytes, ...rest } = response.body;
    expect(describeStorage(storageSize, storageSizeBytes)).toStrictEqual(expectedStorage);

    const { name: indexName, uuid } = rest.indices[0];
    expect(rest).toStrictEqual({
      ...expectedDataStream({
        name: DATA_STREAM_NAME,
        indexName,
        uuid,
        health: expectedHealth,
        lifecycle: expectedLifecycle,
      }),
      ...expectedStats,
    });
  });
});

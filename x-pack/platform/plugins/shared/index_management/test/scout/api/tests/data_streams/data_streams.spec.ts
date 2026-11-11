/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import {
  apiTest,
  createDataStream,
  deleteDataStream,
  getDataStream,
  getDataStreamMappings,
  testData,
  updateIndexTemplateMappings,
} from '../../fixtures';

const { API_BASE_PATH, COMMON_HEADERS } = testData;

// The names must not prefix each other: their templates would overlap at the same priority.
const DATA_STREAM_NAME = 'index-management-api-ds-one';
const OTHER_DATA_STREAM_NAME = 'index-management-api-ds-two';

// Get-endpoint assertions live in the data_streams_get_* specs; the operations below are agnostic.
apiTest.describe('Data streams API', { tag: tags.deploymentAgnostic }, () => {
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
    await deleteDataStream(esClient, OTHER_DATA_STREAM_NAME);
  });

  apiTest('updates the data retention of a data stream', async ({ apiClient }) => {
    const response = await apiClient.put(`${API_BASE_PATH}/data_streams/data_retention`, {
      headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
      responseType: 'json',
      body: JSON.stringify({ dataRetention: '7d', dataStreams: [DATA_STREAM_NAME] }),
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body).toStrictEqual({ success: true });
  });

  apiTest(
    'updates the data retention of multiple data streams',
    async ({ apiClient, esClient }) => {
      await createDataStream(esClient, OTHER_DATA_STREAM_NAME);

      const response = await apiClient.put(`${API_BASE_PATH}/data_streams/data_retention`, {
        headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
        responseType: 'json',
        body: JSON.stringify({
          dataRetention: '7d',
          dataStreams: [DATA_STREAM_NAME, OTHER_DATA_STREAM_NAME],
        }),
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({ success: true });
    }
  );

  apiTest('sets the data retention to infinite', async ({ apiClient }) => {
    const response = await apiClient.put(`${API_BASE_PATH}/data_streams/data_retention`, {
      headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
      responseType: 'json',
      body: JSON.stringify({ dataStreams: [DATA_STREAM_NAME] }),
    });

    // A project can cap the retention period, so only acceptance is asserted.
    expect(response).toHaveStatusCode(200);
    expect(response.body.success).toBe(true);
  });

  apiTest('updates the failure store configuration', async ({ apiClient }) => {
    const response = await apiClient.put(`${API_BASE_PATH}/data_streams/configure_failure_store`, {
      headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
      responseType: 'json',
      body: JSON.stringify({
        dataStreams: [DATA_STREAM_NAME],
        dsFailureStore: true,
        customRetentionPeriod: '14d',
      }),
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body).toStrictEqual({ success: true });
  });

  apiTest('deletes multiple data streams', async ({ apiClient, esClient }) => {
    await createDataStream(esClient, OTHER_DATA_STREAM_NAME);

    const response = await apiClient.post(`${API_BASE_PATH}/delete_data_streams`, {
      headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
      responseType: 'json',
      body: JSON.stringify({ dataStreams: [DATA_STREAM_NAME, OTHER_DATA_STREAM_NAME] }),
    });
    expect(response).toHaveStatusCode(200);

    for (const name of [DATA_STREAM_NAME, OTHER_DATA_STREAM_NAME]) {
      const getResponse = await apiClient.get(`${API_BASE_PATH}/data_streams/${name}`, {
        headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
        responseType: 'json',
      });
      expect(getResponse).toHaveStatusCode(404);
    }
  });

  apiTest('applies the mappings of the index template', async ({ apiClient, esClient }) => {
    expect((await getDataStreamMappings(esClient, DATA_STREAM_NAME)).properties).toStrictEqual({
      '@timestamp': { type: 'date' },
    });
    await updateIndexTemplateMappings(esClient, DATA_STREAM_NAME, {
      properties: { test: { type: 'integer' } },
    });

    const response = await apiClient.post(
      `${API_BASE_PATH}/data_streams/${DATA_STREAM_NAME}/mappings_from_template`,
      {
        headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
        responseType: 'json',
      }
    );

    expect(response).toHaveStatusCode(200);
    expect((await getDataStreamMappings(esClient, DATA_STREAM_NAME)).properties).toStrictEqual({
      '@timestamp': { type: 'date' },
      test: { type: 'integer' },
    });
  });

  apiTest('rolls a data stream over', async ({ apiClient, esClient }) => {
    const response = await apiClient.post(
      `${API_BASE_PATH}/data_streams/${DATA_STREAM_NAME}/rollover`,
      {
        headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
        responseType: 'json',
      }
    );

    expect(response).toHaveStatusCode(200);
    expect((await getDataStream(esClient, DATA_STREAM_NAME)).generation).toBe(2);
  });
});

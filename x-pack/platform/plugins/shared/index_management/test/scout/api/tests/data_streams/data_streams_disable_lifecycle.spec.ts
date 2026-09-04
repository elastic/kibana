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
  testData,
} from '../../fixtures';

const { API_BASE_PATH, COMMON_HEADERS } = testData;

const DATA_STREAM_NAME = 'index-management-api-ds-disable-lifecycle';

// Turning the lifecycle off is not offered in Serverless.
apiTest.describe('Data streams disable lifecycle API', { tag: tags.stateful.classic }, () => {
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

  apiTest('disables the lifecycle of a data stream', async ({ apiClient, esClient }) => {
    const response = await apiClient.put(`${API_BASE_PATH}/data_streams/data_retention`, {
      headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
      responseType: 'json',
      body: JSON.stringify({ enabled: false, dataStreams: [DATA_STREAM_NAME] }),
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body).toStrictEqual({ success: true });
    expect((await getDataStream(esClient, DATA_STREAM_NAME)).lifecycle).toBeUndefined();
  });
});

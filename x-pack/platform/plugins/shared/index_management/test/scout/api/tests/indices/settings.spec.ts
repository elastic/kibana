/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, forDeployment, testData } from '../../fixtures';

const { API_BASE_PATH, COMMON_HEADERS } = testData;

const INDEX_NAME = 'index-management-api-settings';

apiTest.describe('Index settings API', { tag: tags.deploymentAgnostic }, () => {
  let credentials: RoleApiCredentials;
  // Serverless manages replicas itself, so it edits another setting.
  let editableSetting: [name: string, value: string];

  apiTest.beforeAll(async ({ requestAuth, config }) => {
    credentials = await requestAuth.getApiKey('admin');
    editableSetting = forDeployment(config, {
      stateful: ['number_of_replicas', '2'],
      serverless: ['refresh_interval', '7s'],
    });
  });

  apiTest.beforeEach(async ({ esClient }) => {
    await esClient.indices.delete({ index: INDEX_NAME }, { ignore: [404] });
    await esClient.indices.create({ index: INDEX_NAME });
  });

  apiTest.afterEach(async ({ esClient }) => {
    await esClient.indices.delete({ index: INDEX_NAME }, { ignore: [404] });
  });

  apiTest('updates an index settings', async ({ apiClient, esClient }) => {
    const [setting, value] = editableSetting;

    const updateResponse = await apiClient.put(`${API_BASE_PATH}/settings/${INDEX_NAME}`, {
      headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
      responseType: 'json',
      body: JSON.stringify({ index: { [setting]: value } }),
    });
    expect(updateResponse).toHaveStatusCode(200);

    const response = await esClient.indices.getSettings({ index: INDEX_NAME });
    expect(response[INDEX_NAME].settings?.index).toMatchObject({ [setting]: value });
  });
});

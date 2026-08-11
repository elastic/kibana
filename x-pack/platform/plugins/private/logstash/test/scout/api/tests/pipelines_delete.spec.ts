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

apiTest.describe('POST /api/logstash/pipelines/delete', { tag: tags.stateful.classic }, () => {
  let credentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth, apiServices }) => {
    credentials = await requestAuth.getApiKeyForCustomRole(testData.LOGSTASH_MANAGER_ROLE);
    await apiServices.logstash.createPipelines(
      testData.PIPELINE_IDS.BULK_DELETE_1,
      testData.PIPELINE_IDS.BULK_DELETE_2
    );
  });

  apiTest.afterAll(async ({ apiServices }) => {
    await apiServices.logstash.deletePipelines(
      testData.PIPELINE_IDS.BULK_DELETE_1,
      testData.PIPELINE_IDS.BULK_DELETE_2
    );
  });

  apiTest('should delete the specified pipelines', async ({ apiClient }) => {
    const p1Before = await apiClient.get(
      testData.API_PATHS.PIPELINE(testData.PIPELINE_IDS.BULK_DELETE_1),
      { headers: { ...testData.COMMON_HEADERS, ...credentials.apiKeyHeader }, responseType: 'json' }
    );
    expect(p1Before).toHaveStatusCode(200);

    const p2Before = await apiClient.get(
      testData.API_PATHS.PIPELINE(testData.PIPELINE_IDS.BULK_DELETE_2),
      { headers: { ...testData.COMMON_HEADERS, ...credentials.apiKeyHeader }, responseType: 'json' }
    );
    expect(p2Before).toHaveStatusCode(200);

    const deleteResponse = await apiClient.post(testData.API_PATHS.PIPELINES_DELETE, {
      headers: { ...testData.COMMON_HEADERS, ...credentials.apiKeyHeader },
      body: {
        pipelineIds: [testData.PIPELINE_IDS.BULK_DELETE_1, testData.PIPELINE_IDS.BULK_DELETE_2],
      },
      responseType: 'json',
    });
    expect(deleteResponse).toHaveStatusCode(200);
    expect(deleteResponse.body.results.numSuccesses).toBe(2);
    expect(deleteResponse.body.results.numErrors).toBe(0);

    const p1After = await apiClient.get(
      testData.API_PATHS.PIPELINE(testData.PIPELINE_IDS.BULK_DELETE_1),
      { headers: { ...testData.COMMON_HEADERS, ...credentials.apiKeyHeader }, responseType: 'json' }
    );
    expect(p1After).toHaveStatusCode(404);

    const p2After = await apiClient.get(
      testData.API_PATHS.PIPELINE(testData.PIPELINE_IDS.BULK_DELETE_2),
      { headers: { ...testData.COMMON_HEADERS, ...credentials.apiKeyHeader }, responseType: 'json' }
    );
    expect(p2After).toHaveStatusCode(404);
  });
});

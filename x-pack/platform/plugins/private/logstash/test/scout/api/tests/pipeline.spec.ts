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

apiTest.describe('/api/logstash/pipeline/{id}', { tag: tags.stateful.classic }, () => {
  let credentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth, esClient }) => {
    credentials = await requestAuth.getApiKeyForCustomRole(testData.LOGSTASH_MANAGER_ROLE);

    await esClient.logstash.putPipeline({
      id: testData.PIPELINE_IDS.TWEETS_AND_BEATS,
      pipeline: {
        description: testData.EXPECTED_TWEETS_AND_BEATS_PIPELINE.description,
        last_modified: '2017-08-02T18:59:07.724Z',
        pipeline: testData.EXPECTED_TWEETS_AND_BEATS_PIPELINE.pipeline,
        pipeline_metadata: { type: 'logstash_pipeline', version: '1' },
        // ES accepts an empty settings object at runtime; the TS type is overly strict
        pipeline_settings:
          {} as unknown as import('@elastic/elasticsearch').estypes.LogstashPipelineSettings,
        username: testData.EXPECTED_TWEETS_AND_BEATS_PIPELINE.username,
      },
    });
  });

  apiTest.afterAll(async ({ apiServices }) => {
    await apiServices.logstash.deletePipelines(
      testData.PIPELINE_IDS.TWEETS_AND_BEATS,
      testData.PIPELINE_IDS.FAST_GENERATOR
    );
  });

  apiTest('GET should return the specified pipeline', async ({ apiClient }) => {
    const response = await apiClient.get(
      testData.API_PATHS.PIPELINE(testData.PIPELINE_IDS.TWEETS_AND_BEATS),
      {
        headers: { ...testData.COMMON_HEADERS, ...credentials.apiKeyHeader },
        responseType: 'json',
      }
    );

    expect(response).toHaveStatusCode(200);
    expect(response.body).toStrictEqual(testData.EXPECTED_TWEETS_AND_BEATS_PIPELINE);
  });

  apiTest('GET should return 404 for a non-existing pipeline', async ({ apiClient }) => {
    const response = await apiClient.get(testData.API_PATHS.PIPELINE('non_existing_pipeline'), {
      headers: { ...testData.COMMON_HEADERS, ...credentials.apiKeyHeader },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(404);
  });

  apiTest(
    'PUT should create the specified pipeline and DELETE should remove it',
    async ({ apiClient }) => {
      const createResponse = await apiClient.put(
        testData.API_PATHS.PIPELINE(testData.PIPELINE_IDS.FAST_GENERATOR),
        {
          headers: { ...testData.COMMON_HEADERS, ...credentials.apiKeyHeader },
          body: {
            description: 'foobar baz',
            pipeline: 'input { generator {} }\n\n output { stdout {} }',
          },
          responseType: 'json',
        }
      );
      expect(createResponse).toHaveStatusCode(204);

      const loadResponse = await apiClient.get(
        testData.API_PATHS.PIPELINE(testData.PIPELINE_IDS.FAST_GENERATOR),
        {
          headers: { ...testData.COMMON_HEADERS, ...credentials.apiKeyHeader },
          responseType: 'json',
        }
      );
      expect(loadResponse).toHaveStatusCode(200);
      expect(loadResponse.body.id).toBe(testData.PIPELINE_IDS.FAST_GENERATOR);
      expect(loadResponse.body.description).toBe('foobar baz');
      expect(loadResponse.body.pipeline).toBe('input { generator {} }\n\n output { stdout {} }');

      const deleteResponse = await apiClient.delete(
        testData.API_PATHS.PIPELINE(testData.PIPELINE_IDS.FAST_GENERATOR),
        {
          headers: { ...testData.COMMON_HEADERS, ...credentials.apiKeyHeader },
        }
      );
      expect(deleteResponse).toHaveStatusCode(204);

      const afterDeleteResponse = await apiClient.get(
        testData.API_PATHS.PIPELINE(testData.PIPELINE_IDS.FAST_GENERATOR),
        {
          headers: { ...testData.COMMON_HEADERS, ...credentials.apiKeyHeader },
          responseType: 'json',
        }
      );
      expect(afterDeleteResponse).toHaveStatusCode(404);
    }
  );
});

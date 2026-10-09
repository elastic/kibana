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

apiTest.describe('GET /api/logstash/pipelines', { tag: tags.stateful.classic }, () => {
  let credentials: RoleApiCredentials;

  const EMPTY_PIPELINE_IDS = Array.from({ length: 21 }, (_, i) => `empty_pipeline_${i + 1}`);

  apiTest.beforeAll(async ({ requestAuth, esClient, apiServices }) => {
    credentials = await requestAuth.getApiKeyForCustomRole(testData.LOGSTASH_MANAGER_ROLE);

    // tweets_and_beats has specific field values asserted by the test, so it
    // cannot use the generic createPipelines helper defaults.
    // ES accepts an empty settings object at runtime; the TS type is overly strict
    type PipelineSettings = import('@elastic/elasticsearch').estypes.LogstashPipelineSettings;
    await esClient.logstash.putPipeline({
      id: testData.PIPELINE_IDS.TWEETS_AND_BEATS,
      pipeline: {
        description: testData.EXPECTED_TWEETS_AND_BEATS_PIPELINE.description,
        last_modified: '2017-08-02T18:59:07.724Z',
        pipeline: testData.EXPECTED_TWEETS_AND_BEATS_PIPELINE.pipeline,
        pipeline_metadata: { type: 'logstash_pipeline', version: '1' },
        pipeline_settings: {} as unknown as PipelineSettings,
        username: testData.EXPECTED_TWEETS_AND_BEATS_PIPELINE.username,
      },
    });

    await apiServices.logstash.createPipelines(...EMPTY_PIPELINE_IDS);
  });

  apiTest.afterAll(async ({ apiServices }) => {
    await apiServices.logstash.deletePipelines(
      testData.PIPELINE_IDS.TWEETS_AND_BEATS,
      ...EMPTY_PIPELINE_IDS
    );
  });

  apiTest('should return all the pipelines', async ({ apiClient }) => {
    const response = await apiClient.get(testData.API_PATHS.PIPELINES, {
      headers: { ...testData.COMMON_HEADERS, ...credentials.apiKeyHeader },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.pipelines).toHaveLength(22);

    // Every entry must carry the expected shape
    for (const pipeline of response.body.pipelines as Array<Record<string, unknown>>) {
      expect(typeof pipeline.id).toBe('string');
      expect(typeof pipeline.description).toBe('string');
      expect(typeof pipeline.last_modified).toBe('string');
      expect(typeof pipeline.username).toBe('string');
    }

    // Verify results are sorted alphabetically by id (as implemented in the route)
    const ids = (response.body.pipelines as Array<{ id: string }>).map((p) => p.id);
    expect(ids).toStrictEqual([...ids].sort());

    // Spot-check known pipeline
    const tweetsAndBeats = (response.body.pipelines as Array<Record<string, unknown>>).find(
      (p) => p.id === testData.PIPELINE_IDS.TWEETS_AND_BEATS
    );
    expect(tweetsAndBeats).toMatchObject({
      id: 'tweets_and_beats',
      description: 'ingest tweets and beats',
      username: 'elastic',
    });
  });
});

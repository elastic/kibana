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

apiTest.describe('GET /api/logstash/pipelines', { tag: tags.stateful.all }, () => {
  let credentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth, esClient }) => {
    credentials = await requestAuth.getApiKeyForCustomRole(testData.LOGSTASH_MANAGER_ROLE);

    const PIPELINE_METADATA = { type: 'logstash_pipeline', version: 1 };

    await esClient.logstash.putPipeline({
      id: testData.PIPELINE_IDS.TWEETS_AND_BEATS,
      pipeline: {
        description: testData.EXPECTED_TWEETS_AND_BEATS_PIPELINE.description,
        last_modified: '2017-08-02T18:59:07.724Z',
        pipeline: testData.EXPECTED_TWEETS_AND_BEATS_PIPELINE.pipeline,
        pipeline_metadata: PIPELINE_METADATA,
        pipeline_settings: {},
        username: testData.EXPECTED_TWEETS_AND_BEATS_PIPELINE.username,
      },
    });

    for (let i = 1; i <= 21; i++) {
      await esClient.logstash.putPipeline({
        id: `empty_pipeline_${i}`,
        pipeline: {
          description: 'an empty pipeline',
          last_modified: '2017-08-02T18:57:32.907Z',
          pipeline: '# empty pipeline',
          pipeline_metadata: PIPELINE_METADATA,
          pipeline_settings: {},
          username: 'elastic',
        },
      });
    }
  });

  apiTest.afterAll(async ({ esClient }) => {
    await esClient.logstash.deletePipeline({ id: testData.PIPELINE_IDS.TWEETS_AND_BEATS });
    for (let i = 1; i <= 21; i++) {
      await esClient.logstash.deletePipeline({ id: `empty_pipeline_${i}` });
    }
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

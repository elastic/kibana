/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RoleApiCredentials, ScoutWorkerFixtures } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, testData } from '../fixtures';

apiTest.describe('Ingest pipelines read and delete API', { tag: tags.deploymentAgnostic }, () => {
  const pipelineIdsToCleanup = new Set<string>();
  let adminCredentials: RoleApiCredentials;

  const uniqueName = (prefix: string) =>
    `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const createPipeline = async ({
    esClient,
    name,
    pipeline,
  }: {
    esClient: ScoutWorkerFixtures['esClient'];
    name: string;
    pipeline: Record<string, unknown>;
  }) => {
    await esClient.ingest.putPipeline({
      id: name,
      ...pipeline,
    });
    pipelineIdsToCleanup.add(name);
  };

  apiTest.beforeAll(async ({ requestAuth }) => {
    adminCredentials = await requestAuth.getApiKey('admin');
  });

  apiTest.afterAll(async ({ esClient, log }) => {
    for (const pipelineId of pipelineIdsToCleanup) {
      try {
        await esClient.ingest.deletePipeline({ id: pipelineId });
      } catch (error) {
        log.debug(`Pipeline cleanup failed for ${pipelineId}: ${(error as Error).message}`);
      }
    }
  });

  apiTest('returns all pipelines', async ({ apiClient, esClient }) => {
    const pipelineName = uniqueName('test-pipeline-required-fields');
    const pipelineRequestBody = testData.createPipelineBodyWithRequiredFields(pipelineName);
    const { name, ...pipeline } = pipelineRequestBody;
    await createPipeline({ esClient, name, pipeline });

    const response = await apiClient.get(testData.API_BASE_PATH, {
      headers: {
        ...testData.COMMON_HEADERS,
        ...adminCredentials.apiKeyHeader,
      },
    });

    expect(response).toHaveStatusCode(200);
    expect(Array.isArray(response.body)).toBe(true);

    // There are some pipelines created OOTB with ES, so only confirm the test pipeline exists.
    const testPipeline = (
      response.body as Array<{ name: string; isManaged: boolean; processors: unknown }>
    ).find(({ name: returnedName }) => returnedName === pipelineName);
    expect(testPipeline).toBeDefined();
    expect(testPipeline?.name).toBe(pipelineName);
    expect(testPipeline?.isManaged).toBe(false);
    expect(testPipeline?.processors).toStrictEqual(pipeline.processors);
  });

  apiTest('returns a single pipeline', async ({ apiClient, esClient }) => {
    const pipelineName = uniqueName('test-pipeline-required-fields');
    const pipelineRequestBody = testData.createPipelineBodyWithRequiredFields(pipelineName);
    const { name, ...pipeline } = pipelineRequestBody;
    await createPipeline({ esClient, name, pipeline });

    const response = await apiClient.get(`${testData.API_BASE_PATH}/${pipelineName}`, {
      headers: {
        ...testData.COMMON_HEADERS,
        ...adminCredentials.apiKeyHeader,
      },
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body).toMatchObject({
      name: pipelineName,
      isManaged: false,
      processors: pipeline.processors,
    });
  });

  apiTest('deletes a pipeline', async ({ apiClient, esClient }) => {
    const pipelineName = uniqueName('test-pipeline-required-fields');
    const pipelineRequestBody = testData.createPipelineBodyWithRequiredFields(pipelineName);
    const { name, ...pipeline } = pipelineRequestBody;
    await createPipeline({ esClient, name, pipeline });

    const response = await apiClient.delete(`${testData.API_BASE_PATH}/${pipelineName}`, {
      headers: {
        ...testData.COMMON_HEADERS,
        ...adminCredentials.apiKeyHeader,
      },
    });
    pipelineIdsToCleanup.delete(pipelineName);

    expect(response).toHaveStatusCode(200);
    expect(response.body).toStrictEqual({
      itemsDeleted: [pipelineName],
      errors: [],
    });
  });

  apiTest('deletes multiple pipelines', async ({ apiClient, esClient }) => {
    const pipelineNames = [
      uniqueName('test-pipeline-required-fields'),
      uniqueName('test-pipeline-required-fields'),
    ];

    for (const pipelineName of pipelineNames) {
      const pipelineRequestBody = testData.createPipelineBodyWithRequiredFields(pipelineName);
      const { name, ...pipeline } = pipelineRequestBody;
      await createPipeline({ esClient, name, pipeline });
    }

    const response = await apiClient.delete(
      `${testData.API_BASE_PATH}/${pipelineNames.join(',')}`,
      {
        headers: {
          ...testData.COMMON_HEADERS,
          ...adminCredentials.apiKeyHeader,
        },
      }
    );
    pipelineNames.forEach((pipelineName) => pipelineIdsToCleanup.delete(pipelineName));

    expect(response).toHaveStatusCode(200);
    const { itemsDeleted, errors } = response.body as { itemsDeleted: string[]; errors: unknown[] };
    expect(errors).toStrictEqual([]);
    pipelineNames.forEach((pipelineName) => {
      expect(itemsDeleted).toContain(pipelineName);
    });
  });

  apiTest(
    'returns an error for any pipelines not successfully deleted',
    async ({ apiClient, esClient }) => {
      const pipelineName = uniqueName('test-pipeline-required-fields');
      const missingPipelineName = 'pipeline_does_not_exist';
      const pipelineRequestBody = testData.createPipelineBodyWithRequiredFields(pipelineName);
      const { name, ...pipeline } = pipelineRequestBody;
      await createPipeline({ esClient, name, pipeline });

      const response = await apiClient.delete(
        `${testData.API_BASE_PATH}/${pipelineName},${missingPipelineName}`,
        {
          headers: {
            ...testData.COMMON_HEADERS,
            ...adminCredentials.apiKeyHeader,
          },
        }
      );
      pipelineIdsToCleanup.delete(pipelineName);

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({
        itemsDeleted: [pipelineName],
        errors: [
          {
            name: missingPipelineName,
            error: {
              root_cause: [
                {
                  type: 'resource_not_found_exception',
                  reason: 'pipeline [pipeline_does_not_exist] is missing',
                },
              ],
              type: 'resource_not_found_exception',
              reason: 'pipeline [pipeline_does_not_exist] is missing',
            },
            status: 404,
          },
        ],
      });
    }
  );
});

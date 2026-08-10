/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RoleApiCredentials, ScoutWorkerFixtures } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { deletePipeline, uniqueName } from '../../helpers';
import { apiTest, testData } from '../fixtures';

apiTest.describe('Ingest pipelines API', { tag: tags.deploymentAgnostic }, () => {
  const pipelineIdsToCleanup = new Set<string>();
  let adminCredentials: RoleApiCredentials;

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
      await deletePipeline({ esClient, pipelineName: pipelineId, log });
    }
  });

  apiTest('creates a pipeline', async ({ apiClient }) => {
    const pipelineName = uniqueName('test-pipeline');
    const pipelineRequestBody = testData.createPipelineBody(pipelineName);
    const response = await apiClient.post(testData.API_BASE_PATH, {
      headers: {
        ...testData.COMMON_HEADERS,
        ...adminCredentials.apiKeyHeader,
      },
      body: pipelineRequestBody,
    });
    pipelineIdsToCleanup.add(pipelineName);

    expect(response).toHaveStatusCode(200);
    expect(response.body).toStrictEqual({
      acknowledged: true,
    });
  });

  apiTest('creates a pipeline with only required fields', async ({ apiClient }) => {
    const pipelineName = uniqueName('test-pipeline-required-fields');
    const pipelineRequestBody = testData.createPipelineBodyWithRequiredFields(pipelineName);
    const response = await apiClient.post(testData.API_BASE_PATH, {
      headers: {
        ...testData.COMMON_HEADERS,
        ...adminCredentials.apiKeyHeader,
      },
      body: pipelineRequestBody,
    });
    pipelineIdsToCleanup.add(pipelineName);

    expect(response).toHaveStatusCode(200);
    expect(response.body).toStrictEqual({
      acknowledged: true,
    });
  });

  apiTest('does not allow creation of an existing pipeline', async ({ apiClient, esClient }) => {
    const pipelineName = uniqueName('test-pipeline-required-fields');
    const pipelineRequestBody = testData.createPipelineBodyWithRequiredFields(pipelineName);
    const { name, ...esPipelineRequestBody } = pipelineRequestBody;

    await createPipeline({ esClient, name, pipeline: esPipelineRequestBody });

    const response = await apiClient.post(testData.API_BASE_PATH, {
      headers: {
        ...testData.COMMON_HEADERS,
        ...adminCredentials.apiKeyHeader,
      },
      body: pipelineRequestBody,
    });

    expect(response).toHaveStatusCode(409);
    expect(response.body).toStrictEqual({
      statusCode: 409,
      error: 'Conflict',
      message: `There is already a pipeline with name '${name}'.`,
    });
  });

  apiTest('does not allow creation of a pipeline with a too long name', async ({ apiClient }) => {
    const response = await apiClient.post(testData.API_BASE_PATH, {
      headers: {
        ...testData.COMMON_HEADERS,
        ...adminCredentials.apiKeyHeader,
      },
      body: {
        name: 'testtesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttest1',
      },
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest('updates an existing pipeline', async ({ apiClient, esClient }) => {
    const pipelineName = uniqueName('test-pipeline-required-fields');
    const pipelineRequestBody = testData.createPipelineBodyWithRequiredFields(pipelineName);
    const { name, ...pipeline } = pipelineRequestBody;
    await createPipeline({ esClient, name, pipeline });

    const response = await apiClient.put(`${testData.API_BASE_PATH}/${pipelineName}`, {
      headers: {
        ...testData.COMMON_HEADERS,
        ...adminCredentials.apiKeyHeader,
      },
      body: {
        ...pipeline,
        description: 'updated test pipeline description',
        _meta: {
          field_1: 'updated',
          new_field: 3,
        },
      },
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body).toStrictEqual({
      acknowledged: true,
    });
  });

  apiTest('removes optional fields while updating a pipeline', async ({ apiClient, esClient }) => {
    const pipelineName = uniqueName('test-pipeline-required-fields');
    const pipelineRequestBody = testData.createPipelineBodyWithRequiredFields(pipelineName);
    const { name, ...pipeline } = pipelineRequestBody;
    await createPipeline({ esClient, name, pipeline });

    const response = await apiClient.put(`${testData.API_BASE_PATH}/${pipelineName}`, {
      headers: {
        ...testData.COMMON_HEADERS,
        ...adminCredentials.apiKeyHeader,
      },
      body: {
        processors: pipeline.processors,
      },
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body).toStrictEqual({
      acknowledged: true,
    });
  });

  apiTest('does not allow a non-existing pipeline to be updated', async ({ apiClient }) => {
    const pipelineName = uniqueName('pipeline-does-not-exist');
    const pipelineRequestBody = testData.createPipelineBodyWithRequiredFields(pipelineName);
    const { name: unusedName, ...pipeline } = pipelineRequestBody;
    const response = await apiClient.put(`${testData.API_BASE_PATH}/${pipelineName}`, {
      headers: {
        ...testData.COMMON_HEADERS,
        ...adminCredentials.apiKeyHeader,
      },
      body: {
        ...pipeline,
        description: 'updated test pipeline description',
        _meta: {
          field_1: 'updated',
          new_field: 3,
        },
      },
    });

    expect(response).toHaveStatusCode(404);
    expect(response.body).toStrictEqual({
      statusCode: 404,
      error: 'Not Found',
      message: '{}',
      attributes: {},
    });
  });
});

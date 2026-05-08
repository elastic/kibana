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

apiTest.describe('Ingest pipelines API', { tag: tags.deploymentAgnostic }, () => {
  const pipelineIdsToCleanup = new Set<string>();
  const indexNamesToCleanup = new Set<string>();
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

    for (const indexName of indexNamesToCleanup) {
      try {
        await esClient.indices.delete({ index: indexName });
      } catch (error) {
        log.debug(`Index cleanup failed for ${indexName}: ${(error as Error).message}`);
      }
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

  apiTest('simulates a pipeline', async ({ apiClient }) => {
    const { name: unusedName, ...pipeline } = testData.createPipelineBody(
      uniqueName('test-pipeline')
    );
    const response = await apiClient.post(`${testData.API_BASE_PATH}/simulate`, {
      headers: {
        ...testData.COMMON_HEADERS,
        ...adminCredentials.apiKeyHeader,
      },
      body: {
        pipeline,
        documents: testData.createDocuments(),
      },
    });

    expect(response).toHaveStatusCode(200);
    // The simulate ES response is long and includes timestamps, so confirm the docs count.
    expect((response.body as { docs?: unknown[] }).docs?.length).toBe(2);
  });

  apiTest('simulates a pipeline with only required pipeline fields', async ({ apiClient }) => {
    const { name: unusedName, ...pipeline } = testData.createPipelineBodyWithRequiredFields(
      uniqueName('test-pipeline-required-fields')
    );
    const response = await apiClient.post(`${testData.API_BASE_PATH}/simulate`, {
      headers: {
        ...testData.COMMON_HEADERS,
        ...adminCredentials.apiKeyHeader,
      },
      body: {
        pipeline,
        documents: testData.createDocuments(),
      },
    });

    expect(response).toHaveStatusCode(200);
    // The simulate ES response is long and includes timestamps, so confirm the docs count.
    expect((response.body as { docs?: unknown[] }).docs?.length).toBe(2);
  });

  apiTest('returns a document', async ({ apiClient, esClient }) => {
    const indexName = uniqueName('test-index');
    const documentId = '1';
    const document = {
      name: 'John Doe',
    };
    await esClient.index({ index: indexName, id: documentId, document });
    indexNamesToCleanup.add(indexName);

    const response = await apiClient.get(
      `${testData.API_BASE_PATH}/documents/${indexName}/${documentId}`,
      {
        headers: {
          ...testData.COMMON_HEADERS,
          ...adminCredentials.apiKeyHeader,
        },
      }
    );

    expect(response).toHaveStatusCode(200);
    expect(response.body).toStrictEqual({
      _index: indexName,
      _id: documentId,
      _source: document,
    });
  });

  apiTest('returns an error if the document does not exist', async ({ apiClient, esClient }) => {
    const indexName = uniqueName('test-index');
    const document = {
      name: 'John Doe',
    };
    await esClient.index({ index: indexName, id: '1', document });
    indexNamesToCleanup.add(indexName);

    const response = await apiClient.get(`${testData.API_BASE_PATH}/documents/${indexName}/2`, {
      headers: {
        ...testData.COMMON_HEADERS,
        ...adminCredentials.apiKeyHeader,
      },
    });

    expect(response).toHaveStatusCode(404);
    expect(response.body).toStrictEqual({
      error: 'Not Found',
      message: `{"_index":"${indexName}","_id":"2","found":false}`,
      statusCode: 404,
      attributes: {},
    });
  });

  apiTest('maps CSV to a pipeline', async ({ apiClient }) => {
    const validCsv =
      'source_field,copy_action,format_action,timestamp_format,destination_field,Notes\nsrcip,,,,source.address,Copying srcip to source.address';
    const response = await apiClient.post(`${testData.API_BASE_PATH}/parse_csv`, {
      headers: {
        ...testData.COMMON_HEADERS,
        ...adminCredentials.apiKeyHeader,
      },
      body: {
        copyAction: 'copy',
        file: validCsv,
      },
    });

    expect(response).toHaveStatusCode(200);
    expect((response.body as { processors: unknown[] }).processors).toStrictEqual([
      {
        set: {
          field: 'source.address',
          value: '{{srcip}}',
          if: 'ctx.srcip != null',
        },
      },
    ]);
  });
});

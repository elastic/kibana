/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { uniqueName } from '../../helpers';
import { apiTest, testData } from '../fixtures';

apiTest.describe(
  'Ingest pipelines simulate, documents, and CSV API',
  { tag: tags.deploymentAgnostic },
  () => {
    const indexNamesToCleanup = new Set<string>();
    let adminCredentials: RoleApiCredentials;

    apiTest.beforeAll(async ({ requestAuth }) => {
      adminCredentials = await requestAuth.getApiKey('admin');
    });

    apiTest.afterAll(async ({ esClient, log }) => {
      for (const indexName of indexNamesToCleanup) {
        try {
          await esClient.indices.delete({ index: indexName });
        } catch (error) {
          log.debug(`Index cleanup failed for ${indexName}: ${(error as Error).message}`);
        }
      }
    });

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
  }
);

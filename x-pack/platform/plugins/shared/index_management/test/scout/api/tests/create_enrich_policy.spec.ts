/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import { apiTest, createHeaders, deleteIndices, indexManagementApi, uniqueName } from '../fixtures';

apiTest.describe(
  'Index Management create enrich policy API',
  { tag: tags.stateful.classic },
  () => {
    const indices: string[] = [];
    const dataStreams: string[] = [];
    let dataStreamTemplate: string;

    apiTest.beforeAll(async ({ esClient }) => {
      const indexA = uniqueName('im-enrich-source-a');
      const indexB = uniqueName('im-enrich-source-b');
      const dataStreamA = uniqueName('im-enrich-data-stream-a');
      const dataStreamB = uniqueName('im-enrich-data-stream-b');
      dataStreamTemplate = uniqueName('im-enrich-data-stream-template');

      indices.push(indexA, indexB);
      dataStreams.push(dataStreamA, dataStreamB);

      await esClient.indices.create({
        index: indexA,
        mappings: {
          properties: {
            email: { type: 'text' },
            firstName: { type: 'text' },
          },
        },
      });
      await esClient.indices.create({
        index: indexB,
        mappings: {
          properties: {
            email: { type: 'text' },
            age: { type: 'long' },
          },
        },
      });
      await esClient.indices.putIndexTemplate({
        name: dataStreamTemplate,
        index_patterns: ['im-enrich-data-stream-*'],
        data_stream: {},
      });
      await esClient.indices.createDataStream({ name: dataStreamA });
      await esClient.indices.createDataStream({ name: dataStreamB });
    });

    apiTest.afterAll(async ({ esClient, log }) => {
      await deleteIndices(esClient, indices, log);
      for (const dataStream of dataStreams) {
        await esClient.indices
          .deleteDataStream({ name: dataStream })
          .catch((error) =>
            log.debug(`[Cleanup error] Error deleting data stream: ${error.message}`)
          );
      }
      await esClient.indices
        .deleteIndexTemplate({ name: dataStreamTemplate })
        .catch((error) => log.debug(`[Cleanup error] Error deleting template: ${error.message}`));
    });

    apiTest('creates an enrich policy', async ({ apiClient, samlAuth }) => {
      const policyName = uniqueName('im-create-enrich-policy');
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      const response = await indexManagementApi(
        apiClient,
        createHeaders(cookieHeader)
      ).enrichPolicies.create({
        name: policyName,
        type: 'match',
        matchField: 'email',
        enrichFields: ['firstName'],
        sourceIndices: [indices[0]],
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({ acknowledged: true });
    });

    apiTest('retrieves fields from indices and data streams', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      const response = await indexManagementApi(
        apiClient,
        createHeaders(cookieHeader)
      ).enrichPolicies.getFieldsFromIndices([...indices, ...dataStreams]);

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({
        commonFields: [
          { name: 'email', type: 'text', normalizedType: 'text' },
          { name: '@timestamp', type: 'date', normalizedType: 'date' },
        ],
        indices: [
          {
            index: indices[0],
            fields: [
              { name: 'email', type: 'text', normalizedType: 'text' },
              { name: 'firstName', type: 'text', normalizedType: 'text' },
            ],
          },
          {
            index: indices[1],
            fields: [
              { name: 'age', type: 'long', normalizedType: 'number' },
              { name: 'email', type: 'text', normalizedType: 'text' },
            ],
          },
          {
            index: dataStreams[0],
            fields: [{ name: '@timestamp', type: 'date', normalizedType: 'date' }],
          },
          {
            index: dataStreams[1],
            fields: [{ name: '@timestamp', type: 'date', normalizedType: 'date' }],
          },
        ],
      });
    });

    apiTest('retrieves matching indices and data streams', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      const api = indexManagementApi(apiClient, createHeaders(cookieHeader)).enrichPolicies;

      const indicesResponse = await api.getMatchingIndices('im-enrich-source-');
      expect(indicesResponse).toHaveStatusCode(200);
      expect(indicesResponse.body.indices).toStrictEqual(expect.arrayContaining(indices));

      const dataStreamsResponse = await api.getMatchingDataStreams('im-enrich-data-stream-');
      expect(dataStreamsResponse).toHaveStatusCode(200);
      expect(dataStreamsResponse.body.dataStreams).toStrictEqual(
        expect.arrayContaining(dataStreams)
      );
    });
  }
);

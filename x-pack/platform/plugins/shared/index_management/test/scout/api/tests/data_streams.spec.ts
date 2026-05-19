/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import {
  apiTest,
  createDataStream,
  createHeaders,
  deleteDataStream,
  indexManagementApi,
  uniqueName,
} from '../fixtures';

apiTest.describe('Index Management data streams API', { tag: tags.stateful.classic }, () => {
  apiTest(
    'gets data streams with and without stats',
    async ({ apiClient, esClient, log, requestAuth }) => {
      const dataStreamName = uniqueName('im-data-stream');
      await createDataStream({ esClient, name: dataStreamName });

      try {
        const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();
        const api = indexManagementApi(apiClient, createHeaders(apiKeyHeader)).dataStreams;

        const listResponse = await api.getAll();
        expect(listResponse).toHaveStatusCode(200);
        const listedDataStream = listResponse.body.find(
          ({ name }: { name: string }) => name === dataStreamName
        );
        expect(listedDataStream).toBeDefined();
        expect(listedDataStream).toMatchObject({
          name: dataStreamName,
          lifecycle: { enabled: true },
          timeStampField: { name: '@timestamp' },
          generation: 1,
          indexTemplateName: dataStreamName,
          hidden: false,
          failureStoreEnabled: false,
          indexMode: 'standard',
        });

        const statsResponse = await api.getAll(true);
        expect(statsResponse).toHaveStatusCode(200);
        const dataStreamWithStats = statsResponse.body.find(
          ({ name }: { name: string }) => name === dataStreamName
        );
        expect(typeof dataStreamWithStats.storageSize).toBe('string');
        expect(typeof dataStreamWithStats.storageSizeBytes).toBe('number');

        const singleResponse = await api.getOne(dataStreamName, true);
        expect(singleResponse).toHaveStatusCode(200);
        expect(singleResponse.body.name).toBe(dataStreamName);
        expect(typeof singleResponse.body.storageSize).toBe('string');
        expect(typeof singleResponse.body.storageSizeBytes).toBe('number');
      } finally {
        await deleteDataStream(esClient, dataStreamName, log);
      }
    }
  );

  apiTest(
    'updates retention and failure store configuration',
    async ({ apiClient, esClient, log, requestAuth }) => {
      const dataStreamName1 = uniqueName('im-update-ds-1');
      const dataStreamName2 = uniqueName('im-update-ds-2');
      await createDataStream({ esClient, name: dataStreamName1 });
      await createDataStream({ esClient, name: dataStreamName2 });

      try {
        const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();
        const api = indexManagementApi(apiClient, createHeaders(apiKeyHeader)).dataStreams;

        expect(
          await api.updateRetention({
            dataRetention: '7d',
            dataStreams: [dataStreamName1],
          })
        ).toHaveStatusCode(200);
        expect(
          await api.updateRetention({
            dataRetention: '7d',
            dataStreams: [dataStreamName1, dataStreamName2],
          })
        ).toHaveStatusCode(200);
        expect(await api.updateRetention({ dataStreams: [dataStreamName1] })).toHaveStatusCode(200);

        const disabledLifecycleResponse = await api.updateRetention({
          enabled: false,
          dataStreams: [dataStreamName1],
        });
        expect(disabledLifecycleResponse).toHaveStatusCode(200);

        const {
          data_streams: [dataStream],
        } = await esClient.indices.getDataStream({ name: dataStreamName1 });
        expect(dataStream.lifecycle).toBeUndefined();

        const failureStoreResponse = await api.updateFailureStore({
          dataStreams: [dataStreamName1],
          dsFailureStore: true,
          customRetentionPeriod: '14d',
        });
        expect(failureStoreResponse).toHaveStatusCode(200);
        expect(failureStoreResponse.body).toStrictEqual({ success: true });
      } finally {
        await deleteDataStream(esClient, dataStreamName1, log);
        await deleteDataStream(esClient, dataStreamName2, log);
      }
    }
  );

  apiTest('deletes multiple data streams', async ({ apiClient, esClient, log, requestAuth }) => {
    const dataStreamName1 = uniqueName('im-delete-ds-1');
    const dataStreamName2 = uniqueName('im-delete-ds-2');
    await createDataStream({ esClient, name: dataStreamName1 });
    await createDataStream({ esClient, name: dataStreamName2 });

    const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();
    const api = indexManagementApi(apiClient, createHeaders(apiKeyHeader)).dataStreams;

    try {
      expect(await api.delete([dataStreamName1, dataStreamName2])).toHaveStatusCode(200);
      expect(await api.getOne(dataStreamName1)).toHaveStatusCode(404);
      expect(await api.getOne(dataStreamName2)).toHaveStatusCode(404);
    } finally {
      await esClient.indices
        .deleteIndexTemplate({ name: dataStreamName1 })
        .catch((error) => log.debug(`[Cleanup error] Error deleting template: ${error.message}`));
      await esClient.indices
        .deleteIndexTemplate({ name: dataStreamName2 })
        .catch((error) => log.debug(`[Cleanup error] Error deleting template: ${error.message}`));
    }
  });

  apiTest(
    'applies mappings from index template',
    async ({ apiClient, esClient, log, requestAuth }) => {
      const dataStreamName = uniqueName('im-mappings-ds');
      await createDataStream({ esClient, name: dataStreamName });

      try {
        const beforeMapping = Object.values(
          await esClient.indices.getMapping({ index: dataStreamName })
        )[0].mappings;
        expect(beforeMapping.properties).toStrictEqual({ '@timestamp': { type: 'date' } });

        await esClient.indices.putIndexTemplate({
          name: dataStreamName,
          index_patterns: [`${dataStreamName}*`],
          template: {
            mappings: {
              properties: {
                test: { type: 'integer' },
              },
            },
          },
          data_stream: {},
        });

        const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();
        const response = await indexManagementApi(
          apiClient,
          createHeaders(apiKeyHeader)
        ).dataStreams.getMappingsFromTemplate(dataStreamName);
        expect(response).toHaveStatusCode(200);

        const afterMapping = Object.values(
          await esClient.indices.getMapping({ index: dataStreamName })
        )[0].mappings;
        expect(afterMapping.properties).toStrictEqual({
          '@timestamp': { type: 'date' },
          test: { type: 'integer' },
        });
      } finally {
        await deleteDataStream(esClient, dataStreamName, log);
      }
    }
  );

  apiTest('rolls over a data stream', async ({ apiClient, esClient, log, requestAuth }) => {
    const dataStreamName = uniqueName('im-rollover-ds');
    await createDataStream({ esClient, name: dataStreamName });

    try {
      const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();
      const response = await indexManagementApi(
        apiClient,
        createHeaders(apiKeyHeader)
      ).dataStreams.rollover(dataStreamName);
      expect(response).toHaveStatusCode(200);

      const {
        data_streams: [dataStream],
      } = await esClient.indices.getDataStream({ name: dataStreamName });
      expect(dataStream.generation).toBe(2);
    } finally {
      await deleteDataStream(esClient, dataStreamName, log);
    }
  });
});

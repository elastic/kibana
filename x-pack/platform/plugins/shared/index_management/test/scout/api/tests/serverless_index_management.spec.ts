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
  getTemplatePayload,
  indexManagementApi,
  uniqueName,
} from '../fixtures';

const serverlessTags = [
  ...tags.serverless.search,
  ...tags.serverless.observability.complete,
  ...tags.serverless.security.complete,
];

apiTest.describe('Serverless Index Management APIs', { tag: serverlessTags }, () => {
  apiTest('returns 410 for node plugins endpoint', async ({ apiClient, requestAuth }) => {
    const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();
    const response = await indexManagementApi(
      apiClient,
      createHeaders(apiKeyHeader)
    ).clusterNodes.getPlugins();

    expect(response).toHaveStatusCode(410);
  });

  apiTest(
    'lists and gets data streams with serverless response metadata',
    async ({ apiClient, esClient, log, requestAuth }) => {
      const dataStreamName = uniqueName('im-serverless-data-stream');
      await createDataStream({ esClient, name: dataStreamName });

      try {
        const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();
        const api = indexManagementApi(apiClient, createHeaders(apiKeyHeader)).dataStreams;

        const listResponse = await api.getAll();
        expect(listResponse).toHaveStatusCode(200);
        const listedDataStream = listResponse.body.find(
          ({ name }: { name: string }) => name === dataStreamName
        );
        expect(listedDataStream).toMatchObject({
          name: dataStreamName,
          lifecycle: { enabled: true },
          timeStampField: { name: '@timestamp' },
          generation: 1,
          indexTemplateName: dataStreamName,
          hidden: false,
        });

        const getResponse = await api.getOne(dataStreamName, true);
        expect(getResponse).toHaveStatusCode(200);
        expect(getResponse.body.name).toBe(dataStreamName);
        expect(typeof getResponse.body.storageSize).toBe('string');
        expect(typeof getResponse.body.storageSizeBytes).toBe('number');
      } finally {
        await deleteDataStream(esClient, dataStreamName, log);
      }
    }
  );

  apiTest('creates, updates, and deletes index templates', async ({ apiClient, requestAuth }) => {
    const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();
    const api = indexManagementApi(apiClient, createHeaders(apiKeyHeader)).templates;
    const template = getTemplatePayload(uniqueName('im-serverless-template'), [
      uniqueName('im-serverless-pattern'),
    ]);

    expect(await api.create(template)).toHaveStatusCode(200);
    expect(await api.update(template.name, { ...template, version: 2 })).toHaveStatusCode(200);

    const getResponse = await api.getOne(template.name);
    expect(getResponse).toHaveStatusCode(200);
    expect(getResponse.body.version).toBe(2);

    const deleteResponse = await api.delete([{ name: template.name }]);
    expect(deleteResponse).toHaveStatusCode(200);
    expect(deleteResponse.body.errors).toStrictEqual([]);
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndicesDataStreamFailureStore } from '@elastic/elasticsearch/lib/api/types';
import type { EsClient } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import { apiTest, testData } from '../fixtures';
import { buildDataStreamName, deleteDataStreamIfExists, getLogsForDataset } from '../../common';

const DATASET = 'dq.ufs';
const DATA_STREAM = buildDataStreamName({ dataset: DATASET });
const INGEST_TO = '2025-01-01T00:01:00.000Z';

/** Reads back the failure store options Elasticsearch actually stored for the stream. */
const getFailureStoreOptions = async (
  esClient: EsClient,
  dataStream: string
): Promise<IndicesDataStreamFailureStore | undefined> => {
  const { data_streams: dataStreams } = await esClient.indices.getDataStreamOptions({
    name: dataStream,
  });

  return dataStreams[0]?.options?.failure_store;
};

apiTest.describe(
  'Dataset quality - update failure store of a data stream',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let adminHeaders: Record<string, string>;

    apiTest.beforeAll(async ({ logsSynthtraceEsClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      adminHeaders = { ...testData.COMMON_HEADERS, ...cookieHeader };

      await logsSynthtraceEsClient.index(
        getLogsForDataset({ dataset: DATASET, to: INGEST_TO, count: 1 })
      );
    });

    apiTest.afterAll(async ({ esClient, log, logsSynthtraceEsClient }) => {
      await logsSynthtraceEsClient.clean();
      await deleteDataStreamIfExists(esClient, DATA_STREAM, log);
    });

    apiTest('enables the failure store', async ({ apiClient, esClient }) => {
      const response = await apiClient.put(testData.API.updateFailureStore(DATA_STREAM), {
        headers: adminHeaders,
        responseType: 'json',
        body: { failureStoreEnabled: true, customRetentionPeriod: undefined },
      });

      expect(response).toHaveStatusCode(200);

      const failureStore = await getFailureStoreOptions(esClient, DATA_STREAM);
      expect(failureStore?.enabled).toBe(true);
      expect(failureStore?.lifecycle?.data_retention).toBeUndefined();
    });

    apiTest('disables the failure store', async ({ apiClient, esClient }) => {
      const response = await apiClient.put(testData.API.updateFailureStore(DATA_STREAM), {
        headers: adminHeaders,
        responseType: 'json',
        body: { failureStoreEnabled: false, customRetentionPeriod: undefined },
      });

      expect(response).toHaveStatusCode(200);

      const failureStore = await getFailureStoreOptions(esClient, DATA_STREAM);
      expect(failureStore?.enabled).toBe(false);
      expect(failureStore?.lifecycle?.data_retention).toBeUndefined();
    });

    apiTest(
      'enables the failure store with a custom retention period',
      async ({ apiClient, esClient }) => {
        const response = await apiClient.put(testData.API.updateFailureStore(DATA_STREAM), {
          headers: adminHeaders,
          responseType: 'json',
          body: { failureStoreEnabled: true, customRetentionPeriod: '30d' },
        });

        expect(response).toHaveStatusCode(200);

        const failureStore = await getFailureStoreOptions(esClient, DATA_STREAM);
        expect(failureStore?.enabled).toBe(true);
        expect(failureStore?.lifecycle?.data_retention).toBe('30d');
      }
    );
  }
);

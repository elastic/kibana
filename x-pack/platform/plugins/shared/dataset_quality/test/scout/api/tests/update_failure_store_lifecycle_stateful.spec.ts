/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import { apiTest, testData } from '../fixtures';
import { buildDataStreamName, deleteDataStreamIfExists, getLogsForDataset } from '../../common';

/**
 * Stateful-only: the endpoint switches the failure store lifecycle on together
 * with the failure store itself, which serverless does not expose.
 */
const DATASET = 'dq.ufs.ess';
const DATA_STREAM = buildDataStreamName({ dataset: DATASET });
const INGEST_TO = '2025-01-01T00:01:00.000Z';

const getFailureStoreLifecycleEnabled = async (
  esClient: EsClient,
  dataStream: string
): Promise<boolean | undefined> => {
  const { data_streams: dataStreams } = await esClient.indices.getDataStreamOptions({
    name: dataStream,
  });

  return dataStreams[0]?.options?.failure_store?.lifecycle?.enabled;
};

apiTest.describe(
  'Dataset quality - update failure store lifecycle of a data stream on stateful',
  { tag: [...tags.stateful.classic] },
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

    apiTest(
      'turns the failure store lifecycle on when enabling the failure store',
      async ({ apiClient, esClient }) => {
        const response = await apiClient.put(testData.API.updateFailureStore(DATA_STREAM), {
          headers: adminHeaders,
          responseType: 'json',
          body: { failureStoreEnabled: true, customRetentionPeriod: '30d' },
        });

        expect(response).toHaveStatusCode(200);
        expect(await getFailureStoreLifecycleEnabled(esClient, DATA_STREAM)).toBe(true);
      }
    );
  }
);

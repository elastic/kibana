/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import { apiTest, testData } from '../fixtures';
import {
  buildDataStreamName,
  deleteDataStreamIfExists,
  getLogsForDataset,
  getWriteBackingIndexName,
  indexLogs,
  rolloverDataStream,
} from '../../common';

const DATASET = 'dq.settings';
const DATA_STREAM = buildDataStreamName({ dataset: DATASET });
const MISSING_DATA_STREAM = buildDataStreamName({ dataset: 'dq.settings.missing' });

/**
 * The integration case keeps the original dataset name: the data stream is the
 * one an installed `synthetics` package would be paired with.
 */
const SYNTHETICS_PACKAGE = 'synthetics';
const SYNTHETICS_DATASET = 'synthetics';
const SYNTHETICS_DATA_STREAM = buildDataStreamName({ dataset: SYNTHETICS_DATASET });

const INGEST_TO = '2024-09-20T11:01:00.000Z';

const expectedPrivileges = (dataStream: string) => ({
  datasetsPrivilages: {
    [dataStream]: {
      canRead: true,
      canMonitor: true,
      canReadFailureStore: true,
      canManageFailureStore: true,
    },
  },
  canViewIntegrations: true,
});

apiTest.describe(
  'Dataset quality - data stream settings',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let adminHeaders: Record<string, string>;

    apiTest.beforeAll(async ({ apiServices, logsSynthtraceEsClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      adminHeaders = { ...testData.COMMON_HEADERS, ...cookieHeader };

      // Pin the install to whatever version the registry currently serves as
      // latest: no assertion here depends on the package contents.
      const packageInfo = await apiServices.fleet.integration.getPackage(SYNTHETICS_PACKAGE);
      await apiServices.fleet.integration.installPackage(
        SYNTHETICS_PACKAGE,
        packageInfo.data.item.version
      );

      await indexLogs(logsSynthtraceEsClient, [
        getLogsForDataset({ dataset: DATASET, to: INGEST_TO, count: 1 }),
        getLogsForDataset({ dataset: SYNTHETICS_DATASET, to: INGEST_TO, count: 1 }),
      ]);
    });

    apiTest.afterAll(async ({ apiServices, esClient, log, logsSynthtraceEsClient }) => {
      await logsSynthtraceEsClient.clean();
      await deleteDataStreamIfExists(esClient, DATA_STREAM, log);
      await deleteDataStreamIfExists(esClient, SYNTHETICS_DATA_STREAM, log);
      await apiServices.fleet.integration.delete(SYNTHETICS_PACKAGE);
    });

    apiTest(
      'returns only the privileges when no matching data stream exists',
      async ({ apiClient }) => {
        const response = await apiClient.get(testData.API.settings(MISSING_DATA_STREAM), {
          headers: adminHeaders,
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body).toStrictEqual({
          datasetUserPrivileges: expectedPrivileges(MISSING_DATA_STREAM),
        });
      }
    );

    apiTest(
      'returns the index template, the last backing index and the privileges',
      async ({ apiClient, esClient }) => {
        const writeIndex = await getWriteBackingIndexName(esClient, DATA_STREAM);

        const response = await apiClient.get(testData.API.settings(DATA_STREAM), {
          headers: adminHeaders,
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body.indexTemplate).toBe('logs');
        expect(response.body.lastBackingIndexName).toBe(writeIndex);
        expect(response.body.lastBackingIndexName).toMatch(/-000001$/);
        expect(response.body.datasetUserPrivileges).toStrictEqual(expectedPrivileges(DATA_STREAM));
      }
    );

    apiTest(
      'reflects a rollover in the last backing index name',
      async ({ apiClient, esClient }) => {
        await rolloverDataStream(esClient, DATA_STREAM);
        const writeIndex = await getWriteBackingIndexName(esClient, DATA_STREAM);

        const response = await apiClient.get(testData.API.settings(DATA_STREAM), {
          headers: adminHeaders,
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body.indexTemplate).toBe('logs');
        expect(response.body.lastBackingIndexName).toBe(writeIndex);
        expect(response.body.lastBackingIndexName).toMatch(/-000002$/);
      }
    );

    apiTest(
      'returns the settings of a data stream paired with an installed integration',
      async ({ apiClient, esClient }) => {
        const writeIndex = await getWriteBackingIndexName(esClient, SYNTHETICS_DATA_STREAM);

        const response = await apiClient.get(testData.API.settings(SYNTHETICS_DATA_STREAM), {
          headers: adminHeaders,
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body.indexTemplate).toBe('logs');
        expect(response.body.lastBackingIndexName).toBe(writeIndex);
        expect(response.body.lastBackingIndexName).toMatch(/-000001$/);
        expect(response.body.datasetUserPrivileges).toStrictEqual(
          expectedPrivileges(SYNTHETICS_DATA_STREAM)
        );
      }
    );

    apiTest(
      'reflects a rollover of the integration data stream in the last backing index name',
      async ({ apiClient, esClient }) => {
        await rolloverDataStream(esClient, SYNTHETICS_DATA_STREAM);
        const writeIndex = await getWriteBackingIndexName(esClient, SYNTHETICS_DATA_STREAM);

        const response = await apiClient.get(testData.API.settings(SYNTHETICS_DATA_STREAM), {
          headers: adminHeaders,
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body.indexTemplate).toBe('logs');
        expect(response.body.lastBackingIndexName).toBe(writeIndex);
        expect(response.body.lastBackingIndexName).toMatch(/-000002$/);
      }
    );
  }
);

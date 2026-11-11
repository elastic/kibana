/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { log, timerange } from '@kbn/synthtrace-client';

import { apiTest, testData } from '../fixtures';
import {
  buildDataStreamName,
  deleteDataStreamIfExists,
  indexLogs,
  monitorRole,
} from '../../common';

const START = '2024-11-05T08:00:00.000Z';
const END = '2024-11-05T08:01:00.000Z';

const DATASET = 'dq.details.access';
const DATA_STREAM = buildDataStreamName({ dataset: DATASET });
const SERVICE_NAME = 'my-service';
const HOST_NAME = 'synth-host';

const detailsUrl = (dataStream: string) =>
  `${testData.API.details(dataStream)}?${new URLSearchParams({
    start: START,
    end: END,
  }).toString()}`;

apiTest.describe(
  'Dataset quality - data stream details',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    apiTest.beforeAll(async ({ logsSynthtraceEsClient }) => {
      await indexLogs(logsSynthtraceEsClient, [
        timerange(START, END)
          .interval('1m')
          .rate(1)
          .generator((timestamp) =>
            log
              .create()
              .message('This is a log message')
              .timestamp(timestamp)
              .dataset(DATASET)
              .defaults({
                'log.file.path': '/my-service.log',
                'service.name': SERVICE_NAME,
                'host.name': HOST_NAME,
              })
          ),
      ]);
    });

    apiTest.afterAll(async ({ esClient, log: scoutLog, logsSynthtraceEsClient }) => {
      await deleteDataStreamIfExists(esClient, DATA_STREAM, scoutLog);
      await logsSynthtraceEsClient.clean();
    });

    apiTest(
      'returns lastActivity as undefined when the user cannot monitor the data stream',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');

        const response = await apiClient.get(detailsUrl(DATA_STREAM), {
          headers: { ...testData.COMMON_HEADERS, ...cookieHeader },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body.lastActivity).toBeUndefined();
        // `viewer` has no `monitor` index privilege.
        expect(response.body.userPrivileges?.canMonitor).toBe(false);
      }
    );

    apiTest('returns an error when dataStream param is blank', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');

      const response = await apiClient.get(detailsUrl(' '), {
        headers: { ...testData.COMMON_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(400);
      expect(response.body.message).toContain('Data Stream name cannot be empty');
    });

    apiTest(
      'returns an empty-data details payload when matching data stream is not available',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');

        const response = await apiClient.get(
          detailsUrl(buildDataStreamName({ dataset: 'dq.details.missing' })),
          {
            headers: { ...testData.COMMON_HEADERS, ...cookieHeader },
            responseType: 'json',
          }
        );

        expect(response).toHaveStatusCode(200);
        expect(response.body.docsCount).toBe(0);
        expect(response.body.degradedDocsCount).toBe(0);
        expect(response.body.services).toStrictEqual({});
        expect(response.body.hosts).toStrictEqual({});
        expect(response.body.sizeBytes).toBe(0);
      }
    );

    apiTest('returns service.name and host.name correctly', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');

      const response = await apiClient.get(detailsUrl(DATA_STREAM), {
        headers: { ...testData.COMMON_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.services).toStrictEqual({ 'service.name': [SERVICE_NAME] });
      expect(response.body.hosts?.['host.name']).toStrictEqual([HOST_NAME]);
    });

    apiTest(
      'returns sizeBytes for a user that can monitor the data stream',
      async ({ apiClient, samlAuth }) => {
        // The permission boundary *is* the test here: only a user holding `monitor`
        // on the data stream gets a size back, so a custom role is required.
        const { cookieHeader } = await samlAuth.asInteractiveUser(monitorRole);

        const requestDetails = async () =>
          apiClient.get(detailsUrl(DATA_STREAM), {
            headers: { ...testData.COMMON_HEADERS, ...cookieHeader },
            responseType: 'json',
          });

        // The metering stats API caches for ~30s, so the first reads can report 0.
        await expect
          .poll(async () => (await requestDetails()).body.sizeBytes, {
            timeout: testData.METERING_CACHE_TIMEOUT_MS,
            intervals: [2_000],
          })
          .toBeGreaterThan(0);

        const response = await requestDetails();

        expect(response).toHaveStatusCode(200);
        expect(Number.isNaN(response.body.sizeBytes)).toBe(false);
        expect(response.body.sizeBytes).toBeGreaterThan(0);
      }
    );
  }
);

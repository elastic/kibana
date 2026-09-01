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
  LOGS_TYPE,
  buildDataStreamName,
  deleteDataStreamIfExists,
  indexLogs,
  noAccessRole,
} from '../../common';

const FROM = '2024-09-20T11:00:00.000Z';
const TO = '2024-09-20T11:01:00.000Z';
/** A window none of the seeded documents fall into. */
const EMPTY_FROM = '2024-09-21T11:00:00.000Z';
const EMPTY_TO = '2024-09-21T11:01:00.000Z';

const DATASET = 'dq.total.logs';
/**
 * Deliberately prefixed with `synthetics` so the suite also covers a dataset whose
 * name collides with another dataset *type* while still living under `logs-*`.
 */
const SYNTHETICS_DATASET = 'synthetics.dq.total';
const DATA_STREAM = buildDataStreamName({ dataset: DATASET });
const SYNTHETICS_DATA_STREAM = buildDataStreamName({ dataset: SYNTHETICS_DATASET });

const SERVICE_NAME = 'my-service';
const HOST_NAME = 'synth-host';

const totalDocsUrl = (start: string, end: string) =>
  `${testData.API.TOTAL_DOCS}?${new URLSearchParams({
    type: LOGS_TYPE,
    start,
    end,
  }).toString()}`;

apiTest.describe(
  'Dataset quality - data stream total docs',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    apiTest.beforeAll(async ({ logsSynthtraceEsClient }) => {
      await indexLogs(logsSynthtraceEsClient, [
        timerange(FROM, TO)
          .interval('1m')
          .rate(1)
          .generator((timestamp) =>
            [DATASET, SYNTHETICS_DATASET].map((dataset) =>
              log
                .create()
                .message('This is a log message')
                .timestamp(timestamp)
                .dataset(dataset)
                .defaults({
                  'log.file.path': '/my-service.log',
                  'service.name': SERVICE_NAME,
                  'host.name': HOST_NAME,
                })
            )
          ),
      ]);
    });

    apiTest.afterAll(async ({ esClient, log: scoutLog, logsSynthtraceEsClient }) => {
      await deleteDataStreamIfExists(esClient, DATA_STREAM, scoutLog);
      await deleteDataStreamIfExists(esClient, SYNTHETICS_DATA_STREAM, scoutLog);
      await logsSynthtraceEsClient.clean();
    });

    apiTest('returns number of documents per data stream', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');

      const response = await apiClient.get(totalDocsUrl(FROM, TO), {
        headers: { ...testData.COMMON_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.totalDocs).toHaveLength(2);
      // Results are ordered by backing index name.
      expect(response.body.totalDocs).toStrictEqual([
        { dataset: DATA_STREAM, count: 1 },
        { dataset: SYNTHETICS_DATA_STREAM, count: 1 },
      ]);
    });

    apiTest(
      'returns empty when all documents are outside the time range',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');

        const response = await apiClient.get(totalDocsUrl(EMPTY_FROM, EMPTY_TO), {
          headers: { ...testData.COMMON_HEADERS, ...cookieHeader },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body.totalDocs).toHaveLength(0);
      }
    );

    apiTest(
      'returns a 403 when the user does not have sufficient privileges',
      async ({ apiClient, samlAuth }) => {
        // The permission boundary is the subject of the test, so a custom role is required.
        const { cookieHeader } = await samlAuth.asInteractiveUser(noAccessRole);

        const response = await apiClient.get(totalDocsUrl(FROM, TO), {
          headers: { ...testData.COMMON_HEADERS, ...cookieHeader },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(403);
      }
    );
  }
);

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { log, timerange } from '@kbn/synthtrace-client';

import type { DataStreamDocsStat } from '../../../../common/api_types';
import { apiTest, testData } from '../fixtures';
import {
  LOGS_TYPE,
  buildDataStreamName,
  closeDataStream,
  deleteDataStreamIfExists,
  indexLogs,
  rolloverDataStream,
} from '../../common';

/** Document counts are asserted per data stream, so this suite owns its own window. */
const FROM = '2024-09-25T11:00:00.000Z';
const TO = '2024-09-25T11:01:00.000Z';

const OPEN_DATASET = 'dq.total.open';
const CLOSED_DATASET = 'dq.total.closed';
const OPEN_DATA_STREAM = buildDataStreamName({ dataset: OPEN_DATASET });
const CLOSED_DATA_STREAM = buildDataStreamName({ dataset: CLOSED_DATASET });

const TOTAL_DOCS_URL = `${testData.API.TOTAL_DOCS}?${new URLSearchParams({
  type: LOGS_TYPE,
  start: FROM,
  end: TO,
}).toString()}`;

const docsFor = (dataset: string) =>
  timerange(FROM, TO)
    .interval('1m')
    .rate(1)
    .generator((timestamp) =>
      log
        .create()
        .message('This is a log message')
        .timestamp(timestamp)
        .dataset(dataset)
        .defaults({ 'log.file.path': '/my-service.log' })
    );

const toStatsByDataset = (docs: DataStreamDocsStat[]): Record<string, { count: number }> =>
  docs.reduce(
    (acc, { dataset, count }) => ({ ...acc, [dataset]: { count } }),
    {} as Record<string, { count: number }>
  );

apiTest.describe(
  'Dataset quality - data stream total docs with closed data streams',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    apiTest.beforeAll(async ({ esClient, logsSynthtraceEsClient }) => {
      await indexLogs(logsSynthtraceEsClient, [docsFor(OPEN_DATASET), docsFor(CLOSED_DATASET)]);

      await closeDataStream(esClient, CLOSED_DATA_STREAM);
    });

    apiTest.afterAll(async ({ esClient, log: scoutLog, logsSynthtraceEsClient }) => {
      await deleteDataStreamIfExists(esClient, OPEN_DATA_STREAM, scoutLog);
      await deleteDataStreamIfExists(esClient, CLOSED_DATA_STREAM, scoutLog);
      await logsSynthtraceEsClient.clean();
    });

    apiTest('returns stats correctly', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');

      const response = await apiClient.get(TOTAL_DOCS_URL, {
        headers: { ...testData.COMMON_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      // The closed data stream is skipped entirely.
      expect(response.body.totalDocs).toHaveLength(1);
      expect(toStatsByDataset(response.body.totalDocs)[OPEN_DATA_STREAM]).toStrictEqual({
        count: 1,
      });
    });

    apiTest(
      'returns stats correctly when some of the backing indices are closed and others are open',
      async ({ apiClient, esClient, samlAuth, logsSynthtraceEsClient }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');

        // Rolling over gives the closed data stream a fresh, open write index.
        await rolloverDataStream(esClient, CLOSED_DATA_STREAM);
        await indexLogs(logsSynthtraceEsClient, [docsFor(OPEN_DATASET), docsFor(CLOSED_DATASET)]);

        const response = await apiClient.get(TOTAL_DOCS_URL, {
          headers: { ...testData.COMMON_HEADERS, ...cookieHeader },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body.totalDocs).toHaveLength(2);

        const statsByDataset = toStatsByDataset(response.body.totalDocs);
        expect(statsByDataset[OPEN_DATA_STREAM]).toStrictEqual({ count: 2 });
        // Only the document written to the new, open backing index is counted.
        expect(statsByDataset[CLOSED_DATA_STREAM]).toStrictEqual({ count: 1 });
      }
    );
  }
);

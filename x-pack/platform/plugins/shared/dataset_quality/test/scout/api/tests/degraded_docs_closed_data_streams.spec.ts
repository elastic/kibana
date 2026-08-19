/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import rison from '@kbn/rison';
import { log, timerange } from '@kbn/synthtrace-client';

import type { DataStreamDocsStat } from '../../../../common/api_types';
import { apiTest, testData } from '../fixtures';
import {
  MORE_THAN_1024_CHARS,
  buildDataStreamName,
  closeDataStream,
  deleteDataStreamIfExists,
  indexLogs,
  rolloverDataStream,
} from '../../common';

/** Document counts are asserted per data stream, so this suite owns its own window. */
const START = '2023-12-15T18:00:00.000Z';
const END = '2023-12-15T18:01:00.000Z';

const OPEN_DATASET = 'dq.degraded.docs.open';
const CLOSED_DATASET = 'dq.degraded.docs.closed';
const OPEN_DATA_STREAM = buildDataStreamName({ dataset: OPEN_DATASET });
const CLOSED_DATA_STREAM = buildDataStreamName({ dataset: CLOSED_DATASET });

const DEGRADED_DOCS_URL = `${testData.API.DEGRADED_DOCS}?${new URLSearchParams({
  types: rison.encodeArray(['logs']),
  start: START,
  end: END,
}).toString()}`;

const degradedDocsFor = (dataset: string) =>
  timerange(START, END)
    .interval('1m')
    .rate(1)
    .generator((timestamp) =>
      log
        .create()
        .message('This is a log message')
        .timestamp(timestamp)
        .dataset(dataset)
        .logLevel(MORE_THAN_1024_CHARS)
        .defaults({ 'log.file.path': '/my-service.log' })
    );

const toStatsByDataset = (docs: DataStreamDocsStat[]): Record<string, { count: number }> =>
  docs.reduce(
    (acc, { dataset, count }) => ({ ...acc, [dataset]: { count } }),
    {} as Record<string, { count: number }>
  );

apiTest.describe(
  'Dataset quality - degraded docs with closed data streams',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    apiTest.beforeAll(async ({ esClient, logsSynthtraceEsClient }) => {
      await indexLogs(logsSynthtraceEsClient, [
        degradedDocsFor(OPEN_DATASET),
        degradedDocsFor(CLOSED_DATASET),
      ]);

      await closeDataStream(esClient, CLOSED_DATA_STREAM);
    });

    apiTest.afterAll(async ({ esClient, log: scoutLog, logsSynthtraceEsClient }) => {
      await deleteDataStreamIfExists(esClient, OPEN_DATA_STREAM, scoutLog);
      await deleteDataStreamIfExists(esClient, CLOSED_DATA_STREAM, scoutLog);
      await logsSynthtraceEsClient.clean();
    });

    apiTest('returns stats correctly', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');

      const response = await apiClient.get(DEGRADED_DOCS_URL, {
        headers: { ...testData.COMMON_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      // The closed data stream is skipped entirely.
      expect(response.body.degradedDocs).toHaveLength(1);
      expect(toStatsByDataset(response.body.degradedDocs)[OPEN_DATA_STREAM]).toStrictEqual({
        count: 1,
      });
    });

    apiTest(
      'returns stats correctly when some of the backing indices are closed and others are open',
      async ({ apiClient, esClient, samlAuth, logsSynthtraceEsClient }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');

        // Rolling over gives the closed data stream a fresh, open write index.
        await rolloverDataStream(esClient, CLOSED_DATA_STREAM);
        await indexLogs(logsSynthtraceEsClient, [
          degradedDocsFor(OPEN_DATASET),
          degradedDocsFor(CLOSED_DATASET),
        ]);

        const response = await apiClient.get(DEGRADED_DOCS_URL, {
          headers: { ...testData.COMMON_HEADERS, ...cookieHeader },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body.degradedDocs).toHaveLength(2);

        const statsByDataset = toStatsByDataset(response.body.degradedDocs);
        expect(statsByDataset[OPEN_DATA_STREAM]).toStrictEqual({ count: 2 });
        // Only the document written to the new, open backing index is counted.
        expect(statsByDataset[CLOSED_DATA_STREAM]).toStrictEqual({ count: 1 });
      }
    );
  }
);

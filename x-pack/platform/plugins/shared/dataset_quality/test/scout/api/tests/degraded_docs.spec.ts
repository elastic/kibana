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
  deleteDataStreamIfExists,
  indexLogs,
} from '../../common';

const START = '2023-12-11T18:00:00.000Z';
const END = '2023-12-11T18:01:00.000Z';

const CLEAN_DATASET = 'dq.degraded.docs.1';
const DEGRADED_DATASET = 'dq.degraded.docs.2';
const CLEAN_DATA_STREAM = buildDataStreamName({ dataset: CLEAN_DATASET });
const DEGRADED_DATA_STREAM = buildDataStreamName({ dataset: DEGRADED_DATASET });

const DEGRADED_DOCS_URL = `${testData.API.DEGRADED_DOCS}?${new URLSearchParams({
  types: rison.encodeArray(['logs']),
  start: START,
  end: END,
}).toString()}`;

apiTest.describe(
  'Dataset quality - degraded docs',
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
              .dataset(CLEAN_DATASET)
              .defaults({ 'log.file.path': '/my-service.log' })
          ),
        timerange(START, END)
          .interval('1m')
          .rate(1)
          .generator((timestamp) =>
            log
              .create()
              .message('This is a log message')
              .timestamp(timestamp)
              .dataset(DEGRADED_DATASET)
              .logLevel(MORE_THAN_1024_CHARS)
              .defaults({ 'log.file.path': '/my-service.log' })
          ),
      ]);
    });

    apiTest.afterAll(async ({ esClient, log: scoutLog, logsSynthtraceEsClient }) => {
      await deleteDataStreamIfExists(esClient, CLEAN_DATA_STREAM, scoutLog);
      await deleteDataStreamIfExists(esClient, DEGRADED_DATA_STREAM, scoutLog);
      await logsSynthtraceEsClient.clean();
    });

    apiTest('returns stats correctly', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');

      const response = await apiClient.get(DEGRADED_DOCS_URL, {
        headers: { ...testData.COMMON_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      // Only the dataset that produced an ignored field is reported.
      expect(response.body.degradedDocs).toHaveLength(1);

      const statsByDataset = (response.body.degradedDocs as DataStreamDocsStat[]).reduce(
        (acc, { dataset, count }) => ({ ...acc, [dataset]: { count } }),
        {} as Record<string, { count: number }>
      );

      expect(statsByDataset[DEGRADED_DATA_STREAM]).toStrictEqual({ count: 1 });
    });
  }
);

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
  ANOTHER_1024_CHARS,
  MORE_THAN_1024_CHARS,
  buildDataStreamName,
  deleteDataStreamIfExists,
  indexLogs,
} from '../../common';

const DATASET = 'dq.field.values.error';
const DATA_STREAM = buildDataStreamName({ dataset: DATASET });
const START = '2024-08-28T08:00:00.000Z';
const END = '2024-08-28T08:02:00.000Z';

/** `test_field` receives two values over `ignore_above: 1024` plus one short one. */
const DEGRADED_FIELD = 'test_field';
/** Mapped, never ignored, so it must report no degraded values. */
const REGULAR_FIELD = 'service.name';

apiTest.describe(
  'Dataset quality - degraded field values per field',
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
              .message('This is a error message')
              .logLevel(MORE_THAN_1024_CHARS)
              .timestamp(timestamp)
              .dataset(DATASET)
              .defaults({
                'log.file.path': '/error.log',
                'service.name': 'my-service1',
                'trace.id': MORE_THAN_1024_CHARS,
                test_field: [ANOTHER_1024_CHARS, 'hello world', MORE_THAN_1024_CHARS],
              })
          ),
      ]);
    });

    apiTest.afterAll(async ({ esClient, log: scoutLog, logsSynthtraceEsClient }) => {
      await deleteDataStreamIfExists(esClient, DATA_STREAM, scoutLog);
      await logsSynthtraceEsClient.clean();
    });

    apiTest(
      'returns no values when provided field has no degraded values',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');

        const response = await apiClient.get(
          testData.API.degradedFieldValues(DATA_STREAM, REGULAR_FIELD),
          {
            headers: { ...testData.COMMON_HEADERS, ...cookieHeader },
            responseType: 'json',
          }
        );

        expect(response).toHaveStatusCode(200);
        expect(response.body.values).toHaveLength(0);
      }
    );

    apiTest(
      'returns values when provided field has degraded values',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');

        const response = await apiClient.get(
          testData.API.degradedFieldValues(DATA_STREAM, DEGRADED_FIELD),
          {
            headers: { ...testData.COMMON_HEADERS, ...cookieHeader },
            responseType: 'json',
          }
        );

        expect(response).toHaveStatusCode(200);
        expect(response.body.values).toHaveLength(2);
      }
    );
  }
);

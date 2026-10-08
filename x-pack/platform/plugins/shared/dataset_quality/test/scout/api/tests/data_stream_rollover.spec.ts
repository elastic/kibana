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
import { buildDataStreamName } from '../../common';

const DATASET = 'synth.rollover';
const DATA_STREAM = buildDataStreamName({ dataset: DATASET });
const START = '2024-10-17T11:00:00.000Z';
const END = '2024-10-17T11:01:00.000Z';

apiTest.describe(
  'Dataset quality - data stream rollover',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    apiTest.beforeAll(async ({ logsSynthtraceEsClient }) => {
      await logsSynthtraceEsClient.index(
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
                'service.name': 'my-service',
                'host.name': 'synth-host',
              })
          )
      );
    });

    apiTest.afterAll(async ({ logsSynthtraceEsClient }) => {
      await logsSynthtraceEsClient.clean();
    });

    apiTest('acknowledges a rollover of the data stream', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');

      const response = await apiClient.post(testData.API.rollover(DATA_STREAM), {
        headers: { ...testData.COMMON_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toMatchObject({ acknowledged: true });
    });
  }
);

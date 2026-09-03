/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { log, timerange } from '@kbn/synthtrace-client';

import type { DegradedField } from '../../../../common/api_types';
import { apiTest, testData } from '../fixtures';
import {
  MORE_THAN_1024_CHARS,
  buildDataStreamName,
  deleteDataStreamIfExists,
  getBackingIndexNames,
  indexLogs,
  rolloverDataStream,
} from '../../common';

const START = '2024-05-22T08:00:00.000Z';
const END = '2024-05-23T08:02:00.000Z';

const CLEAN_DATASET = 'dq.degraded.fields.access';
const DEGRADED_DATASET = 'dq.degraded.fields.error';
const CLEAN_DATA_STREAM = buildDataStreamName({ dataset: CLEAN_DATASET });
const DEGRADED_DATA_STREAM = buildDataStreamName({ dataset: DEGRADED_DATASET });

const SERVICE_NAME = 'my-service';
const HOST_NAME = 'synth-host';

const degradedFieldsUrl = (dataStream: string) =>
  `${testData.API.degradedFields(dataStream)}?${new URLSearchParams({
    start: START,
    end: END,
  }).toString()}`;

apiTest.describe(
  'Dataset quality - degraded fields per data stream',
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
              .defaults({
                'log.file.path': '/my-service.log',
                'service.name': `${SERVICE_NAME}0`,
                'host.name': HOST_NAME,
              })
          ),
        timerange(START, END)
          .interval('1m')
          .rate(1)
          .generator((timestamp) =>
            log
              .create()
              .message('This is a error message')
              .logLevel(MORE_THAN_1024_CHARS)
              .timestamp(timestamp)
              .dataset(DEGRADED_DATASET)
              .defaults({
                'log.file.path': '/error.log',
                'service.name': `${SERVICE_NAME}1`,
                'trace.id': MORE_THAN_1024_CHARS,
              })
          ),
      ]);
    });

    apiTest.afterAll(async ({ esClient, log: scoutLog, logsSynthtraceEsClient }) => {
      await deleteDataStreamIfExists(esClient, CLEAN_DATA_STREAM, scoutLog);
      await deleteDataStreamIfExists(esClient, DEGRADED_DATA_STREAM, scoutLog);
      await logsSynthtraceEsClient.clean();
    });

    apiTest(
      'returns no results when dataStream does not have any degraded fields',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');

        const response = await apiClient.get(degradedFieldsUrl(CLEAN_DATA_STREAM), {
          headers: { ...testData.COMMON_HEADERS, ...cookieHeader },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body.degradedFields).toHaveLength(0);
      }
    );

    apiTest(
      'returns results when dataStream does have degraded fields',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');

        const response = await apiClient.get(degradedFieldsUrl(DEGRADED_DATA_STREAM), {
          headers: { ...testData.COMMON_HEADERS, ...cookieHeader },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body.degradedFields).toHaveLength(2);
        expect(response.body.degradedFields.map(({ name }: DegradedField) => name)).toStrictEqual([
          'log.level',
          'trace.id',
        ]);
      }
    );

    apiTest(
      'returns proper timeSeries data for degraded fields',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');

        const response = await apiClient.get(degradedFieldsUrl(DEGRADED_DATA_STREAM), {
          headers: { ...testData.COMMON_HEADERS, ...cookieHeader },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);

        const logLevelTimeSeries = response.body.degradedFields.find(
          ({ name }: DegradedField) => name === 'log.level'
        )?.timeSeries;

        // Every document of the dataset carries an over-long `log.level`, so the series
        // reflects the document count of each 3h bucket of the queried 24h window.
        expect(logLevelTimeSeries).toStrictEqual([
          { x: 1716357600000, y: 60 },
          { x: 1716368400000, y: 180 },
          { x: 1716379200000, y: 180 },
          { x: 1716390000000, y: 180 },
          { x: 1716400800000, y: 180 },
          { x: 1716411600000, y: 180 },
          { x: 1716422400000, y: 180 },
          { x: 1716433200000, y: 180 },
          { x: 1716444000000, y: 122 },
        ]);
      }
    );

    apiTest(
      'returns the backing index where the ignored field was last seen',
      async ({ apiClient, esClient, samlAuth, logsSynthtraceEsClient }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');

        await rolloverDataStream(esClient, DEGRADED_DATA_STREAM);
        // The new backing index only receives `log.level`, never `trace.id`.
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
                .dataset(DEGRADED_DATASET)
                .defaults({
                  'log.file.path': '/error.log',
                  'service.name': `${SERVICE_NAME}1`,
                })
            ),
        ]);

        const response = await apiClient.get(degradedFieldsUrl(DEGRADED_DATA_STREAM), {
          headers: { ...testData.COMMON_HEADERS, ...cookieHeader },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);

        const [firstBackingIndex, secondBackingIndex] = await getBackingIndexNames(
          esClient,
          DEGRADED_DATA_STREAM
        );

        const findLastPresentIn = (fieldName: string) =>
          response.body.degradedFields.find(({ name }: DegradedField) => name === fieldName)
            ?.indexFieldWasLastPresentIn;

        expect(findLastPresentIn('log.level')).toBe(secondBackingIndex);
        expect(findLastPresentIn('trace.id')).toBe(firstBackingIndex);
      }
    );
  }
);

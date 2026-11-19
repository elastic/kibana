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

import { apiTest, testData } from '../fixtures';
import {
  MORE_THAN_1024_CHARS,
  buildDataStreamName,
  deleteDataStreamIfExists,
  indexLogs,
} from '../../common';

const START = '2025-04-11T08:00:00.000Z';
const END = '2025-04-11T08:05:30.000Z';
const START_MS = new Date(START).getTime();
const MINUTE_MS = 60_000;

/** Six datasets `<prefix>.0` … `<prefix>.5`, each with a different degraded-doc cadence. */
const DATASET_PREFIX = 'dq.chart.access';
const DATASET_COUNT = 6;
const SERVICE_NAME = 'my-service';
const OTHER_SERVICE_NAME = 'my-other-service';

const datasetFor = (index: number) => `${DATASET_PREFIX}.${index}`;
const dataStreamFor = (index: number) => buildDataStreamName({ dataset: datasetFor(index) });

const chartPreviewUrl = ({
  index,
  groupBy = ['_index'],
  interval = '1m',
}: {
  index: string;
  groupBy?: string[];
  interval?: string;
}) =>
  `${testData.API.CHART_PREVIEW}?${new URLSearchParams({
    index,
    groupBy: rison.encodeArray(groupBy),
    start: String(START_MS),
    end: String(new Date(END).getTime()),
    interval,
  }).toString()}`;

apiTest.describe(
  'Dataset quality - degraded docs chart preview',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let viewerHeaders: Record<string, string>;

    apiTest.beforeAll(async ({ logsSynthtraceEsClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');
      viewerHeaders = { ...testData.COMMON_HEADERS, ...cookieHeader };

      await indexLogs(
        logsSynthtraceEsClient,
        Array.from({ length: DATASET_COUNT }, (_, datasetIndex) =>
          timerange(START, END)
            .interval('1m')
            .rate(1)
            .generator((timestamp, docIndex) =>
              log
                .create()
                .message('This is a log message')
                .timestamp(timestamp)
                .dataset(datasetFor(datasetIndex))
                .logLevel(
                  datasetIndex && docIndex % datasetIndex === 0 ? MORE_THAN_1024_CHARS : 'error'
                )
                .defaults({
                  'log.file.path': '/error.log',
                  'service.name':
                    docIndex % 2 ? SERVICE_NAME + datasetIndex : OTHER_SERVICE_NAME + 1,
                  'trace.id':
                    datasetIndex && docIndex % datasetIndex === 0
                      ? MORE_THAN_1024_CHARS
                      : 'trace-id',
                })
            )
        )
      );
    });

    apiTest.afterAll(async ({ esClient, log: scoutLog, logsSynthtraceEsClient }) => {
      for (let datasetIndex = 0; datasetIndex < DATASET_COUNT; datasetIndex++) {
        await deleteDataStreamIfExists(esClient, dataStreamFor(datasetIndex), scoutLog);
      }
      await logsSynthtraceEsClient.clean();
    });

    apiTest(
      'returns proper timeSeries data for degraded fields when querying a single dataStream',
      async ({ apiClient }) => {
        const response = await apiClient.get(
          chartPreviewUrl({ index: `logs-${datasetFor(5)}-*` }),
          {
            headers: viewerHeaders,
            responseType: 'json',
          }
        );

        expect(response).toHaveStatusCode(200);
        // Only the 1st and the 6th document of the dataset are degraded.
        expect(response.body.series).toStrictEqual([
          {
            name: dataStreamFor(5),
            data: [
              { x: START_MS, y: 100 },
              { x: START_MS + MINUTE_MS, y: 0 },
              { x: START_MS + 2 * MINUTE_MS, y: 0 },
              { x: START_MS + 3 * MINUTE_MS, y: 0 },
              { x: START_MS + 4 * MINUTE_MS, y: 0 },
              { x: START_MS + 5 * MINUTE_MS, y: 100 },
            ],
          },
        ]);
      }
    );

    apiTest(
      'returns proper timeSeries data when querying at a specific interval',
      async ({ apiClient }) => {
        const response = await apiClient.get(
          chartPreviewUrl({ index: `logs-${datasetFor(1)}-*`, interval: '5m' }),
          {
            headers: viewerHeaders,
            responseType: 'json',
          }
        );

        expect(response).toHaveStatusCode(200);
        expect(response.body.series).toStrictEqual([
          {
            name: dataStreamFor(1),
            data: [
              { x: START_MS, y: 100 },
              { x: START_MS + 5 * MINUTE_MS, y: 100 },
            ],
          },
        ]);
      }
    );

    apiTest('returns proper timeSeries data grouped using multiple keys', async ({ apiClient }) => {
      const response = await apiClient.get(
        chartPreviewUrl({
          index: `logs-${datasetFor(1)}-*`,
          groupBy: ['_index', 'service.name'],
        }),
        {
          headers: viewerHeaders,
          responseType: 'json',
        }
      );

      expect(response).toHaveStatusCode(200);
      // Every document of dataset `.1` is degraded, and the two services alternate
      // between the buckets, so the groups are exactly out of phase.
      expect(response.body.series).toStrictEqual([
        {
          name: `${dataStreamFor(1)},${OTHER_SERVICE_NAME}1`,
          data: [
            { x: START_MS, y: 100 },
            { x: START_MS + MINUTE_MS, y: 0 },
            { x: START_MS + 2 * MINUTE_MS, y: 100 },
            { x: START_MS + 3 * MINUTE_MS, y: 0 },
            { x: START_MS + 4 * MINUTE_MS, y: 100 },
            { x: START_MS + 5 * MINUTE_MS, y: 0 },
          ],
        },
        {
          name: `${dataStreamFor(1)},${SERVICE_NAME}1`,
          data: [
            { x: START_MS, y: 0 },
            { x: START_MS + MINUTE_MS, y: 100 },
            { x: START_MS + 2 * MINUTE_MS, y: 0 },
            { x: START_MS + 3 * MINUTE_MS, y: 100 },
            { x: START_MS + 4 * MINUTE_MS, y: 0 },
            { x: START_MS + 5 * MINUTE_MS, y: 100 },
          ],
        },
      ]);
    });

    apiTest(
      'returns maximum 5 timeseries but totalGroups indicates that there were more',
      async ({ apiClient }) => {
        const response = await apiClient.get(
          chartPreviewUrl({ index: `logs-${DATASET_PREFIX}.*-*` }),
          {
            headers: viewerHeaders,
            responseType: 'json',
          }
        );

        expect(response).toHaveStatusCode(200);
        expect(response.body.series).toHaveLength(5);
        expect(response.body.totalGroups).toBe(DATASET_COUNT);
      }
    );

    apiTest(
      'returns empty when dataStream does not exist or does not have data reported',
      async ({ apiClient }) => {
        const response = await apiClient.get(
          chartPreviewUrl({ index: 'logs-dq.chart.missing-*' }),
          {
            headers: viewerHeaders,
            responseType: 'json',
          }
        );

        expect(response).toHaveStatusCode(200);
        expect(response.body.series).toHaveLength(0);
        expect(response.body.totalGroups).toBe(0);
      }
    );
  }
);

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
  DEFAULT_NAMESPACE,
  MORE_THAN_1024_CHARS,
  buildDataStreamName,
  deleteDataStreamIfExists,
  indexLogs,
} from '../../common';

/** The response body is asserted exhaustively, so this suite owns its own window. */
const START = '2023-12-14T18:00:00.000Z';
const END = '2023-12-14T18:01:00.000Z';

const NAMESPACES = [DEFAULT_NAMESPACE, 'space1', 'space2'];
const DATASETS_WITHOUT_DEGRADED_DOCS = [
  'dq.dd.nginx.access',
  'dq.dd.apache.access',
  'dq.dd.mysql.access',
];
const DATASETS_WITH_DEGRADED_DOCS = [
  'dq.dd.nginx.error',
  'dq.dd.apache.error',
  'dq.dd.mysql.error',
];

const DEGRADED_DOCS_URL = `${testData.API.DEGRADED_DOCS}?${new URLSearchParams({
  types: rison.encodeArray(['logs']),
  start: START,
  end: END,
}).toString()}`;

apiTest.describe(
  'Dataset quality - degraded docs across data stream namespaces',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    apiTest.beforeAll(async ({ logsSynthtraceEsClient }) => {
      for (const namespace of NAMESPACES) {
        for (const dataset of DATASETS_WITHOUT_DEGRADED_DOCS) {
          await indexLogs(logsSynthtraceEsClient, [
            timerange(START, END)
              .interval('1m')
              .rate(1)
              .generator((timestamp) =>
                log
                  .create()
                  .message('This is a log message')
                  .timestamp(timestamp)
                  .dataset(dataset)
                  .namespace(namespace)
              ),
          ]);
        }

        for (const dataset of DATASETS_WITH_DEGRADED_DOCS) {
          await indexLogs(logsSynthtraceEsClient, [
            timerange(START, END)
              .interval('1m')
              .rate(2)
              .generator((timestamp, index) =>
                log
                  .create()
                  .message('This is a log message')
                  .timestamp(timestamp)
                  .dataset(dataset)
                  .namespace(namespace)
                  // Every other document carries an over-long `log.level`.
                  .logLevel(index % 2 === 0 ? MORE_THAN_1024_CHARS : 'This is a log message')
              ),
          ]);
        }
      }
    });

    apiTest.afterAll(async ({ esClient, log: scoutLog, logsSynthtraceEsClient }) => {
      for (const namespace of NAMESPACES) {
        for (const dataset of [...DATASETS_WITHOUT_DEGRADED_DOCS, ...DATASETS_WITH_DEGRADED_DOCS]) {
          await deleteDataStreamIfExists(
            esClient,
            buildDataStreamName({ dataset, namespace }),
            scoutLog
          );
        }
      }
      await logsSynthtraceEsClient.clean();
    });

    apiTest('returns counts and list of datasets correctly', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');

      const response = await apiClient.get(DEGRADED_DOCS_URL, {
        headers: { ...testData.COMMON_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.degradedDocs).toHaveLength(9);

      // Results are ordered by backing index name, so by dataset and then namespace.
      const expectedDegradedDocs = ['dq.dd.apache.error', 'dq.dd.mysql.error', 'dq.dd.nginx.error']
        .flatMap((dataset) => NAMESPACES.map((namespace) => ({ dataset, namespace })))
        .map(({ dataset, namespace }) => ({
          dataset: buildDataStreamName({ dataset, namespace }),
          count: 1,
        }));

      expect(response.body).toStrictEqual({ degradedDocs: expectedDegradedDocs });
    });
  }
);

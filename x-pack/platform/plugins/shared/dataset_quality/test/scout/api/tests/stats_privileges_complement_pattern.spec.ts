/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import { apiTest, testData } from '../fixtures';
import {
  buildDataStreamName,
  deleteDataStreamIfExists,
  fullAccessRoleWithIndices,
  getLogsForDataset,
  indexLogs,
} from '../../common';

const ACCESSIBLE_DATASET = 'dq.complement.accessible';
const EXCLUDED_DATASET = 'dq.complement.excluded';
const ACCESSIBLE_DATA_STREAM = buildDataStreamName({ dataset: ACCESSIBLE_DATASET });
const EXCLUDED_DATA_STREAM = buildDataStreamName({ dataset: EXCLUDED_DATASET });
const DATA_STREAMS = [ACCESSIBLE_DATA_STREAM, EXCLUDED_DATA_STREAM];
const INGEST_TO = '2023-11-20T15:01:00.000Z';

const complementPatternRole = fullAccessRoleWithIndices([
  {
    names: ['/logs-dq[.]complement[.].*-.*&~(logs-dq[.]complement[.]excluded-.*)/'],
    privileges: ['read', 'view_index_metadata', 'monitor'],
  },
]);

apiTest.describe(
  'Dataset quality - complement-pattern privileges',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    apiTest.beforeAll(async ({ logsSynthtraceEsClient }) => {
      await indexLogs(
        logsSynthtraceEsClient,
        [ACCESSIBLE_DATASET, EXCLUDED_DATASET].map((dataset) =>
          getLogsForDataset({ dataset, to: INGEST_TO, count: 1 })
        )
      );
    });

    apiTest.afterAll(async ({ esClient, log, logsSynthtraceEsClient }) => {
      await logsSynthtraceEsClient.clean();
      for (const dataStream of DATA_STREAMS) {
        await deleteDataStreamIfExists(esClient, dataStream, log);
      }
    });

    apiTest(
      'returns accessible concrete streams without leaking excluded streams',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser(complementPatternRole);

        const response = await apiClient.get(
          testData.buildStatsUrl({ datasetQuery: 'logs-dq.complement.*-*' }),
          {
            headers: { ...testData.COMMON_HEADERS, ...cookieHeader },
            responseType: 'json',
          }
        );

        expect(response).toHaveStatusCode(200);
        expect(response.body.datasetUserPrivileges.datasetsPrivilages).toMatchObject({
          'logs-dq.complement.*-*': { canRead: false, canMonitor: false },
        });

        const returnedDataStreams = response.body.dataStreamsStats.map(
          ({ name }: { name: string }) => name
        );
        expect(returnedDataStreams).toContain(ACCESSIBLE_DATA_STREAM);
        expect(returnedDataStreams).not.toContain(EXCLUDED_DATA_STREAM);

        const totalDocsResponse = await apiClient.get(
          `${testData.API.TOTAL_DOCS}?${new URLSearchParams({
            type: 'logs',
            start: '2023-11-20T15:00:00.000Z',
            end: '2023-11-20T15:02:00.000Z',
          }).toString()}`,
          {
            headers: { ...testData.COMMON_HEADERS, ...cookieHeader },
            responseType: 'json',
          }
        );

        expect(totalDocsResponse).toHaveStatusCode(200);
        const totalDocsByDataStream = Object.fromEntries(
          totalDocsResponse.body.totalDocs.map(
            ({ dataset, count }: { dataset: string; count: number }) => [dataset, count]
          )
        );
        expect(totalDocsByDataStream[ACCESSIBLE_DATA_STREAM]).toBe(1);
        expect(Object.keys(totalDocsByDataStream)).not.toContain(EXCLUDED_DATA_STREAM);
      }
    );
  }
);

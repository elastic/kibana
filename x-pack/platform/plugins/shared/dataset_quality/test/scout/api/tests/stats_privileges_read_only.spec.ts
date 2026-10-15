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
  getLogsForDataset,
  indexLogs,
  readOnlyRole,
} from '../../common';

/**
 * The stats privilege matrix is split one custom role per spec file on purpose.
 * Scout gives each worker a single custom-role slot (`custom_role_worker_N`), so
 * redefining it several times in one file invalidates the sessions issued earlier —
 * on serverless that surfaces as `SAML callback failed: expected 302, got 401`,
 * even for subsequent logins with built-in roles.
 */
const DATASETS = ['dq.priv.readonly.1', 'dq.priv.readonly.2'];
const DATA_STREAMS = DATASETS.map((dataset) => buildDataStreamName({ dataset }));
const INGEST_TO = '2023-11-20T15:01:00.000Z';

apiTest.describe(
  'Dataset quality - data stream stats for a read-only user',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    apiTest.beforeAll(async ({ logsSynthtraceEsClient }) => {
      await indexLogs(
        logsSynthtraceEsClient,
        DATASETS.map((dataset) => getLogsForDataset({ dataset, to: INGEST_TO, count: 1 }))
      );
    });

    apiTest.afterAll(async ({ esClient, log, logsSynthtraceEsClient }) => {
      await logsSynthtraceEsClient.clean();
      for (const dataStream of DATA_STREAMS) {
        await deleteDataStreamIfExists(esClient, dataStream, log);
      }
    });

    apiTest(
      'reports read but not monitor privileges, and no stats',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser(readOnlyRole);

        const response = await apiClient.get(testData.buildStatsUrl({ types: 'logs' }), {
          headers: { ...testData.COMMON_HEADERS, ...cookieHeader },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body.datasetUserPrivileges).toMatchObject({
          datasetsPrivilages: { 'logs-*-*': { canRead: true, canMonitor: false } },
          canViewIntegrations: false,
        });
        // Reading without monitor is not enough to see any statistics.
        expect(response.body.dataStreamsStats).toStrictEqual([]);
      }
    );
  }
);

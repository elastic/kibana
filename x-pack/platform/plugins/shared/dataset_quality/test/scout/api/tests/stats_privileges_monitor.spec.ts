/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import type { DataStreamStat } from '../../../../common/api_types';
import { apiTest, testData } from '../fixtures';
import {
  buildDataStreamName,
  deleteDataStreamIfExists,
  getLogsForDataset,
  indexLogs,
  monitorRole,
} from '../../common';

/**
 * The stats privilege matrix is split one custom role per spec file on purpose.
 * Scout gives each worker a single custom-role slot (`custom_role_worker_N`), so
 * redefining it several times in one file invalidates the sessions issued earlier —
 * on serverless that surfaces as `SAML callback failed: expected 302, got 401`,
 * even for subsequent logins with built-in roles.
 */
const DATASETS = ['dq.priv.monitor.1', 'dq.priv.monitor.2'];
const DATA_STREAMS = DATASETS.map((dataset) => buildDataStreamName({ dataset }));
const INGEST_TO = '2023-11-20T15:01:00.000Z';

apiTest.describe(
  'Dataset quality - data stream stats for a user with monitor privileges',
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

    apiTest('lists the data streams the user may monitor', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser(monitorRole);

      const response = await apiClient.get(testData.buildStatsUrl({ types: 'logs' }), {
        headers: { ...testData.COMMON_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.datasetUserPrivileges.datasetsPrivilages['logs-*-*']).toMatchObject({
        canMonitor: true,
      });

      const privileges = (response.body.dataStreamsStats as DataStreamStat[])
        .filter(({ name }) => DATA_STREAMS.includes(name))
        .map(({ name, userPrivileges: { canMonitor } }) => ({ name, canMonitor }))
        .sort((a, b) => a.name.localeCompare(b.name));

      expect(privileges).toStrictEqual(
        DATA_STREAMS.map((name) => ({ name, canMonitor: true })).sort((a, b) =>
          a.name.localeCompare(b.name)
        )
      );
    });

    apiTest(
      'reports a last activity for each monitored data stream',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser(monitorRole);

        const response = await apiClient.get(testData.buildStatsUrl({ types: 'logs' }), {
          headers: { ...testData.COMMON_HEADERS, ...cookieHeader },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        const stat = (response.body.dataStreamsStats as DataStreamStat[]).find(
          ({ name }) => name === DATA_STREAMS[0]
        );
        expect(stat?.lastActivity).toBeGreaterThan(0);
      }
    );

    // `sizeBytes` comes from the metering API on serverless and `indices.stats` on
    // stateful, so it is asserted on both. Metering caches for ~30s, hence the poll
    // and the raised timeout below.
    apiTest(
      'reports a non-zero size for a monitored data stream',
      async ({ apiClient, samlAuth }) => {
        apiTest.setTimeout(120_000);

        const { cookieHeader } = await samlAuth.asInteractiveUser(monitorRole);
        const headers = { ...testData.COMMON_HEADERS, ...cookieHeader };

        // The metering stats behind `sizeBytes` are cached, so the first reads can
        // legitimately still report 0.
        await expect
          .poll(
            async () => {
              const response = await apiClient.get(testData.buildStatsUrl({ types: 'logs' }), {
                headers,
                responseType: 'json',
              });
              const stats = response.body.dataStreamsStats as DataStreamStat[];
              return stats.find(({ name }) => name === DATA_STREAMS[0])?.sizeBytes;
            },
            { timeout: testData.METERING_CACHE_TIMEOUT_MS, intervals: [2_000] }
          )
          .toBeGreaterThan(0);
      }
    );
  }
);

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
  addIntegrationToLogIndexTemplate,
  buildDataStreamName,
  cleanLogIndexTemplate,
  deleteDataStreamIfExists,
  getLogsForDataset,
  cleanUpAll,
} from '../../common';

const DATASET = 'dq.stats.cat';
const DATA_STREAM = buildDataStreamName({ dataset: DATASET });
const INTEGRATION = 'dq-custom-integration';
const INGEST_TO = '2023-11-20T15:01:00.000Z';

/**
 * Scoped so the assertions cannot be satisfied — or broken — by a data stream another
 * spec left behind; an unscoped request returns whichever logs stream sorts first
 * cluster-wide. `datasetQuery` is used by the route as an index pattern verbatim, so it
 * takes the full data stream name.
 */
const statsForThisDataset = testData.buildStatsUrl({
  types: 'logs',
  datasetQuery: DATA_STREAM,
});

apiTest.describe(
  'Dataset quality - data stream stats of a categorized data stream',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let adminHeaders: Record<string, string>;

    apiTest.beforeAll(async ({ esClient, logsSynthtraceEsClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      adminHeaders = { ...testData.COMMON_HEADERS, ...cookieHeader };

      // Stamping the global `logs` index template makes the data streams created
      // from it report the integration, without installing a package. The data
      // stream has to be created *after* the stamp, as it copies the template
      // metadata on creation.
      await addIntegrationToLogIndexTemplate({ esClient, name: INTEGRATION });
      await logsSynthtraceEsClient.index(
        getLogsForDataset({ dataset: DATASET, to: INGEST_TO, count: 1 })
      );
    });

    apiTest.afterAll(async ({ esClient, log, logsSynthtraceEsClient }) => {
      // This spec stamps the global `logs` index template, so restoring it is mandatory:
      // leaving it stamped makes every other suite report its data as belonging to an
      // integration. The `finally` guarantees the restore even if the data cleanup throws.
      try {
        await cleanUpAll([
          () => logsSynthtraceEsClient.clean(),
          () => deleteDataStreamIfExists(esClient, DATA_STREAM, log),
        ]);
      } finally {
        await cleanLogIndexTemplate({ esClient });
      }
    });

    apiTest('reports the integration that owns the data stream', async ({ apiClient }) => {
      apiTest.setTimeout(120_000);

      // The metering stats that back `sizeBytes` are cached and refreshed
      // periodically, so the first reads can still report 0.
      await expect
        .poll(
          async () => {
            const response = await apiClient.get(statsForThisDataset, {
              headers: adminHeaders,
              responseType: 'json',
            });
            const stats: DataStreamStat[] = response.body.dataStreamsStats;
            return stats.find(({ name }) => name === DATA_STREAM)?.sizeBytes;
          },
          { timeout: testData.METERING_CACHE_TIMEOUT_MS, intervals: [2_000] }
        )
        .toBeGreaterThan(0);

      const response = await apiClient.get(statsForThisDataset, {
        headers: adminHeaders,
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      const stats: DataStreamStat[] = response.body.dataStreamsStats;
      expect(stats).toHaveLength(1);

      const [stat] = stats;
      expect(stat.name).toBe(DATA_STREAM);
      expect(stat.integration).toBe(INTEGRATION);
      expect(stat.sizeBytes).toBeGreaterThan(0);
      expect(stat.lastActivity).toBeGreaterThan(0);
      expect(stat.totalDocs).toBeGreaterThan(0);
    });
  }
);

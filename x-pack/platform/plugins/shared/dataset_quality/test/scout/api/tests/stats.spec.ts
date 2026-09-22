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
import { buildDataStreamName, deleteDataStreamIfExists, getLogsForDataset } from '../../common';

const DATASET = 'dq.stats';
const DATA_STREAM = buildDataStreamName({ dataset: DATASET });
const INGEST_TO = '2023-11-20T15:01:00.000Z';

/**
 * Every request is scoped so the assertions below cannot be satisfied — or broken — by a
 * data stream another spec left behind; reading `dataStreamsStats[0]` from an unscoped
 * response returns whichever stream sorts first cluster-wide.
 *
 * `datasetQuery` is used by the route as an index pattern verbatim (see `getDataStreams`),
 * so it takes the full data stream name here. A bare data set name like `dq.stats` matches
 * nothing.
 */
const statsForThisDataset = (extra: Record<string, string> = {}) =>
  testData.buildStatsUrl({ types: 'logs', datasetQuery: DATA_STREAM, ...extra });

const findThisDataset = (stats: DataStreamStat[]): DataStreamStat => {
  const stat = stats.find(({ name }) => name === DATA_STREAM);
  if (!stat) {
    throw new Error(`${DATA_STREAM} is missing from the stats response`);
  }
  return stat;
};

apiTest.describe(
  'Dataset quality - data stream stats',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let adminHeaders: Record<string, string>;

    apiTest.beforeAll(async ({ logsSynthtraceEsClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      adminHeaders = { ...testData.COMMON_HEADERS, ...cookieHeader };

      await logsSynthtraceEsClient.index(
        getLogsForDataset({ dataset: DATASET, to: INGEST_TO, count: 1 })
      );
    });

    apiTest.afterAll(async ({ esClient, log, logsSynthtraceEsClient }) => {
      await logsSynthtraceEsClient.clean();
      await deleteDataStreamIfExists(esClient, DATA_STREAM, log);
    });

    apiTest('returns the stats of a data stream without an integration', async ({ apiClient }) => {
      apiTest.setTimeout(120_000);

      // The metering stats that back `sizeBytes` are cached and refreshed
      // periodically, so the first reads can still report 0.
      await expect
        .poll(
          async () => {
            const response = await apiClient.get(statsForThisDataset(), {
              headers: adminHeaders,
              responseType: 'json',
            });
            const stats: DataStreamStat[] = response.body.dataStreamsStats;
            return stats.find(({ name }) => name === DATA_STREAM)?.sizeBytes;
          },
          { timeout: testData.METERING_CACHE_TIMEOUT_MS, intervals: [2_000] }
        )
        .toBeGreaterThan(0);

      const response = await apiClient.get(statsForThisDataset(), {
        headers: adminHeaders,
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      const stats: DataStreamStat[] = response.body.dataStreamsStats;
      expect(stats).toHaveLength(1);

      const [stat] = stats;
      expect(stat.name).toBe(DATA_STREAM);
      expect(stat.integration).toBeUndefined();
      expect(stat.sizeBytes).toBeGreaterThan(0);
      expect(stat.lastActivity).toBeGreaterThan(0);
      expect(stat.totalDocs).toBeGreaterThan(0);
    });

    apiTest('does not return the creation date by default', async ({ apiClient }) => {
      const response = await apiClient.get(statsForThisDataset(), {
        headers: adminHeaders,
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      const stats: DataStreamStat[] = response.body.dataStreamsStats;
      expect(findThisDataset(stats).creationDate).toBeUndefined();
    });

    apiTest('returns the creation date when it is requested', async ({ apiClient }) => {
      const response = await apiClient.get(statsForThisDataset({ includeCreationDate: 'true' }), {
        headers: adminHeaders,
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      const stats: DataStreamStat[] = response.body.dataStreamsStats;
      expect(findThisDataset(stats).creationDate).toBeGreaterThan(0);
    });

    apiTest('accepts types and datasetQuery in the same query', async ({ apiClient }) => {
      const response = await apiClient.get(
        testData.buildStatsUrl({ types: 'logs', datasetQuery: DATA_STREAM }),
        {
          headers: adminHeaders,
          responseType: 'json',
        }
      );

      // The contract under test is the query schema: both keys are declared in separate
      // union branches, so it is the intersection that has to accept them together. What
      // `datasetQuery` filters to is asserted by the other tests here, which all scope
      // their request through it.
      expect(response).toHaveStatusCode(200);
    });
  }
);

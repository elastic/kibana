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
  createIndexTemplate,
  deleteDataStreamIfExists,
  deleteIndexTemplateIfExists,
  getLogsForDataset,
} from '../../common';

const LOGS_DATASET = 'dq.stats.multi';
const LOGS_DATA_STREAM = buildDataStreamName({ dataset: LOGS_DATASET });
/**
 * The synthetics documents are written directly with the Elasticsearch client:
 * the Scout synthtrace fixture only exposes a logs client, and a dedicated index
 * template keeps this suite independent from the built-in `synthetics` template.
 */
const SYNTHETICS_DATA_STREAM = 'synthetics-dq.stats-default';
const SYNTHETICS_INDEX_TEMPLATE = 'dq-stats-synthetics';

const INGEST_TO = '2023-11-20T15:01:00.000Z';
const SYNTHETICS_TIMESTAMP = '2023-11-20T15:00:30.000Z';

const findStat = (stats: DataStreamStat[], name: string): DataStreamStat | undefined =>
  stats.find((stat) => stat.name === name);

// Failing: See https://github.com/elastic/kibana/issues/288960
apiTest.describe.skip(
  'Dataset quality - data stream stats across data stream types',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let adminHeaders: Record<string, string>;

    apiTest.beforeAll(async ({ esClient, logsSynthtraceEsClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      adminHeaders = { ...testData.COMMON_HEADERS, ...cookieHeader };

      await logsSynthtraceEsClient.index(
        getLogsForDataset({ dataset: LOGS_DATASET, to: INGEST_TO, count: 1 })
      );

      await createIndexTemplate(esClient, {
        name: SYNTHETICS_INDEX_TEMPLATE,
        indexPatterns: [SYNTHETICS_DATA_STREAM],
      });
      await esClient.bulk({
        index: SYNTHETICS_DATA_STREAM,
        refresh: true,
        operations: [
          { create: {} },
          {
            '@timestamp': SYNTHETICS_TIMESTAMP,
            'monitor.id': 'dq-stats-monitor',
            'monitor.type': 'http',
            'monitor.status': 'up',
          },
          { create: {} },
          {
            '@timestamp': SYNTHETICS_TIMESTAMP,
            'monitor.id': 'dq-stats-monitor',
            'monitor.type': 'http',
            'monitor.status': 'up',
          },
        ],
      });
    });

    apiTest.afterAll(async ({ esClient, log, logsSynthtraceEsClient }) => {
      await logsSynthtraceEsClient.clean();
      await deleteDataStreamIfExists(esClient, LOGS_DATA_STREAM, log);
      await deleteDataStreamIfExists(esClient, SYNTHETICS_DATA_STREAM, log);
      await deleteIndexTemplateIfExists(esClient, SYNTHETICS_INDEX_TEMPLATE, log);
    });

    apiTest('returns the stats of every requested data stream type', async ({ apiClient }) => {
      apiTest.setTimeout(120_000);

      const query = { types: 'logs,synthetics' };

      // The metering stats that back `sizeBytes` are cached and refreshed
      // periodically, so the first reads can still report 0.
      await expect
        .poll(
          async () => {
            const response = await apiClient.get(testData.buildStatsUrl(query), {
              headers: adminHeaders,
              responseType: 'json',
            });
            const stats: DataStreamStat[] = response.body.dataStreamsStats;
            return [
              findStat(stats, LOGS_DATA_STREAM)?.sizeBytes ?? 0,
              findStat(stats, SYNTHETICS_DATA_STREAM)?.sizeBytes ?? 0,
            ].every((sizeBytes) => sizeBytes > 0);
          },
          { timeout: testData.METERING_CACHE_TIMEOUT_MS, intervals: [2_000] }
        )
        .toBe(true);

      const response = await apiClient.get(testData.buildStatsUrl(query), {
        headers: adminHeaders,
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      const stats: DataStreamStat[] = response.body.dataStreamsStats;
      expect(stats).toHaveLength(2);

      for (const name of [LOGS_DATA_STREAM, SYNTHETICS_DATA_STREAM]) {
        const stat = findStat(stats, name);
        expect(stat).toBeDefined();
        expect(stat?.sizeBytes).toBeGreaterThan(0);
        expect(stat?.lastActivity).toBeGreaterThan(0);
        expect(stat?.totalDocs).toBeGreaterThan(0);
      }
    });
  }
);

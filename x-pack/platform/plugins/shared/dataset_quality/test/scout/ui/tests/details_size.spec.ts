/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

import { test, testData } from '../fixtures';
import {
  buildDataStreamName,
  deleteDataStreamIfExists,
  getLogsForDataset,
  indexLogs,
} from '../../common';

/** Size is gated on `canMonitor`, not deployment. The rest of the overview KPI coverage is in details_navigation.spec.ts. */
const DATASET = 'synth.detailssize';
const DATA_STREAM = buildDataStreamName({ dataset: DATASET });
const TO = '2024-01-01T12:00:00.000Z';
const TIME_RANGE = {
  from: '2024-01-01T00:00:00.000Z',
  to: '2024-01-02T00:00:00.000Z',
  refresh: { pause: true, value: 0 },
};

test.describe(
  'Dataset quality details size KPI',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeAll(async ({ logsSynthtraceEsClient }) => {
      await indexLogs(logsSynthtraceEsClient, [
        getLogsForDataset({ to: TO, count: 15, dataset: DATASET }),
      ]);
    });

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test.afterAll(async ({ esClient, log }) => {
      await deleteDataStreamIfExists(esClient, DATA_STREAM, log);
    });

    test('renders a non-zero size for the data set', async ({ page, pageObjects }) => {
      test.setTimeout(150_000);

      await pageObjects.datasetQualityDetails.goto({
        dataStream: DATA_STREAM,
        timeRange: TIME_RANGE,
      });

      // On serverless the KPI is backed by the metering API, which caches for ~30s and
      // reports 0 until it refreshes. Auto-refresh is paused and reading the KPI only
      // re-reads the DOM, so each attempt reloads the page to issue a fresh request —
      // polling the same rendered value would just time out.
      await expect
        .poll(
          async () => {
            await page.reload();
            return parseFloat(await pageObjects.datasetQualityDetails.getSizeKpi());
          },
          { timeout: testData.METERING_CACHE_TIMEOUT_MS, intervals: [5_000] }
        )
        .toBeGreaterThan(0);
    });
  }
);

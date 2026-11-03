/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

import { test, testData } from '../fixtures';
import { datasetNames, getInitialTestLogs, getLogsForDataset, indexLogs } from '../../common';

const TO = '2024-01-01T12:00:00.000Z';
/** Recent enough to count as "active" in the default time range. */
const ACTIVE_TO = new Date().toISOString();
/** One namespace per test, so each one counts only the data sets it seeded. */
const NAMESPACES = {
  healthy: 'dqsummaryhealthy',
  mixed: 'dqsummarymixed',
  size: 'dqsummarysize',
} as const;

test.describe(
  'Dataset quality summary panel',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    // Admin: the estimated data KPI needs the `monitor` index privilege, which neither `viewer`
    // nor `editor` has.
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test('reports every data set as healthy when only good data exists', async ({
      pageObjects,
      logsSynthtraceEsClient,
    }) => {
      await logsSynthtraceEsClient.index(
        getInitialTestLogs({ to: TO, count: 4, namespace: NAMESPACES.healthy })
      );

      await pageObjects.datasetQuality.goto({ filters: { namespaces: [NAMESPACES.healthy] } });

      // The panel can briefly render a stale count while its requests settle, so
      // poll the whole KPI set rather than reading it once.
      await expect
        .poll(async () => pageObjects.datasetQuality.getSummaryPanelKpis(), {
          timeout: testData.STATS_LOAD_TIMEOUT_MS,
        })
        .toStrictEqual({
          datasetHealthPoor: '0',
          datasetHealthDegraded: '0',
          datasetHealthGood: '3',
          activeDatasets: '0 of 3',
        });
    });

    test('reflects poor, degraded and good data sets and the active count', async ({
      pageObjects,
      logsSynthtraceEsClient,
    }) => {
      await indexLogs(logsSynthtraceEsClient, [
        // Good data in all 3 datasets.
        getInitialTestLogs({ to: TO, count: 4, namespace: NAMESPACES.mixed }),
        // Only malformed docs, which makes this dataset "poor".
        getLogsForDataset({
          to: ACTIVE_TO,
          count: 1,
          dataset: datasetNames[1],
          isMalformed: true,
          namespace: NAMESPACES.mixed,
        }),
        // Malformed plus a majority of good docs, which makes this one "degraded".
        getLogsForDataset({
          to: ACTIVE_TO,
          count: 1,
          dataset: datasetNames[2],
          isMalformed: true,
          namespace: NAMESPACES.mixed,
        }),
        getLogsForDataset({
          to: ACTIVE_TO,
          count: 10,
          dataset: datasetNames[2],
          namespace: NAMESPACES.mixed,
        }),
      ]);

      await pageObjects.datasetQuality.goto({ filters: { namespaces: [NAMESPACES.mixed] } });

      await expect
        .poll(async () => pageObjects.datasetQuality.getSummaryPanelKpis(), {
          timeout: testData.STATS_LOAD_TIMEOUT_MS,
        })
        .toStrictEqual({
          datasetHealthPoor: '1',
          datasetHealthDegraded: '1',
          datasetHealthGood: '1',
          activeDatasets: '2 of 3',
        });
    });

    // Parsed rather than checked for non-emptiness: an unprivileged user renders the
    // "N/A" placeholder into this same element, which satisfies any existence check.
    // Size counts documents in the selected range, so seed the active window.
    test('reports a non-zero estimated data size', async ({
      page,
      pageObjects,
      logsSynthtraceEsClient,
    }) => {
      test.setTimeout(testData.METERING_TEST_TIMEOUT_MS);

      await logsSynthtraceEsClient.index(
        getLogsForDataset({
          to: ACTIVE_TO,
          count: 10,
          dataset: datasetNames[0],
          namespace: NAMESPACES.size,
        })
      );

      await pageObjects.datasetQuality.goto({ filters: { namespaces: [NAMESPACES.size] } });

      // Sizes come from the metering API on serverless, which caches for ~30s. Reading
      // the KPI only re-reads the DOM, so reload each attempt to force a fresh request.
      await expect
        .poll(
          async () => {
            await page.reload();
            return parseFloat(await pageObjects.datasetQuality.getEstimatedDataKpi());
          },
          { timeout: testData.METERING_CACHE_TIMEOUT_MS, intervals: [5_000] }
        )
        .toBeGreaterThan(0);
    });
  }
);

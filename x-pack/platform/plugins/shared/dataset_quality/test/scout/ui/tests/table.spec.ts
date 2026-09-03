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
  DEFAULT_NAMESPACE,
  PACKAGES,
  PRODUCTION_NAMESPACE,
  datasetNames,
  ensurePackageInstalled,
  getInitialTestLogs,
  getLogsForDataset,
  indexLogs,
} from '../../common';

const TO = '2024-01-01T12:00:00.000Z';
/** Recent enough that the data set counts as active in the default time range. */
const ACTIVE_TO = new Date().toISOString();
const APACHE_ACCESS_DATASET = 'apache.access';
const APACHE_ACCESS_DISPLAY_NAME = 'Apache access logs';

test.describe(
  'Dataset quality table',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let uninstallApache: () => Promise<void>;

    // Read-only data, so it is seeded once for the whole file. Failure-store
    // scenarios live in failure_store.spec.ts, which owns that cluster state.
    test.beforeAll(async ({ apiServices, logsSynthtraceEsClient }) => {
      uninstallApache = await ensurePackageInstalled(
        apiServices.fleet.integration,
        PACKAGES.apache.name,
        PACKAGES.apache.version
      );

      await indexLogs(logsSynthtraceEsClient, [
        getInitialTestLogs({ to: TO, count: 4 }),
        // Only malformed docs, so this data set reports 100% degraded and is active.
        getLogsForDataset({
          to: ACTIVE_TO,
          count: 1,
          dataset: datasetNames[2],
          isMalformed: true,
        }),
        getLogsForDataset({
          to: TO,
          count: 10,
          dataset: APACHE_ACCESS_DATASET,
          namespace: PRODUCTION_NAMESPACE,
        }),
      ]);
    });

    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.datasetQuality.goto();
    });

    test.afterAll(async ({ logsSynthtraceEsClient }) => {
      await logsSynthtraceEsClient.clean();
      await uninstallApache();
    });

    test('sorts by data set name and shows the namespace', async ({ pageObjects }) => {
      await pageObjects.datasetQuality.sortBy(testData.TABLE_COLUMNS.name, 'descending');

      const names = await pageObjects.datasetQuality.getDatasetNames();
      // The Apache data set sorts last because the integration renames it.
      expect(names).toStrictEqual([...[...datasetNames].reverse(), APACHE_ACCESS_DISPLAY_NAME]);

      expect(
        await pageObjects.datasetQuality.getColumnValues(testData.TABLE_COLUMNS.namespace)
      ).toStrictEqual([
        DEFAULT_NAMESPACE,
        DEFAULT_NAMESPACE,
        DEFAULT_NAMESPACE,
        PRODUCTION_NAMESPACE,
      ]);
    });

    test('shows last activity only for data sets with recent data', async ({ pageObjects }) => {
      const rows = await pageObjects.datasetQuality.parseTable();
      const activityByDataset = new Map(
        rows.map((row) => [
          row[testData.TABLE_COLUMNS.name],
          row[testData.TABLE_COLUMNS.lastActivity],
        ])
      );

      // Only datasetNames[2] was ingested inside the default time range. Its presence is
      // asserted first: `Map.get` on a missing row returns undefined, which would satisfy
      // the "not inactive" check on its own.
      expect([...activityByDataset.keys()]).toContain(datasetNames[2]);
      expect(activityByDataset.get(datasetNames[2])).not.toBe(testData.TEXTS.noActivity);
      expect(activityByDataset.get(datasetNames[0])).toBe(testData.TEXTS.noActivity);
      expect(activityByDataset.get(APACHE_ACCESS_DISPLAY_NAME)).toBe(testData.TEXTS.noActivity);
    });

    test('renders the degraded docs percentage per data set', async ({ pageObjects }) => {
      const rows = await pageObjects.datasetQuality.parseTable();
      const degradedByDataset = new Map(
        rows.map((row) => [
          row[testData.TABLE_COLUMNS.name],
          row[testData.TABLE_COLUMNS.degradedDocs],
        ])
      );

      // Exact degraded document counts are asserted by the API suite; this covers
      // that the count is rendered as a percentage in the right column.
      expect(degradedByDataset.get(datasetNames[2])).toBe('100%');
      expect(degradedByDataset.get(datasetNames[0])).toBe('0%');
    });

    test('shows the data set name supplied by the integration', async ({ pageObjects }) => {
      expect(await pageObjects.datasetQuality.getDatasetNames()).toContain(
        APACHE_ACCESS_DISPLAY_NAME
      );
    });

    test('opens the data set in Discover', async ({ page, pageObjects }) => {
      await pageObjects.datasetQuality.getOpenInDiscoverLink(datasetNames[0]).click();

      await expect.poll(async () => page.url()).toContain('/app/discover');
      // Also asserts which data set opened: the link is built per row, so an off-by-one
      // would still land on Discover, just on the wrong data view.
      await expect.poll(async () => decodeURIComponent(page.url())).toContain(datasetNames[0]);
    });

    test('hides inactive data sets when toggled', async ({ pageObjects }) => {
      const rows = await pageObjects.datasetQuality.parseTable();
      const activeNames = rows
        .filter((row) => row[testData.TABLE_COLUMNS.lastActivity] !== testData.TEXTS.noActivity)
        .map((row) => row[testData.TABLE_COLUMNS.name])
        .sort();

      // Without at least one active data set, and one inactive to hide, the assertion
      // below would hold whatever the toggle did.
      expect(activeNames.length).toBeGreaterThan(0);
      expect(activeNames.length).toBeLessThan(rows.length);

      await pageObjects.datasetQuality.toggleShowInactiveDatasets();

      // Compares the surviving names rather than a row count: EuiBasicTable renders its
      // empty-state message as a real <tr>, so a toggle that wrongly hid every data set
      // would report the same count as one that left a single active row.
      await expect
        .poll(async () => (await pageObjects.datasetQuality.getDatasetNames()).sort())
        .toStrictEqual(activeNames);
    });

    // Formatting only, not a non-zero value: store statistics refresh on their own
    // schedule, so a freshly seeded data set can legitimately read "0.0 B".
    test('renders a formatted size for every data set', async ({ pageObjects }) => {
      const sizes = await pageObjects.datasetQuality.getColumnValues(testData.TABLE_COLUMNS.size);

      expect(sizes.length).toBeGreaterThan(0);
      for (const size of sizes) {
        expect(size).toMatch(/^\d+(\.\d+)? (B|KB|MB|GB|TB)$/);
      }
    });
  }
);

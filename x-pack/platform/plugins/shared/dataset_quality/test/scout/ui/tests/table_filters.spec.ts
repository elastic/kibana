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
  PACKAGES,
  PRODUCTION_NAMESPACE,
  datasetNames,
  ensurePackageInstalled,
  getInitialTestLogs,
  getLogsForDataset,
  indexLogs,
} from '../../common';

const TO = '2024-01-01T12:00:00.000Z';
/**
 * The quality column is computed over the page's selected time range, so the
 * malformed documents that make a data set report "Poor" have to be recent —
 * a fixed past timestamp leaves every data set looking "Good".
 */
const ACTIVE_TO = new Date().toISOString();
const APACHE_ACCESS_DATASET = 'apache.access';
/** The integration supplies a display name, which is what the table renders. */
const APACHE_ACCESS_DISPLAY_NAME = 'Apache access logs';
const APACHE_INTEGRATION_NAME = 'Apache HTTP Server';

const ALL_DATASET_NAMES = [APACHE_ACCESS_DISPLAY_NAME, ...datasetNames];

// Not tagged for logs-essentials: that tier's only assertion lives in
// logs_essentials_filters.spec.ts.
test.describe(
  'Dataset quality table filters',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let uninstallApache: () => Promise<void>;

    // Read-only data, seeded once. Filter state needs no reset — each test gets a
    // fresh browser context.
    test.beforeAll(async ({ apiServices, logsSynthtraceEsClient }) => {
      uninstallApache = await ensurePackageInstalled(
        apiServices.fleet.integration,
        PACKAGES.apache.name,
        PACKAGES.apache.version
      );

      await indexLogs(logsSynthtraceEsClient, [
        getInitialTestLogs({ to: TO, count: 4 }),
        // Malformed docs make this dataset report "Poor" quality.
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

    test('shows full data set names when toggled', async ({ pageObjects }) => {
      await expect
        .poll(async () => pageObjects.datasetQuality.getDatasetNames())
        .toStrictEqual(ALL_DATASET_NAMES);

      await test.step('shows the raw name under the display name when toggled on', async () => {
        await pageObjects.datasetQuality.toggleShowFullDatasetNames();

        const expectedWithRawNames = [
          `${APACHE_ACCESS_DISPLAY_NAME}\n${APACHE_ACCESS_DATASET}`,
          ...datasetNames.map((name) => `${name}\n${name}`),
        ];
        await expect
          .poll(async () => pageObjects.datasetQuality.getDatasetNames())
          .toStrictEqual(expectedWithRawNames);
      });

      await test.step('restores the display names when toggled back off', async () => {
        await pageObjects.datasetQuality.toggleShowFullDatasetNames();

        await expect
          .poll(async () => pageObjects.datasetQuality.getDatasetNames())
          .toStrictEqual(ALL_DATASET_NAMES);
      });
    });

    test('searches the data sets', async ({ pageObjects }) => {
      await test.step('narrows the table to the searched data set', async () => {
        await pageObjects.datasetQuality.search(datasetNames[2]);

        await expect
          .poll(async () => pageObjects.datasetQuality.getDatasetNames())
          .toStrictEqual([datasetNames[2]]);
      });

      await test.step('restores every data set when the search is cleared', async () => {
        await pageObjects.datasetQuality.clearSearch();

        await expect
          .poll(async () => pageObjects.datasetQuality.getDatasetNames())
          .toStrictEqual(ALL_DATASET_NAMES);
      });
    });

    test('filters for an integration', async ({ pageObjects }) => {
      await test.step('keeps only the integration data set when selected', async () => {
        await pageObjects.datasetQuality.filterForIntegrations([APACHE_INTEGRATION_NAME]);

        await expect
          .poll(async () => pageObjects.datasetQuality.getDatasetNames())
          .toStrictEqual([APACHE_ACCESS_DISPLAY_NAME]);
      });

      await test.step('restores every data set when the integration is deselected', async () => {
        await pageObjects.datasetQuality.filterForIntegrations([APACHE_INTEGRATION_NAME]);

        await expect
          .poll(async () => pageObjects.datasetQuality.getDatasetNames())
          .toStrictEqual(ALL_DATASET_NAMES);
      });
    });

    test('filters for a namespace', async ({ pageObjects }) => {
      expect(
        await pageObjects.datasetQuality.getColumnValues(testData.TABLE_COLUMNS.namespace)
      ).toContain(PRODUCTION_NAMESPACE);

      await test.step('keeps only the selected namespace', async () => {
        await pageObjects.datasetQuality.filterForNamespaces([PRODUCTION_NAMESPACE]);

        await expect
          .poll(async () =>
            pageObjects.datasetQuality.getColumnValues(testData.TABLE_COLUMNS.namespace)
          )
          .toStrictEqual([PRODUCTION_NAMESPACE]);
      });

      await test.step('restores every data set when the namespace is deselected', async () => {
        await pageObjects.datasetQuality.filterForNamespaces([PRODUCTION_NAMESPACE]);

        await expect
          .poll(async () => pageObjects.datasetQuality.getDatasetNames())
          .toStrictEqual(ALL_DATASET_NAMES);
      });
    });

    test('filters for a quality', async ({ pageObjects }) => {
      const expectedQuality = testData.TEXTS.qualityPoor;

      expect(
        await pageObjects.datasetQuality.getColumnValues(testData.TABLE_COLUMNS.quality)
      ).toContain(expectedQuality);

      await test.step('keeps only data sets of the selected quality', async () => {
        await pageObjects.datasetQuality.filterForQualities([expectedQuality]);

        await expect
          .poll(async () =>
            pageObjects.datasetQuality.getColumnValues(testData.TABLE_COLUMNS.quality)
          )
          .toStrictEqual([expectedQuality]);
      });

      await test.step('restores every data set when the quality is deselected', async () => {
        await pageObjects.datasetQuality.filterForQualities([expectedQuality]);

        await expect
          .poll(async () => pageObjects.datasetQuality.getDatasetNames())
          .toStrictEqual(ALL_DATASET_NAMES);
      });
    });
  }
);

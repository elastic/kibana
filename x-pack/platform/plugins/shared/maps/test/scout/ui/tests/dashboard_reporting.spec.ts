/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFile } from 'fs/promises';
import type { ScoutPage } from '@kbn/scout';
import { test } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

const KBN_ARCHIVE = 'x-pack/platform/test/functional/fixtures/kbn_archives/maps.json';
const ES_ARCHIVE_LOGSTASH = 'x-pack/platform/test/fixtures/es_archives/logstash_functional';
const ES_ARCHIVE_MAPS_DATA = 'x-pack/platform/test/fixtures/es_archives/maps/data';
const DEFAULT_INDEX_ID = 'c698b940-e149-11e8-a35a-370a8516603a';

// Dashboard ID from the kbn_archives/maps.json fixture
const MAP_EMBEDDABLE_EXAMPLE_DASHBOARD_ID = '19906970-2e40-11e9-85cb-6965aae20f13';

const REPORTING_INDICES = '.reporting-*,.kibana-reporting*';

// Baseline images live in `dashboard_reporting.spec.ts-snapshots`.
// To update them, run the test with `--update-snapshots` and commit the written images.
const MAX_DIFF_PIXEL_RATIO = 0.03;

const GENERATE_ROUTE = '/internal/reporting/generate/';

/**
 * Generates a PNG report from the dashboard export menu and returns the downloaded file.
 * The ID of the generated job is pushed to `generatedJobIds` so cleanup can target only this suite's reports.
 */
const generatePngReport = async (page: ScoutPage, generatedJobIds: string[]) => {
  await page.testSubj.click('exportTopNavButton');
  await page.testSubj.click('exportMenuItem-PNG');
  await expect(page.testSubj.locator('exportItemDetailsFlyout')).toBeVisible();

  const generateResponsePromise = page.waitForResponse(
    (response) => response.url().includes(GENERATE_ROUTE) && response.request().method() === 'POST'
  );
  await page.testSubj.click('generateReportButton');
  const generateResponse = await generateResponsePromise;
  const { job } = await generateResponse.json();
  generatedJobIds.push(job.id);

  const downloadButton = page.testSubj.locator('downloadCompletedReportButton');
  await expect(downloadButton).toBeVisible({ timeout: 120_000 });

  const downloadPromise = page.waitForEvent('download');
  await downloadButton.click();
  const download = await downloadPromise;
  return readFile(await download.path());
};

test.describe(
  'Maps - dashboard reporting: creates a map report',
  {
    tag: '@local-stateful-classic',
  },
  () => {
    let prevDefaultIndex: string | number | boolean | undefined;
    const generatedJobIds: string[] = [];

    test.beforeAll(async ({ kbnClient, esArchiver, uiSettings }) => {
      prevDefaultIndex = await kbnClient.uiSettings.get('defaultIndex');
      await esArchiver.loadIfNeeded(ES_ARCHIVE_LOGSTASH);
      await esArchiver.loadIfNeeded(ES_ARCHIVE_MAPS_DATA);
      await kbnClient.importExport.load(KBN_ARCHIVE);
      await uiSettings.set({ defaultIndex: DEFAULT_INDEX_ID });
    });

    test.beforeEach(async ({ browserAuth, page }, testInfo) => {
      // Baselines are shared across platforms, so do not add the platform suffix to snapshot names.
      testInfo.snapshotSuffix = '';
      // The map extent in the report depends on how much of the page is visible, so match the FTR window size.
      await page.setViewportSize({ width: 1600, height: 1000 });
      await browserAuth.loginAsAdmin();
    });

    test.afterAll(async ({ kbnClient, esClient, uiSettings }) => {
      if (generatedJobIds.length > 0) {
        await esClient.deleteByQuery({
          index: REPORTING_INDICES,
          query: { ids: { values: generatedJobIds } },
          conflicts: 'proceed',
          ignore_unavailable: true,
          allow_no_indices: true,
          refresh: true,
        });
      }
      await kbnClient.savedObjects.cleanStandardList();
      if (prevDefaultIndex !== undefined) {
        await uiSettings.set({ defaultIndex: prevDefaultIndex });
      } else {
        await uiSettings.unset('defaultIndex');
      }
    });

    test('PNG file matches the baseline image, using embeddable example', async ({
      page,
      pageObjects,
    }) => {
      await pageObjects.dashboard.openDashboardWithId(MAP_EMBEDDABLE_EXAMPLE_DASHBOARD_ID);
      const report = await generatePngReport(page, generatedJobIds);
      expect(report).toMatchSnapshot('example-map-report.png', {
        maxDiffPixelRatio: MAX_DIFF_PIXEL_RATIO,
      });
    });
  }
);

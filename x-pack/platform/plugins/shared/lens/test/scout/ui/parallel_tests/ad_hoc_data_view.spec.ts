/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { enableElasticChartDebug, getChartDebugData } from '../fixtures/open_in_lens_helpers';
import {
  createAdHocDataViewFromLens,
  createRuntimeFieldFromEditor,
  switchDataPanelIndexPattern,
  testData,
} from '../fixtures';

declare global {
  interface Window {
    ELASTIC_LENS_CSV_DOWNLOAD_DEBUG?: boolean;
    ELASTIC_LENS_CSV_CONTENT?: Record<string, { content: string; type: string }>;
  }
}

/** Extracts the Discover data view id from a URL (rison `dataViewId:`), matching FTR `getCurrentDataViewId`. */
function getDiscoverDataViewIdFromUrl(url: string): string {
  const matches = [...url.matchAll(/dataViewId:[^,]*/g)].map((match) =>
    decodeURIComponent(match[0]).replace('dataViewId:', '').replaceAll("'", '')
  );
  return matches[0] ?? '';
}

// Matches FTR: ad hoc DV is scoped to functional logstash only (see AD_HOC_DATA_VIEW_NAME).
const AD_HOC_DISCOVER_HITS = '14,005';

// Exact terms(ip) × average(bytes) bars on ad hoc logstash-only DV.
// Lens DEFAULT_SIZE is 9 ("Top 9 values" + Other). FTR forced size 5 when the
// default was lower; setTermsNumberOfValues does not reliably commit in Scout.
const AD_HOC_CHART_EXPECTED_BARS = [
  { x: '97.220.3.248', y: 19755 },
  { x: '169.228.188.120', y: 18994 },
  { x: '78.83.247.30', y: 17246 },
  { x: '226.82.228.233', y: 15687 },
  { x: '93.28.27.24', y: 15614.33 },
  { x: '216.242.201.206', y: 14755.66 },
  { x: '4.125.116.118', y: 14586.5 },
  { x: '133.211.153.90', y: 14185 },
  { x: '226.15.162.241', y: 13747.66 },
  { x: 'Other', y: 5719.23 },
] as const;

const AD_HOC_METRIC_AVERAGE_BYTES = '5,727.322';

spaceTest.describe('Lens ad hoc data view', { tag: tags.stateful.classic }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.set({
      defaultIndex: testData.DATA_VIEW_ID.LOGSTASH,
      'dateFormat:tz': 'UTC',
      'timepicker:timeDefaults': JSON.stringify(testData.LOGSTASH_IN_RANGE_DATES),
    });
  });

  // Each test saves objects; clean up before each test so previous saves don't affect
  // the Visualize listing page (unresolvable ad hoc DV refs can break its fetch).
  // The logstash-* data view is recreated after each cleanup so the app has a valid default.
  spaceTest.beforeEach(async ({ scoutSpace, apiServices, browserAuth }) => {
    await scoutSpace.savedObjects.cleanStandardList();
    await apiServices.dataViews.create({
      title: testData.DATA_VIEW_ID.LOGSTASH,
      // Name must match title so the switcher test subject is `dataView-logstash-*`
      name: testData.DATA_VIEW_ID.LOGSTASH,
      timeFieldName: '@timestamp',
      spaceId: scoutSpace.id,
    });
    await browserAuth.loginAsPrivilegedUser();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex', 'dateFormat:tz', 'timepicker:timeDefaults');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest(
    'should allow building a chart based on ad hoc data view',
    async ({ page, pageObjects, context }) => {
      const { visualize, lens } = pageObjects;

      await enableElasticChartDebug(context);

      await visualize.goto();
      await visualize.openNewVisualizationWizard();
      await visualize.clickVisType('lens');
      await lens.waitForLensApp();

      await createAdHocDataViewFromLens(page, testData.AD_HOC_DATA_VIEW_NAME);

      await lens.configureDimension({
        dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'terms',
        field: 'ip',
      });

      await lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });

      await lens.waitForVisualization('xyVisChart');
      await expect
        .poll(
          async () => {
            const data = await getChartDebugData(page, 'xyVisChart');
            return data.bars![0].bars.map((bar) => ({
              x: bar.x,
              y: Math.floor(bar.y * 100) / 100,
            }));
          },
          { timeout: 30_000 }
        )
        .toStrictEqual([...AD_HOC_CHART_EXPECTED_BARS]);
    }
  );

  // FTR tests 2–4 form a sequential journey sharing browser state;
  // combined into one test with spaceTest.step() per Scout migration guidance.
  spaceTest(
    'should allow managing runtime fields on an ad hoc data view',
    async ({ page, pageObjects }) => {
      const { visualize, lens } = pageObjects;

      await visualize.goto();
      await visualize.openNewVisualizationWizard();
      await visualize.clickVisType('lens');
      await lens.waitForLensApp();

      await createAdHocDataViewFromLens(page, testData.AD_HOC_DATA_VIEW_NAME);
      await lens.switchToVisualization('lnsDatatable');

      await spaceTest.step('add a runtime field and use it in the datatable', async () => {
        await page.testSubj.click('lns-dataView-switch-link');
        await page.testSubj.click('indexPattern-add-field');
        await createRuntimeFieldFromEditor(page, 'runtimefield', "emit('abc')");
        await page.testSubj
          .locator('fieldListLoading')
          .waitFor({ state: 'hidden', timeout: 30_000 });

        await page.testSubj.locator('lnsIndexPatternFieldSearch').fill('runtime');
        const availableRuntimeField = page.testSubj
          .locator('lnsIndexPatternAvailableFields')
          .getByTestId('lnsFieldListPanelField-runtimefield');
        await availableRuntimeField.waitFor({ state: 'visible' });

        const workspace = page.testSubj.locator('lnsWorkspace');
        await availableRuntimeField.dragTo(workspace);
        await lens.waitForVisualization();

        const runtimeHeader = page.testSubj
          .locator('lnsVisualizationContainer')
          .getByRole('columnheader', { name: 'Top 9 values of runtimefield' });
        await expect(runtimeHeader).toBeVisible();
        await expect(
          page.testSubj.locator('lnsVisualizationContainer').getByRole('gridcell', { name: 'abc' })
        ).toBeVisible();
      });

      await spaceTest.step('switch to another data view and back', async () => {
        await page.testSubj.locator('lnsIndexPatternFieldSearch').fill('');
        await switchDataPanelIndexPattern(page, testData.DATA_VIEW_ID.LOGSTASH);
        await expect(page.testSubj.locator('lnsFieldListPanelField-runtimefield')).toHaveCount(0);

        await switchDataPanelIndexPattern(page, testData.AD_HOC_DATA_VIEW_NAME);
        await expect(page.testSubj.locator('lnsFieldListPanelField-runtimefield').first()).toBeVisible();
      });

      await spaceTest.step('remove the runtime field', async () => {
        await page.testSubj.locator('lnsFieldListPanelField-runtimefield').first().click();
        await page.testSubj.locator('fieldPopoverHeader_deleteField-runtimefield').click();
        await expect(
          page.testSubj.locator('fieldPopoverHeader_deleteField-runtimefield')
        ).toBeHidden();

        await page.testSubj.locator('deleteModalConfirmText').fill('remove');
        await page.testSubj.click('confirmModalConfirmButton');

        await expect(page.testSubj.locator('lnsFieldListPanelField-runtimefield')).toHaveCount(0);
      });
    }
  );

  spaceTest(
    'should allow adding an ad-hoc chart to a new dashboard',
    async ({ page, pageObjects }) => {
      const { visualize, lens, dashboard } = pageObjects;

      await visualize.goto();
      await visualize.openNewVisualizationWizard();
      await visualize.clickVisType('lens');
      await lens.waitForLensApp();

      await createAdHocDataViewFromLens(page, testData.AD_HOC_DATA_VIEW_NAME);

      await lens.switchToVisualization('lnsMetric');
      await lens.configureDimension({
        dimension: 'lnsMetric_primaryMetricDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });

      await lens.waitForVisualization('mtrVis');
      const metricData = await lens.getMetricVisualizationData();
      expect(metricData[0].title).toBe('Average of bytes');
      expect(metricData[0].value).toBe(AD_HOC_METRIC_AVERAGE_BYTES);

      await lens.save('New Lens from Modal', { addToDashboard: 'new' });
      await dashboard.waitForRenderComplete();
      await dashboard.expectPanelCount(1);
    }
  );

  spaceTest(
    'should allow saving the ad-hoc chart into a saved object',
    async ({ page, pageObjects, scoutSpace }) => {
      const { visualize, lens } = pageObjects;
      const title = `Lens with adhoc data view ${scoutSpace.id}`;

      await visualize.goto();
      await visualize.openNewVisualizationWizard();
      await visualize.clickVisType('lens');
      await lens.waitForLensApp();

      await createAdHocDataViewFromLens(page, testData.AD_HOC_DATA_VIEW_NAME);

      await lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });

      await lens.switchToVisualization('lnsMetric');
      await lens.waitForVisualization('mtrVis');

      await lens.save(title, { addToDashboard: 'none' });
      await lens.waitForVisualization('mtrVis');

      await expect
        .poll(async () => (await lens.getMetricVisualizationData())[0]?.value, { timeout: 30_000 })
        .toBe(AD_HOC_METRIC_AVERAGE_BYTES);
      const metricData = await lens.getMetricVisualizationData();
      expect(metricData[0].title).toBe('Average of bytes');
    }
  );

  spaceTest(
    'should be possible to share a URL of a visualization with ad hoc data views',
    async ({ page, pageObjects, context }) => {
      const { visualize, lens } = pageObjects;

      await visualize.goto();
      await visualize.openNewVisualizationWizard();
      await visualize.clickVisType('lens');
      await lens.waitForLensApp();

      await createAdHocDataViewFromLens(page, testData.AD_HOC_DATA_VIEW_NAME);

      await lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });

      await lens.switchToVisualization('lnsMetric');
      await lens.waitForVisualization('mtrVis');

      await lens.save(`Lens adhoc share url ${Date.now()}`, { addToDashboard: 'none' });
      await lens.waitForVisualization('mtrVis');

      const url = page.url();

      const newPage = await context.newPage();
      try {
        await newPage.goto(url);
        await newPage
          .getByTestId('lnsMetric_primaryMetricDimensionPanel')
          .waitFor({ state: 'visible' });

        const dimText = await newPage
          .getByTestId('lnsMetric_primaryMetricDimensionPanel')
          .locator('[data-test-subj="lns-dimensionTrigger"]')
          .innerText();
        expect(dimText.trim()).toBe('Average of bytes');
      } finally {
        await newPage.close();
      }
    }
  );

  spaceTest(
    'should be possible to download a visualization with ad hoc data views as CSV',
    async ({ page, pageObjects, scoutSpace }) => {
      const { visualize, lens } = pageObjects;

      await visualize.goto();
      await visualize.openNewVisualizationWizard();
      await visualize.clickVisType('lens');
      await lens.waitForLensApp();

      await createAdHocDataViewFromLens(page, testData.AD_HOC_DATA_VIEW_NAME);

      await lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });

      await lens.switchToVisualization('lnsMetric');
      await lens.waitForVisualization('mtrVis');

      await lens.save(`Lens adhoc csv download ${scoutSpace.id}`, { addToDashboard: 'none' });
      await lens.waitForVisualization('mtrVis');

      await page.evaluate(() => {
        window.ELASTIC_LENS_CSV_DOWNLOAD_DEBUG = true;
      });

      await page.testSubj.click('lnsApp_exportButton');
      await page.testSubj.click('exportMenuItem-CSV');

      const csvContent = await page
        .waitForFunction(() => window.ELASTIC_LENS_CSV_CONTENT, { timeout: 10_000 })
        .then(
          (handle) =>
            handle.jsonValue() as Promise<
              Record<string, { content: string; type: string }> | undefined
            >
        );

      expect(csvContent).toBeTruthy();
      expect(Object.keys(csvContent!)).toHaveLength(1);

      await page.evaluate(() => {
        window.ELASTIC_LENS_CSV_DOWNLOAD_DEBUG = false;
      });
    }
  );

  spaceTest(
    'should navigate to Discover correctly from Lens with an ad hoc data view',
    async ({ page, pageObjects, context }) => {
      const { visualize, lens } = pageObjects;

      await visualize.goto();
      await visualize.openNewVisualizationWizard();
      await visualize.clickVisType('lens');
      await lens.waitForLensApp();

      await createAdHocDataViewFromLens(page, testData.AD_HOC_DATA_VIEW_NAME);

      await lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });

      await lens.switchToVisualization('lnsMetric');
      await lens.waitForVisualization('mtrVis');

      await lens.save(`Lens adhoc discover lens ${Date.now()}`, { addToDashboard: 'none' });
      await lens.waitForVisualization('mtrVis');

      const discoverPagePromise = context.waitForEvent('page');
      await page.testSubj.click('lnsApp_openInDiscover');
      const discoverPage = await discoverPagePromise;

      try {
        const dvSwitch = discoverPage.getByTestId('discover-dataView-switch-link');
        await expect(dvSwitch).toContainText(testData.AD_HOC_DATA_VIEW_NAME);

        const queryHits = discoverPage.getByTestId('discoverQueryHits');
        await expect(queryHits).toHaveText(AD_HOC_DISCOVER_HITS);

        const dvName = await dvSwitch.getAttribute('title');
        await dvSwitch.click();
        const hasBadge = discoverPage.getByTestId(`dataViewItemTempBadge-${dvName}`);
        await expect(hasBadge).toBeVisible();
        await discoverPage.keyboard.press('Escape');

        const prevDvId = getDiscoverDataViewIdFromUrl(discoverPage.url());
        expect(prevDvId).toBeTruthy();

        // Re-open the data view menu — add-field is a menu item, not a standalone button
        await discoverPage.getByTestId('discover-dataView-switch-link').click();
        await discoverPage.getByTestId('indexPattern-add-field').click();
        await createRuntimeFieldFromEditor(
          discoverPage as typeof page,
          '_bytes-runtimefield',
          'emit(doc["bytes"].value.toString())'
        );
        // Discover field list uses fieldToggle-* (same as FTR unifiedFieldList.clickFieldListItemToggle)
        await discoverPage.getByTestId('fieldListFiltersFieldSearch').fill('_bytes-runtimefield');
        const runtimeFieldToggle = discoverPage.getByTestId('fieldToggle-_bytes-runtimefield');
        await expect(runtimeFieldToggle).toBeVisible({ timeout: 30_000 });
        await runtimeFieldToggle.click();

        // Creating a runtime field on an ad hoc data view updates its id in the URL
        await expect
          .poll(() => getDiscoverDataViewIdFromUrl(discoverPage.url()), { timeout: 30_000 })
          .not.toBe(prevDvId);
      } finally {
        await discoverPage.close();
      }
    }
  );

  spaceTest(
    'should navigate to Discover correctly from a dashboard embeddable and persist ad hoc data view after refresh',
    async ({ page, pageObjects, context }) => {
      const { visualize, lens, dashboard } = pageObjects;

      await visualize.goto();
      await visualize.openNewVisualizationWizard();
      await visualize.clickVisType('lens');
      await lens.waitForLensApp();

      await createAdHocDataViewFromLens(page, testData.AD_HOC_DATA_VIEW_NAME);

      await lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });

      await lens.save('embeddable-test-with-adhoc-data-view', { addToDashboard: 'new' });
      await dashboard.waitForRenderComplete();

      const assertDiscoverNavigation = async () => {
        const discoverPagePromise = context.waitForEvent('page');
        await dashboard.clickPanelAction('embeddablePanelAction-ACTION_OPEN_IN_DISCOVER');
        const discoverPage = await discoverPagePromise;

        try {
          const dvSwitch = discoverPage.getByTestId('discover-dataView-switch-link');
          await dvSwitch.waitFor({ state: 'visible' });
          await expect(dvSwitch).toContainText(testData.AD_HOC_DATA_VIEW_NAME);

          const queryHits = discoverPage.getByTestId('discoverQueryHits');
          await expect(queryHits).toHaveText(AD_HOC_DISCOVER_HITS);

          const dvName = await dvSwitch.getAttribute('title');
          await dvSwitch.click();
          const hasBadge = discoverPage.getByTestId(`dataViewItemTempBadge-${dvName}`);
          await expect(hasBadge).toBeVisible();
          await discoverPage.keyboard.press('Escape');
        } finally {
          await discoverPage.close();
        }
      };

      await assertDiscoverNavigation();

      await page.reload();
      await dashboard.waitForRenderComplete();

      await assertDiscoverNavigation();
    }
  );
});

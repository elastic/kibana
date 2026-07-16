/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { enableElasticChartDebug, getChartDebugData } from '../fixtures/open_in_lens_helpers';
import { createAdHocDataViewFromLens, switchDataPanelIndexPattern } from '../fixtures';
import { testData } from '../fixtures';

declare global {
  interface Window {
    ELASTIC_LENS_CSV_DOWNLOAD_DEBUG?: boolean;
    ELASTIC_LENS_CSV_CONTENT?: Record<string, { content: string; type: string }>;
  }
}

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
      name: `scout-ad-hoc-dv-${testData.DATA_VIEW_ID.LOGSTASH}`,
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
        keepOpen: true,
      });
      await lens.setTermsNumberOfValues(5);
      await lens.closeDimensionEditor();

      await lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });

      await lens.waitForVisualization('xyVisChart');
      const data = await getChartDebugData(page, 'xyVisChart');

      // Assert bars are rendered with data (exact values not checked per plan §1b)
      expect(data.bars).toBeDefined();
      expect(data.bars![0].bars.length).toBeGreaterThan(0);
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
        await page.testSubj.locator('fieldEditor').waitFor({ state: 'visible' });

        await page.testSubj.locator('nameField > input').fill('runtimefield');
        const valueToggle = page.testSubj.locator('valueRow > toggle');
        await expect(valueToggle).toHaveAttribute('aria-checked', 'false');
        await valueToggle.click();
        const scriptEditor = page.testSubj.locator('valueRow').locator('.monaco-mouse-cursor-text');
        await scriptEditor.click();
        await page.keyboard.type("emit('abc')");

        await page.testSubj.click('fieldSaveButton');
        await page.testSubj.locator('fieldEditor').waitFor({ state: 'hidden' });
        await page.testSubj
          .locator('fieldListLoading')
          .waitFor({ state: 'hidden', timeout: 30_000 });

        await page.testSubj.locator('lnsIndexPatternFieldSearch').fill('runtime');
        await page.testSubj
          .locator('lnsFieldListPanelField-runtimefield')
          .waitFor({ state: 'visible' });

        const fieldLocator = page.testSubj.locator('lnsFieldListPanelField-runtimefield');
        const workspace = page.testSubj.locator('lnsWorkspace');
        await fieldLocator.dragTo(workspace);
        await lens.waitForVisualization();

        const firstHeader = page.testSubj
          .locator('lnsVisualizationContainer')
          .locator('thead th:first-of-type');
        await firstHeader.waitFor({ state: 'visible' });
        await expect(firstHeader).toHaveText('Top 9 values of runtimefield');

        const firstCell = page.testSubj
          .locator('lnsVisualizationContainer')
          .locator('tbody tr:first-of-type td:first-of-type');
        await firstCell.waitFor({ state: 'visible' });
        await expect(firstCell).toHaveText('abc');
      });

      await spaceTest.step('switch to another data view and back', async () => {
        await switchDataPanelIndexPattern(page, testData.DATA_VIEW_ID.LOGSTASH);
        await expect(page.testSubj.locator('lnsFieldListPanelField-runtimefield')).toBeHidden();

        await switchDataPanelIndexPattern(page, testData.AD_HOC_DATA_VIEW_NAME);
        await page.testSubj
          .locator('lnsFieldListPanelField-runtimefield')
          .waitFor({ state: 'visible' });
      });

      await spaceTest.step('remove the runtime field', async () => {
        await page.testSubj.click('lnsFieldListPanelField-runtimefield');
        await page.testSubj.locator('fieldPopoverHeader_deleteField-runtimefield').click();
        await expect(
          page.testSubj.locator('fieldPopoverHeader_deleteField-runtimefield')
        ).toBeHidden();

        await page.testSubj.locator('deleteModalConfirmText').fill('remove');
        await page.testSubj.click('confirmModalConfirmButton');

        await expect(page.testSubj.locator('lnsFieldListPanelField-runtimefield')).toBeHidden();
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
      expect(metricData[0].value).toBe('5,727.322');
      expect(metricData[0].title).toBe('Average of bytes');

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

      await lens.save(title);
      await lens.waitForVisualization('mtrVis');

      const metricData = await lens.getMetricVisualizationData();
      expect(metricData[0].value).toBe('5,727.322');
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

      await lens.save(`Lens adhoc share url ${Date.now()}`);
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

      await lens.save(`Lens adhoc csv download ${scoutSpace.id}`);
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

      await lens.save(`Lens adhoc discover lens ${Date.now()}`);
      await lens.waitForVisualization('mtrVis');

      const discoverPagePromise = context.waitForEvent('page');
      await page.testSubj.click('lnsApp_openInDiscover');
      const discoverPage = await discoverPagePromise;

      try {
        const dvSwitch = discoverPage.getByTestId('discover-dataView-switch-link');
        await dvSwitch.waitFor({ state: 'visible' });
        await expect(dvSwitch).toContainText(testData.AD_HOC_DATA_VIEW_NAME);

        const queryHits = discoverPage.getByTestId('discoverQueryHits');
        await expect(queryHits).toHaveText('14,005');

        const dvName = await dvSwitch.getAttribute('title');
        await dvSwitch.click();
        const hasBadge = discoverPage.getByTestId(`dataViewItemTempBadge-${dvName}`);
        await expect(hasBadge).toBeVisible();
        await discoverPage.keyboard.press('Escape');

        const prevDvId = new URL(discoverPage.url()).searchParams.get('_a') ?? '';

        await discoverPage.getByTestId('indexPattern-add-field').click();

        const flyout = discoverPage.getByTestId('fieldEditor');
        await flyout.waitFor({ state: 'visible' });
        await discoverPage.getByTestId('nameField').locator('input').fill('_bytes-runtimefield');

        const valueToggle = discoverPage.getByTestId('valueRow').getByTestId('toggle');
        await expect(valueToggle).toHaveAttribute('aria-checked', 'false');
        await valueToggle.click();
        const scriptEditor = discoverPage
          .getByTestId('valueRow')
          .locator('.monaco-mouse-cursor-text');
        await scriptEditor.click();
        await discoverPage.keyboard.type('emit(doc["bytes"].value.toString())');
        await discoverPage.getByTestId('fieldSaveButton').click();
        await flyout.waitFor({ state: 'hidden' });
        await discoverPage.getByTestId('unifiedFieldListItemToggle-_bytes-runtimefield').click();

        const newDvId = new URL(discoverPage.url()).searchParams.get('_a') ?? '';
        expect(newDvId).not.toBe(prevDvId);
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
          await expect(queryHits).toHaveText('14,005');

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

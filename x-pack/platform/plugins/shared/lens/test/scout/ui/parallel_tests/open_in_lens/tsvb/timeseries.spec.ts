/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { testData, createOpenInLensSuiteSetup } from '../../../fixtures';

spaceTest.describe('TSVB Timeseries - Open in Lens', { tag: tags.deploymentAgnostic }, () => {
  const openInLensSuite = createOpenInLensSuiteSetup({
    archivePath: testData.KBN_ARCHIVE_PATHS.OPEN_IN_LENS.TSVB.TIMESERIES,
    dashboardTitles: testData.DASHBOARD_TITLES.OPEN_IN_LENS.TSVB.TIMESERIES,
  });

  spaceTest.beforeAll(openInLensSuite.beforeAll);

  spaceTest.beforeEach(openInLensSuite.beforeEach);

  spaceTest.afterAll(openInLensSuite.afterAll);

  // Negative cases grouped — these don't navigate away from the dashboard,
  // so they can share one browser context via test.step().
  spaceTest('should check Convert to Lens action availability', async ({ pageObjects }) => {
    const { dashboard } = pageObjects;

    await spaceTest.step('invalid panel has no Convert to Lens action', async () => {
      const hasAction = await dashboard.panelHasAction(
        testData.DATA_TEST_SUBJECTS.OPEN_IN_LENS_ACTION,
        'Timeseries -  Invalid panel'
      );
      expect(hasAction).toBe(false);
    });

    await spaceTest.step('unsupported aggregations have no Convert to Lens action', async () => {
      const hasAction = await dashboard.panelHasAction(
        testData.DATA_TEST_SUBJECTS.OPEN_IN_LENS_ACTION,
        'Timeseries -  Unsupported aggregations'
      );
      expect(hasAction).toBe(false);
    });
  });

  spaceTest('should convert basic timeseries to Lens', async ({ page, pageObjects }) => {
    const { dashboard, lens } = pageObjects;
    await dashboard.clickPanelAction(
      testData.DATA_TEST_SUBJECTS.OPEN_IN_LENS_ACTION,
      'Timeseries -  Basic'
    );
    await lens.waitForVisualization('xyVisChart');

    const dimensions = page.testSubj.locator('lns-dimensionTrigger');
    await expect(dimensions).toHaveText(['@timestamp', 'Count of records']);
  });

  spaceTest('should preserve app filters in Lens', async ({ pageObjects }) => {
    const { dashboard, lens } = pageObjects;
    await dashboard.clickPanelAction(
      testData.DATA_TEST_SUBJECTS.OPEN_IN_LENS_ACTION,
      'Timeseries - With filter'
    );
    await lens.waitForVisualization('xyVisChart');

    expect(await pageObjects.filterBar.hasFilter({ field: 'extension', value: 'css' })).toBe(true);
  });

  spaceTest('should preserve query in Lens', async ({ page, pageObjects }) => {
    const { dashboard, lens } = pageObjects;
    await dashboard.clickPanelAction(
      testData.DATA_TEST_SUBJECTS.OPEN_IN_LENS_ACTION,
      'Timeseries - With query'
    );
    await lens.waitForVisualization('xyVisChart');

    await expect(page.testSubj.locator('queryInput')).toHaveValue('machine.os : ios');
  });

  spaceTest('should draw a reference line', async ({ page, pageObjects }) => {
    const { dashboard, lens } = pageObjects;
    await dashboard.clickPanelAction(
      testData.DATA_TEST_SUBJECTS.OPEN_IN_LENS_ACTION,
      'Timeseries -  Reference line'
    );
    await lens.waitForVisualization('xyVisChart');

    // Check reference line layer
    const referenceLineTab = page.getByRole('tab', { name: 'Reference line' });
    await referenceLineTab.click();

    const layers = page.locator('[data-test-subj^="lns-layerPanel-"]');
    const referenceLineDimensions = layers
      .filter({ hasText: 'Static value' })
      .locator('[data-test-subj="lns-dimensionTrigger"]');
    await expect(referenceLineDimensions).toHaveText(['Static value: 10']);

    // Check data layer
    const dataLayerTab = page.getByRole('tab', { name: 'Data layer' });
    await dataLayerTab.click();

    const dataLayerDimensions = layers
      .filter({ hasText: '@timestamp' })
      .locator('[data-test-subj="lns-dimensionTrigger"]');
    await expect(dataLayerDimensions).toHaveText(['@timestamp', 'Count of records']);
  });

  spaceTest('should convert metric agg with params', async ({ page, pageObjects }) => {
    const { dashboard, lens } = pageObjects;
    await dashboard.clickPanelAction(
      testData.DATA_TEST_SUBJECTS.OPEN_IN_LENS_ACTION,
      'Timeseries -  Agg with params'
    );
    await lens.waitForVisualization('xyVisChart');

    const dimensions = page.testSubj.locator('lns-dimensionTrigger');
    await expect(dimensions).toHaveText(['@timestamp', 'Counter rate of machine.ram per second']);
  });

  spaceTest(
    'should convert parent pipeline aggregation with terms',
    async ({ page, pageObjects }) => {
      const { dashboard, lens } = pageObjects;
      await dashboard.clickPanelAction(
        testData.DATA_TEST_SUBJECTS.OPEN_IN_LENS_ACTION,
        'Timeseries -  Parent pipeline agg'
      );
      await lens.waitForVisualization('xyVisChart');

      const dimensions = page.testSubj.locator('lns-dimensionTrigger');
      await expect(dimensions).toHaveText([
        '@timestamp',
        'Cumulative sum of Records',
        'Top 10 values of extension.raw',
      ]);
    }
  );

  spaceTest(
    'should convert sibling pipeline aggregation with terms',
    async ({ page, pageObjects }) => {
      const { dashboard, lens } = pageObjects;
      await dashboard.clickPanelAction(
        testData.DATA_TEST_SUBJECTS.OPEN_IN_LENS_ACTION,
        'Timeseries - Sibling pipeline agg'
      );
      await lens.waitForVisualization('xyVisChart');

      const dimensions = page.testSubj.locator('lns-dimensionTrigger');
      await expect(dimensions).toHaveText([
        '@timestamp',
        'overall_average(count())',
        'Top 10 values of extension.raw',
      ]);
    }
  );

  spaceTest(
    'should bring ignore global filters at series level over',
    async ({ page, pageObjects }) => {
      const { dashboard, lens } = pageObjects;
      await dashboard.clickPanelAction(
        testData.DATA_TEST_SUBJECTS.OPEN_IN_LENS_ACTION,
        'Timeseries - Ignore global filters series'
      );
      await lens.waitForVisualization('xyVisChart');
      await expect(page.testSubj.locator('lnsChangeIndexPatternIgnoringFilters')).toBeVisible();
    }
  );

  spaceTest(
    'should bring ignore global filters at panel level over',
    async ({ page, pageObjects }) => {
      const { dashboard, lens } = pageObjects;
      await dashboard.clickPanelAction(
        testData.DATA_TEST_SUBJECTS.OPEN_IN_LENS_ACTION,
        'Timeseries - Ignore global filters panel'
      );
      await lens.waitForVisualization('xyVisChart');
      await expect(page.testSubj.locator('lnsChangeIndexPatternIgnoringFilters')).toBeVisible();
    }
  );

  // This "back to TSVB" round-trip is only tested here (timeseries) because the
  // back-navigation logic lives in the Lens app (app_helpers.ts), not in TSVB
  // conversion code — it behaves identically for all TSVB panel types.
  spaceTest(
    'should navigate back to TSVB when the Back button is clicked',
    async ({ page, pageObjects, config }) => {
      // Stateful only — editPanel on by-reference panels requires visualize_v2.save,
      // which is not available in serverless roles. Original FTR test was stateful-only too.
      spaceTest.skip(!!config.serverless, 'editPanel not available on serverless');
      const { dashboard, lens } = pageObjects;

      await spaceTest.step('open TSVB panel in Visualize editor', async () => {
        await dashboard.clickPanelAction('embeddablePanelAction-editPanel', 'Timeseries -  Basic');
        await expect(page.testSubj.locator('tvbVisEditor')).toBeVisible();
      });

      await spaceTest.step('convert to Lens from Visualize editor', async () => {
        await page.testSubj.locator('visualizeEditInLensButton').click();
        await lens.waitForVisualization('xyVisChart');
      });

      await spaceTest.step('click back button and verify return to TSVB', async () => {
        await expect(page.testSubj.locator('lnsApp_goBackToAppButton')).toBeVisible();
        await page.testSubj.locator('lnsApp_goBackToAppButton').click();
        await expect(page.testSubj.locator('tvbVisEditor')).toBeVisible();
      });
    }
  );
});

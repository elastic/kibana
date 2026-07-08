/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { testData, createOpenInLensSuiteSetup } from '../../../fixtures';

spaceTest.describe('TSVB Metric - Open in Lens', { tag: tags.deploymentAgnostic }, () => {
  const openInLensSuite = createOpenInLensSuiteSetup({
    archivePath: testData.KBN_ARCHIVE_PATHS.OPEN_IN_LENS.TSVB.METRIC,
    dashboardTitles: testData.DASHBOARD_TITLES.OPEN_IN_LENS.TSVB.METRIC,
  });

  spaceTest.beforeAll(openInLensSuite.beforeAll);

  spaceTest.beforeEach(openInLensSuite.beforeEach);

  spaceTest.afterAll(openInLensSuite.afterAll);

  // Negative cases grouped — these don't navigate away from the dashboard,
  // so they can share one browser context via test.step().
  spaceTest('should check Convert to Lens action availability', async ({ pageObjects }) => {
    const { dashboard } = pageObjects;

    await spaceTest.step('unsupported metric has no Convert to Lens action', async () => {
      const hasAction = await dashboard.panelHasAction(
        testData.DATA_TEST_SUBJECTS.OPEN_IN_LENS_ACTION,
        'Metric - Unsupported metric'
      );
      expect(hasAction).toBe(false);
    });

    await spaceTest.step('invalid panel has no Convert to Lens action', async () => {
      const hasAction = await dashboard.panelHasAction(
        testData.DATA_TEST_SUBJECTS.OPEN_IN_LENS_ACTION,
        'Metric - Invalid panel'
      );
      expect(hasAction).toBe(false);
    });

    await spaceTest.step('basic metric has Convert to Lens action', async () => {
      const hasAction = await dashboard.panelHasAction(
        testData.DATA_TEST_SUBJECTS.OPEN_IN_LENS_ACTION,
        'Metric - Basic'
      );
      expect(hasAction).toBe(true);
    });
  });

  spaceTest('should convert basic metric to Lens', async ({ page, pageObjects }) => {
    const { dashboard } = pageObjects;
    await dashboard.clickPanelAction(
      testData.DATA_TEST_SUBJECTS.OPEN_IN_LENS_ACTION,
      'Metric - Basic'
    );
    await expect(page.testSubj.locator('mtrVis')).toBeVisible();
    await expect(page.testSubj.locator('mtrVis').getByText('Count of records')).toBeVisible();
  });

  spaceTest('should convert static value', async ({ page, pageObjects }) => {
    const { dashboard } = pageObjects;
    await dashboard.clickPanelAction(
      testData.DATA_TEST_SUBJECTS.OPEN_IN_LENS_ACTION,
      'Metric - Static value'
    );
    await expect(page.testSubj.locator('mtrVis')).toBeVisible();
    const dimensions = page.testSubj.locator('lns-dimensionTrigger');
    await expect(dimensions).toHaveCount(1);
    await expect(dimensions.getByText('10')).toBeVisible();
  });

  spaceTest('should convert metric agg with params', async ({ page, pageObjects }) => {
    const { dashboard } = pageObjects;
    await dashboard.clickPanelAction(
      testData.DATA_TEST_SUBJECTS.OPEN_IN_LENS_ACTION,
      'Metric - Agg with params'
    );
    await expect(page.testSubj.locator('mtrVis')).toBeVisible();
    const dimensions = page.testSubj.locator('lns-dimensionTrigger');
    await expect(dimensions).toHaveCount(1);
    await expect(dimensions.getByText('Count of bytes')).toBeVisible();
  });

  spaceTest('should convert color ranges', async ({ page, pageObjects }) => {
    const { dashboard, lens } = pageObjects;
    await dashboard.clickPanelAction(
      testData.DATA_TEST_SUBJECTS.OPEN_IN_LENS_ACTION,
      'Metric - Color ranges'
    );
    await expect(page.testSubj.locator('mtrVis')).toBeVisible();
    const dimensions = page.testSubj.locator('lns-dimensionTrigger');
    await expect(dimensions).toHaveCount(1);

    // Open the metric dimension editor and verify converted palette color stops
    await dimensions.locator('nth=0').click();
    await lens.openPalettePanelFlyout();
    const colorStops = await lens.getPaletteColorStops(2);
    // Converted color rule from TSVB background_color_rules
    expect(colorStops).toStrictEqual([
      { stop: '10', color: 'rgba(84, 179, 153, 1)' },
      { stop: '', color: undefined },
    ]);
    await lens.closePalettePanelFlyout();
    await lens.closeDimensionEditorPanel();
  });

  spaceTest(
    'should bring ignore global filters at series level over',
    async ({ page, pageObjects }) => {
      const { dashboard } = pageObjects;
      await dashboard.clickPanelAction(
        testData.DATA_TEST_SUBJECTS.OPEN_IN_LENS_ACTION,
        'Metric - Ignore global filters series'
      );
      await expect(page.testSubj.locator('mtrVis')).toBeVisible();
      await expect(page.testSubj.locator('lnsChangeIndexPatternIgnoringFilters')).toBeVisible();
    }
  );

  spaceTest(
    'should bring ignore global filters at panel level over',
    async ({ page, pageObjects }) => {
      const { dashboard } = pageObjects;
      await dashboard.clickPanelAction(
        testData.DATA_TEST_SUBJECTS.OPEN_IN_LENS_ACTION,
        'Metric - Ignore global filters panel'
      );
      await expect(page.testSubj.locator('mtrVis')).toBeVisible();
      await expect(page.testSubj.locator('lnsChangeIndexPatternIgnoringFilters')).toBeVisible();
    }
  );
});

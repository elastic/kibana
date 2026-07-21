/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { testData, createOpenInLensSuiteSetup } from '../../../fixtures';

spaceTest.describe('TSVB Table - Open in Lens', { tag: tags.deploymentAgnostic }, () => {
  const openInLensSuite = createOpenInLensSuiteSetup({
    archivePath: testData.KBN_ARCHIVE_PATHS.OPEN_IN_LENS.TSVB.TABLE,
    dashboardTitles: testData.DASHBOARD_TITLES.OPEN_IN_LENS.TSVB.TABLE,
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
        'Table - Invalid panel'
      );
      expect(hasAction).toBe(false);
    });

    await spaceTest.step('unsupported aggregations have no Convert to Lens action', async () => {
      const hasAction = await dashboard.panelHasAction(
        testData.DATA_TEST_SUBJECTS.OPEN_IN_LENS_ACTION,
        'Table - Unsupported agg'
      );
      expect(hasAction).toBe(false);
    });

    await spaceTest.step(
      'sibling pipeline aggregations have no Convert to Lens action',
      async () => {
        const hasAction = await dashboard.panelHasAction(
          testData.DATA_TEST_SUBJECTS.OPEN_IN_LENS_ACTION,
          'Table - Sibling pipeline agg'
        );
        expect(hasAction).toBe(false);
      }
    );

    await spaceTest.step(
      'parent pipeline aggregations have no Convert to Lens action',
      async () => {
        const hasAction = await dashboard.panelHasAction(
          testData.DATA_TEST_SUBJECTS.OPEN_IN_LENS_ACTION,
          'Table - Parent pipeline agg'
        );
        expect(hasAction).toBe(false);
      }
    );

    await spaceTest.step('invalid aggregation function has no Convert to Lens action', async () => {
      const hasAction = await dashboard.panelHasAction(
        testData.DATA_TEST_SUBJECTS.OPEN_IN_LENS_ACTION,
        'Table - Invalid agg'
      );
      expect(hasAction).toBe(false);
    });

    await spaceTest.step(
      'different aggregation function has no Convert to Lens action',
      async () => {
        const hasAction = await dashboard.panelHasAction(
          testData.DATA_TEST_SUBJECTS.OPEN_IN_LENS_ACTION,
          'Table - Different agg function'
        );
        expect(hasAction).toBe(false);
      }
    );
  });

  spaceTest(
    'should convert basic count aggregation table to Lens',
    async ({ page, pageObjects }) => {
      const { dashboard, lens } = pageObjects;
      await dashboard.clickPanelAction(
        testData.DATA_TEST_SUBJECTS.OPEN_IN_LENS_ACTION,
        'Table - Basic'
      );
      await lens.waitForVisualization('lnsDataTable');

      const dimensions = page.testSubj
        .locator('lnsDatatable_metrics')
        .locator('[data-test-subj="lns-dimensionTrigger"]');
      await expect(dimensions.filter({ hasText: 'Count of records' })).toBeVisible();
    }
  );

  spaceTest(
    'should convert last value mode to reduced time range',
    async ({ page, pageObjects }) => {
      const { dashboard, lens } = pageObjects;
      await dashboard.clickPanelAction(
        testData.DATA_TEST_SUBJECTS.OPEN_IN_LENS_ACTION,
        'Table - Last value mode'
      );
      await lens.waitForVisualization('lnsDataTable');

      const dimensions = page.testSubj
        .locator('lnsDatatable_metrics')
        .locator('[data-test-subj="lns-dimensionTrigger"]');
      await expect(dimensions.filter({ hasText: 'Count of records last 1m' })).toBeVisible();
    }
  );

  spaceTest(
    'should convert static value to the metric dimension',
    async ({ page, pageObjects }) => {
      const { dashboard, lens } = pageObjects;
      await dashboard.clickPanelAction(
        testData.DATA_TEST_SUBJECTS.OPEN_IN_LENS_ACTION,
        'Table - Static value'
      );
      await lens.waitForVisualization('lnsDataTable');

      const dimensions = page.testSubj
        .locator('lnsDatatable_metrics')
        .locator('[data-test-subj="lns-dimensionTrigger"]');
      await expect(dimensions).toHaveText(['Count of records', '10']);
    }
  );

  spaceTest('should convert aggregate by to split row dimension', async ({ page, pageObjects }) => {
    const { dashboard, lens } = pageObjects;
    await dashboard.clickPanelAction(
      testData.DATA_TEST_SUBJECTS.OPEN_IN_LENS_ACTION,
      'Table - Agg by'
    );
    await lens.waitForVisualization('lnsDataTable');

    const splitRows = page.testSubj
      .locator('lnsDatatable_rows')
      .locator('[data-test-subj="lns-dimensionTrigger"]');
    await expect(splitRows).toHaveText([
      'Top 10 values of machine.os.raw',
      'Top 10 values of clientip',
    ]);

    await lens.openDimensionEditor('lnsDatatable_rows > lns-dimensionTrigger', 0, 1);
    await expect(page.testSubj.locator('indexPattern-collapse-by')).toHaveValue('sum');
  });

  spaceTest('should convert group by field with custom label', async ({ page, pageObjects }) => {
    const { dashboard, lens } = pageObjects;
    await dashboard.clickPanelAction(
      testData.DATA_TEST_SUBJECTS.OPEN_IN_LENS_ACTION,
      'Table - GroupBy label'
    );
    await lens.waitForVisualization('lnsDataTable');

    const splitRows = page.testSubj
      .locator('lnsDatatable_rows')
      .locator('[data-test-subj="lns-dimensionTrigger"]');
    await expect(splitRows.filter({ hasText: 'test' })).toBeVisible();
  });

  spaceTest('should convert color ranges', async ({ page, pageObjects }) => {
    const { dashboard, lens } = pageObjects;
    await dashboard.clickPanelAction(
      testData.DATA_TEST_SUBJECTS.OPEN_IN_LENS_ACTION,
      'Table - Color ranges'
    );
    await lens.waitForVisualization('lnsDataTable');

    const dimensions = page.testSubj
      .locator('lnsDatatable_metrics')
      .locator('[data-test-subj="lns-dimensionTrigger"]');
    await expect(dimensions).toHaveCount(1);

    // Open the metric dimension editor and verify converted palette color stops
    await dimensions.locator('nth=0').click();
    await lens.openPalettePanelFlyout();
    const colorStops = await lens.getPaletteColorStops(3);
    expect(colorStops).toStrictEqual([
      { stop: '10', color: 'rgba(84, 179, 153, 1)' },
      { stop: '100', color: 'rgba(84, 160, 0, 1)' },
      { stop: '', color: undefined },
    ]);
    await lens.closePalettePanelFlyout();
    await lens.closeDimensionEditorPanel();
  });

  spaceTest(
    'should bring the ignore global filters configured at panel level over',
    async ({ page, pageObjects }) => {
      const { dashboard, lens } = pageObjects;
      await dashboard.clickPanelAction(
        testData.DATA_TEST_SUBJECTS.OPEN_IN_LENS_ACTION,
        'Table - Ignore global filters panel'
      );
      await lens.waitForVisualization('lnsDataTable');
      await expect(page.testSubj.locator('lnsChangeIndexPatternIgnoringFilters')).toBeVisible();
    }
  );
});

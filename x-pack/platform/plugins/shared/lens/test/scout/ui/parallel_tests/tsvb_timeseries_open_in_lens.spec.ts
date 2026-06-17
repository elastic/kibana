/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { testData } from '../fixtures';

const CONVERT_TO_LENS_ACTION = 'embeddablePanelAction-ACTION_EDIT_IN_LENS';

spaceTest.describe('TSVB Timeseries - Open in Lens', { tag: tags.deploymentAgnostic }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.load(testData.KBN_ARCHIVES.TSVB_TIMESERIES);
    await scoutSpace.uiSettings.set({
      defaultIndex: testData.DATA_VIEW_ID.LOGSTASH,
      'dateFormat:tz': 'UTC',
      'timepicker:timeDefaults': JSON.stringify({
        from: testData.LOGSTASH_IN_RANGE_DATES.from,
        to: testData.LOGSTASH_IN_RANGE_DATES.to,
      }),
    });
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    const { dashboard } = pageObjects;
    await dashboard.goto();
    await dashboard.clickDashboardTitleLink(testData.TSVB_DASHBOARDS.TIMESERIES);
    await dashboard.switchToEditMode();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex', 'dateFormat:tz', 'timepicker:timeDefaults');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest(
    'should show the "Convert to Lens" menu item for a count aggregation',
    async ({ pageObjects }) => {
      const { dashboard } = pageObjects;
      const hasAction = await dashboard.panelHasAction(
        CONVERT_TO_LENS_ACTION,
        'Timeseries -  Basic'
      );
      expect(hasAction).toBe(true);
    }
  );

  spaceTest('should convert basic timeseries to Lens', async ({ page, pageObjects }) => {
    const { dashboard } = pageObjects;
    await dashboard.clickPanelAction(CONVERT_TO_LENS_ACTION, 'Timeseries -  Basic');
    await expect(page.testSubj.locator('xyVisChart')).toBeVisible();

    const dimensions = page.testSubj.locator('lns-dimensionTrigger');
    await expect(dimensions).toHaveText(['@timestamp', 'Count of records']);
  });

  spaceTest('should preserve app filters in Lens', async ({ page, pageObjects }) => {
    const { dashboard } = pageObjects;
    await dashboard.clickPanelAction(CONVERT_TO_LENS_ACTION, 'Timeseries - With filter');
    await expect(page.testSubj.locator('xyVisChart')).toBeVisible();

    await expect(page.locator('[data-test-subj="filter-badge-css"]')).toBeVisible();
  });

  spaceTest('should preserve query in Lens', async ({ page, pageObjects }) => {
    const { dashboard } = pageObjects;
    await dashboard.clickPanelAction(CONVERT_TO_LENS_ACTION, 'Timeseries - With query');
    await expect(page.testSubj.locator('xyVisChart')).toBeVisible();

    await expect(page.testSubj.locator('queryInput')).toHaveText('machine.os : ios');
  });

  spaceTest('should draw a reference line', async ({ page, pageObjects }) => {
    const { dashboard } = pageObjects;
    await dashboard.clickPanelAction(CONVERT_TO_LENS_ACTION, 'Timeseries -  Reference line');
    await expect(page.testSubj.locator('xyVisChart')).toBeVisible();

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
    const { dashboard } = pageObjects;
    await dashboard.clickPanelAction(CONVERT_TO_LENS_ACTION, 'Timeseries -  Agg with params');
    await expect(page.testSubj.locator('xyVisChart')).toBeVisible();

    const dimensions = page.testSubj.locator('lns-dimensionTrigger');
    await expect(dimensions).toHaveText(['@timestamp', 'Counter rate of machine.ram per second']);
  });

  spaceTest('should not allow converting of invalid panel', async ({ pageObjects }) => {
    const { dashboard } = pageObjects;
    const hasAction = await dashboard.panelHasAction(
      CONVERT_TO_LENS_ACTION,
      'Timeseries -  Invalid panel'
    );
    expect(hasAction).toBe(false);
  });

  spaceTest('should not allow converting of unsupported aggregations', async ({ pageObjects }) => {
    const { dashboard } = pageObjects;
    const hasAction = await dashboard.panelHasAction(
      CONVERT_TO_LENS_ACTION,
      'Timeseries -  Unsupported aggregations'
    );
    expect(hasAction).toBe(false);
  });

  spaceTest(
    'should convert parent pipeline aggregation with terms',
    async ({ page, pageObjects }) => {
      const { dashboard } = pageObjects;
      await dashboard.clickPanelAction(CONVERT_TO_LENS_ACTION, 'Timeseries -  Parent pipeline agg');
      await expect(page.testSubj.locator('xyVisChart')).toBeVisible();

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
      const { dashboard } = pageObjects;
      await dashboard.clickPanelAction(CONVERT_TO_LENS_ACTION, 'Timeseries - Sibling pipeline agg');
      await expect(page.testSubj.locator('xyVisChart')).toBeVisible();

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
      const { dashboard } = pageObjects;
      await dashboard.clickPanelAction(
        CONVERT_TO_LENS_ACTION,
        'Timeseries - Ignore global filters series'
      );
      await expect(page.testSubj.locator('xyVisChart')).toBeVisible();
      await expect(page.testSubj.locator('lnsChangeIndexPatternIgnoringFilters')).toBeVisible();
    }
  );

  spaceTest(
    'should bring ignore global filters at panel level over',
    async ({ page, pageObjects }) => {
      const { dashboard } = pageObjects;
      await dashboard.clickPanelAction(
        CONVERT_TO_LENS_ACTION,
        'Timeseries - Ignore global filters panel'
      );
      await expect(page.testSubj.locator('xyVisChart')).toBeVisible();
      await expect(page.testSubj.locator('lnsChangeIndexPatternIgnoringFilters')).toBeVisible();
    }
  );
});

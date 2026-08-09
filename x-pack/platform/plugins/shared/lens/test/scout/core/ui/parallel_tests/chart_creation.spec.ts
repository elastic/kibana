/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { getImportedSavedObjectId, spaceTest, testData } from '../fixtures';

const NEW_CHART_TITLE = 'A fancy lens test';

spaceTest.describe('Lens chart creation', { tag: '@local-stateful-classic' }, () => {
  let xyVisId: string;

  spaceTest.beforeAll(async ({ scoutSpace }) => {
    const imported = await scoutSpace.savedObjects.load(testData.KBN_ARCHIVE_PATHS.LENS_BASIC);
    xyVisId = getImportedSavedObjectId(imported, 'lens', testData.LENS_BASIC_TITLES.XY_VIS);

    await scoutSpace.uiSettings.setDefaultIndex(testData.DATA_VIEW_ID.LOGSTASH);
    await scoutSpace.uiSettings.setDefaultTime(testData.LOGSTASH_IN_RANGE_DATES);
    await scoutSpace.uiSettings.set({ 'dateFormat:tz': 'UTC' });
  });

  spaceTest.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex', 'dateFormat:tz', 'timepicker:timeDefaults');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest(
    'creates and saves an XY area chart, then reopens it with the same configuration',
    async ({ pageObjects }) => {
      const { lens, visualize } = pageObjects;

      await spaceTest.step('open a new Lens editor', async () => {
        await visualize.goto();
        await visualize.openNewVisualizationWizard();
        await visualize.clickVisType('lens');
        await lens.waitForLensApp();
      });

      await spaceTest.step('configure an area chart with a top-values split on `ip`', async () => {
        await lens.switchToVisualization('area');
        await lens.configureXYDimensions();
      });

      await spaceTest.step('save the visualization to the library', async () => {
        await lens.save(NEW_CHART_TITLE, { addToDashboard: 'none' });
      });

      await spaceTest.step('go to the saved chart and verify title and legend', async () => {
        // Ensure the visualization shows up in the visualize list, and takes
        // us back to the visualization as we configured it.
        await visualize.goto();
        await visualize.clickSavedVisualization(NEW_CHART_TITLE);
        await lens.waitForVisualization('xyVisChart');
        await expect(lens.chartTitle).toHaveText(NEW_CHART_TITLE);
        // Terms uses DEFAULT_SIZE=9, plus "Other" = 10.
        await expect(lens.xyLegendItems).toHaveCount(10);
      });
    }
  );

  spaceTest(
    'preserves the split field when switching a saved XY chart to filters aggregation',
    async ({ pageObjects }) => {
      const { lens } = pageObjects;

      await lens.openEditor(xyVisId, 'xyVisChart');

      await lens.configureDimension({
        dimension: 'lnsXY_splitDimensionPanel > lns-dimensionTrigger',
        operation: 'filters',
        keepOpen: true,
      });
      await lens.addFilterToAgg('geo.src : CN');
      await lens.waitForVisualization('xyVisChart');

      // The previous split (`terms of ip`) should be preserved as the first auto-generated
      // filter, alongside the newly added one.
      await expect
        .poll(() => lens.getFiltersAggLabels())
        .toStrictEqual([`"ip" : *`, `geo.src : CN`]);
      await expect(lens.xyLegendItems).toHaveCount(2);
    }
  );

  spaceTest('switches the first layer to a different data view', async ({ pageObjects }) => {
    const { lens } = pageObjects;

    await lens.openFullEditor();

    await lens.switchLayerIndexPattern(testData.DATA_VIEW_ID.LOGSTASH_WILDCARD);

    await expect
      .poll(() => lens.getSelectedLayerIndexPattern())
      .toBe(testData.DATA_VIEW_ID.LOGSTASH_WILDCARD);
  });
});

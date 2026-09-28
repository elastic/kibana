/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { getImportedSavedObjectId, spaceTest, testData } from '../fixtures';

const MAX_BYTES_VALUE = '19,986' as const;

// Every chart switch passes an explicit `search` label: the switcher list is virtualized, and
// its filter keeps whatever was typed last, so filtering makes the target option deterministic.

spaceTest.describe('Lens chart switching', { tag: '@local-stateful-classic' }, () => {
  let artistMetricId: string;
  let xyVisId: string;
  let pieVisId: string;

  spaceTest.beforeAll(async ({ scoutSpace }) => {
    const imported = await scoutSpace.savedObjects.load(testData.KBN_ARCHIVE_PATHS.LENS_BASIC);
    artistMetricId = getImportedSavedObjectId(
      imported,
      'lens',
      testData.LENS_BASIC_TITLES.ARTIST_METRIC
    );
    xyVisId = getImportedSavedObjectId(imported, 'lens', testData.LENS_BASIC_TITLES.XY_VIS);
    pieVisId = getImportedSavedObjectId(imported, 'lens', testData.LENS_BASIC_TITLES.PIE_VIS);

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
    'keeps label and value when switching a legacy metric to a datatable and back',
    async ({ pageObjects }) => {
      const { lens } = pageObjects;

      await lens.workspace.openEditor(artistMetricId, 'legacyMtrVis');
      await expect(lens.metric.legacyMetricLabel).toHaveText(testData.MAX_BYTES_LABEL);
      await expect(lens.metric.legacyMetricValue).toHaveText(MAX_BYTES_VALUE);

      await lens.switchToVisualization('lnsDatatable', { search: 'table' });
      // EUI data grid appends expand/filter glyphs to cell text, so match on a substring.
      await expect(lens.datatable.getCellLocator(0, 0)).toContainText(MAX_BYTES_VALUE);
      expect(await lens.datatable.getHeaderText(0)).toBe(testData.MAX_BYTES_LABEL);

      await lens.switchToVisualization('lnsLegacyMetric', { search: 'legacy' });
      await expect(lens.metric.legacyMetricLabel).toHaveText(testData.MAX_BYTES_LABEL);
      await expect(lens.metric.legacyMetricValue).toHaveText(MAX_BYTES_VALUE);
    }
  );

  spaceTest(
    'maps dimensions when switching a saved XY chart to pie and then to bar',
    async ({ pageObjects }) => {
      const { lens } = pageObjects;

      await lens.workspace.openEditor(xyVisId, 'xyVisChart');

      await spaceTest.step('switch to pie, which warns it will change the config', async () => {
        await lens.openChartSwitchPopover({ visType: 'pie', search: 'pie' });
        await expect(lens.getChartSwitchOption('pie')).toBeVisible();
        await expect(lens.getChartSwitchWarning('pie')).toBeVisible();
        await lens.selectChartSwitchOption('pie');
        await lens.waitForVisualization('partitionVisChart');

        await expect(lens.workspace.chartTitle).toHaveText(testData.LENS_BASIC_TITLES.XY_VIS);
        await expect(
          lens.dimensions.getDimensionTriggersLocator('lnsPie_sliceByDimensionPanel')
        ).toHaveText(testData.TOP_VALUES_OF_IP);
        await expect(
          lens.dimensions.getDimensionTriggersLocator('lnsPie_sizeByDimensionPanel')
        ).toHaveText(testData.AVERAGE_OF_BYTES);
      });

      await spaceTest.step('switch to bar, which maps the config without warning', async () => {
        await lens.openChartSwitchPopover({ visType: 'bar', search: 'bar' });
        await expect(lens.getChartSwitchOption('bar')).toBeVisible();
        await expect(lens.getChartSwitchWarning('bar')).toBeHidden();
        await lens.selectChartSwitchOption('bar');
        await lens.waitForVisualization('xyVisChart');

        await expect(lens.workspace.chartTitle).toHaveText(testData.LENS_BASIC_TITLES.XY_VIS);
        await expect(
          lens.dimensions.getDimensionTriggersLocator('lnsXY_splitDimensionPanel')
        ).toHaveText(testData.TOP_VALUES_OF_IP);
        await expect(
          lens.dimensions.getDimensionTriggersLocator('lnsXY_yDimensionPanel')
        ).toHaveText(testData.AVERAGE_OF_BYTES);
      });
    }
  );

  spaceTest(
    'keeps all dimensions when switching a bar chart to a line chart',
    async ({ pageObjects }) => {
      const { lens } = pageObjects;

      await lens.workspace.openEditor(xyVisId, 'xyVisChart');

      await lens.switchToVisualization('line', { search: 'line' });
      await lens.waitForVisualization('xyVisChart');

      await expect(lens.workspace.chartTitle).toHaveText(testData.LENS_BASIC_TITLES.XY_VIS);
      await expect(lens.dimensions.getDimensionTriggersLocator('lnsXY_xDimensionPanel')).toHaveText(
        '@timestamp'
      );
      await expect(lens.dimensions.getDimensionTriggersLocator('lnsXY_yDimensionPanel')).toHaveText(
        testData.AVERAGE_OF_BYTES
      );
      await expect(
        lens.dimensions.getDimensionTriggersLocator('lnsXY_splitDimensionPanel')
      ).toHaveText(testData.TOP_VALUES_OF_IP);
    }
  );

  spaceTest(
    'keeps both slice-by dimensions when switching a pie chart to a treemap',
    async ({ pageObjects }) => {
      const { lens } = pageObjects;

      await lens.workspace.openEditor(pieVisId, 'partitionVisChart');

      await lens.openChartSwitchPopover({ visType: 'treemap', search: 'treemap' });
      await expect(lens.getChartSwitchOption('treemap')).toBeVisible();
      await expect(lens.getChartSwitchWarning('treemap')).toBeHidden();
      await lens.selectChartSwitchOption('treemap');
      await lens.waitForVisualization('partitionVisChart');

      await expect(
        lens.dimensions.getDimensionTriggersLocator('lnsPie_groupByDimensionPanel')
      ).toHaveText(['Top 7 values of geo.dest', 'Top 3 values of geo.src']);
      await expect(
        lens.dimensions.getDimensionTriggersLocator('lnsPie_sizeByDimensionPanel')
      ).toHaveText(testData.AVERAGE_OF_BYTES);
    }
  );
});

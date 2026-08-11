/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { getImportedSavedObjectId, spaceTest, testData } from '../fixtures';

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

  spaceTest('transitions from metric to table to metric', async ({ pageObjects }) => {
    const { lens } = pageObjects;

    await lens.workspace.openEditor(artistMetricId, 'legacyMtrVis');

    await expect.poll(() => lens.metric.getLegacyMetricData()).toEqual({
      title: 'Maximum of bytes',
      value: '19,986',
    });

    await lens.switchToVisualization('lnsDatatable');
    await expect.poll(() => lens.datatable.getHeaderText()).toBe('Maximum of bytes');
    await expect.poll(() => lens.datatable.getCellText(0, 0)).toBe('19,986');

    await lens.switchToVisualization('lnsLegacyMetric');
    await expect.poll(() => lens.metric.getLegacyMetricData()).toEqual({
      title: 'Maximum of bytes',
      value: '19,986',
    });
  });

  spaceTest(
    'transitions from line chart to pie chart and to bar chart',
    async ({ pageObjects }) => {
      const { lens } = pageObjects;

      await lens.workspace.openEditor(xyVisId, 'xyVisChart');

      await expect.poll(() => lens.chartSwitch.hasChartSwitchWarning('pie')).toBe(true);
      await lens.switchToVisualization('pie');

      await expect(lens.workspace.chartTitle).toHaveText('lnsXYvis');
      await expect
        .poll(() => lens.dimensions.getDimensionTriggerText('lnsPie_sliceByDimensionPanel'))
        .toBe('Top 3 values of ip');
      await expect
        .poll(() => lens.dimensions.getDimensionTriggerText('lnsPie_sizeByDimensionPanel'))
        .toBe('Average of bytes');

      await expect.poll(() => lens.chartSwitch.hasChartSwitchWarning('bar')).toBe(false);
      await lens.switchToVisualization('bar');
      await expect(lens.workspace.chartTitle).toHaveText('lnsXYvis');
      await expect
        .poll(() => lens.dimensions.getDimensionTriggerText('lnsXY_splitDimensionPanel'))
        .toBe('Top 3 values of ip');
      await expect
        .poll(() => lens.dimensions.getDimensionTriggerText('lnsXY_yDimensionPanel'))
        .toBe('Average of bytes');
    }
  );

  spaceTest('transitions from bar chart to line chart', async ({ pageObjects }) => {
    const { lens } = pageObjects;

    await lens.workspace.openEditor(xyVisId, 'xyVisChart');

    await lens.switchToVisualization('line');
    await expect(lens.workspace.chartTitle).toHaveText('lnsXYvis');
    await expect.poll(() => lens.dimensions.getDimensionTriggerText('lnsXY_xDimensionPanel')).toBe('@timestamp');
    await expect
      .poll(() => lens.dimensions.getDimensionTriggerText('lnsXY_yDimensionPanel'))
      .toBe('Average of bytes');
    await expect
      .poll(() => lens.dimensions.getDimensionTriggerText('lnsXY_splitDimensionPanel'))
      .toBe('Top 3 values of ip');
  });

  spaceTest('transitions from pie chart to treemap chart', async ({ pageObjects }) => {
    const { lens } = pageObjects;

    await lens.workspace.openEditor(pieVisId, 'partitionVisChart');

    await expect.poll(() => lens.chartSwitch.hasChartSwitchWarning('treemap')).toBe(false);
    await lens.switchToVisualization('treemap');
    await expect
      .poll(() => lens.dimensions.getDimensionTriggersTexts('lnsPie_groupByDimensionPanel'))
      .toEqual(['Top 7 values of geo.dest', 'Top 3 values of geo.src']);
    await expect
      .poll(() => lens.dimensions.getDimensionTriggerText('lnsPie_sizeByDimensionPanel'))
      .toBe('Average of bytes');
  });

  spaceTest('creates a pie chart and switches to datatable', async ({ pageObjects }) => {
    const { lens } = pageObjects;

    await lens.workspace.openFullEditor();

    await lens.switchToVisualization('pie');
    await lens.configureDimension({
      dimension: 'lnsPie_sliceByDimensionPanel > lns-empty-dimension',
      operation: 'date_histogram',
      field: '@timestamp',
      disableEmptyRows: true,
    });
    await lens.configureDimension({
      dimension: 'lnsPie_sizeByDimensionPanel > lns-empty-dimension',
      operation: 'average',
      field: 'bytes',
    });

    await expect.poll(() => lens.chartSwitch.hasChartSwitchWarning('lnsDatatable')).toBe(false);
    await lens.switchToVisualization('lnsDatatable');

    // Switching chart type re-applies the target type's empty-rows default.
    await lens.dimensions.openDimensionEditor('lnsDatatable_rows > lns-dimensionTrigger');
    await lens.setEuiSwitch('indexPattern-include-empty-rows', false);
    await lens.closeDimensionEditor();

    await expect.poll(() => lens.datatable.getHeaderText()).toBe('@timestamp per 3 hours');
    await expect.poll(() => lens.datatable.getCellText(0, 0)).toBe('2015-09-20 00:00');
    await expect.poll(() => lens.datatable.getHeaderText(1)).toBe('Average of bytes');
    await expect.poll(() => lens.datatable.getCellText(0, 1)).toBe('6,011.351');
  });

  spaceTest('creates a heatmap chart and transitions to bar chart', async ({ pageObjects }) => {
    const { lens } = pageObjects;

    await lens.workspace.openFullEditor();

    await lens.switchToVisualization('heatmap', { search: 'heat' });

    await lens.configureDimension({
      dimension: 'lnsHeatmap_xDimensionPanel > lns-empty-dimension',
      operation: 'date_histogram',
      field: '@timestamp',
    });
    await lens.configureDimension({
      dimension: 'lnsHeatmap_yDimensionPanel > lns-empty-dimension',
      operation: 'terms',
      field: 'geo.dest',
    });
    await lens.configureDimension({
      dimension: 'lnsHeatmap_cellPanel > lns-empty-dimension',
      operation: 'average',
      field: 'bytes',
    });

    await expect.poll(() => lens.chartSwitch.hasChartSwitchWarning('bar')).toBe(false);
    await lens.switchToVisualization('bar');
    await expect.poll(() => lens.dimensions.getDimensionTriggerText('lnsXY_xDimensionPanel')).toBe('@timestamp');
    await expect
      .poll(() => lens.dimensions.getDimensionTriggerText('lnsXY_yDimensionPanel'))
      .toBe('Average of bytes');
  });
});

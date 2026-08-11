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

    await expect
      .poll(() => lens.metric.getLegacyMetricData())
      .toStrictEqual({
        title: 'Maximum of bytes',
        value: '19,986',
      });

    await spaceTest.step('switch to a datatable', async () => {
      await lens.switchToVisualization('lnsDatatable');
      await expect.poll(() => lens.datatable.getHeaderText()).toBe('Maximum of bytes');
      await expect.poll(() => lens.datatable.getCellText(0, 0)).toBe('19,986');
    });

    await spaceTest.step('switch back to the legacy metric', async () => {
      await lens.switchToVisualization('lnsLegacyMetric');
      await expect
        .poll(() => lens.metric.getLegacyMetricData())
        .toStrictEqual({
          title: 'Maximum of bytes',
          value: '19,986',
        });
    });
  });

  spaceTest(
    'transitions from line chart to pie chart and to bar chart',
    async ({ pageObjects }) => {
      const { lens } = pageObjects;

      await lens.workspace.openEditor(xyVisId, 'xyVisChart');

      await spaceTest.step('switch to pie, warning about the dropped x dimension', async () => {
        await expect.poll(() => lens.hasChartSwitchWarning('pie')).toBe(true);
        await lens.switchToVisualization('pie');

        await expect(lens.workspace.chartTitle).toHaveText('lnsXYvis');
        await expect(
          lens.dimensions.getDimensionTriggersLocator('lnsPie_sliceByDimensionPanel')
        ).toHaveText(['Top 3 values of ip']);
        await expect(
          lens.dimensions.getDimensionTriggersLocator('lnsPie_sizeByDimensionPanel')
        ).toHaveText(['Average of bytes']);
      });

      await spaceTest.step('switch to bar without data loss', async () => {
        await expect.poll(() => lens.hasChartSwitchWarning('bar')).toBe(false);
        await lens.switchToVisualization('bar');

        await expect(lens.workspace.chartTitle).toHaveText('lnsXYvis');
        await expect(
          lens.dimensions.getDimensionTriggersLocator('lnsXY_splitDimensionPanel')
        ).toHaveText(['Top 3 values of ip']);
        await expect(
          lens.dimensions.getDimensionTriggersLocator('lnsXY_yDimensionPanel')
        ).toHaveText(['Average of bytes']);
      });
    }
  );

  spaceTest('transitions from bar chart to line chart', async ({ pageObjects }) => {
    const { lens } = pageObjects;

    await lens.workspace.openEditor(xyVisId, 'xyVisChart');

    await lens.switchToVisualization('line');

    await expect(lens.workspace.chartTitle).toHaveText('lnsXYvis');
    await expect(lens.dimensions.getDimensionTriggersLocator('lnsXY_xDimensionPanel')).toHaveText([
      '@timestamp',
    ]);
    await expect(lens.dimensions.getDimensionTriggersLocator('lnsXY_yDimensionPanel')).toHaveText([
      'Average of bytes',
    ]);
    await expect(
      lens.dimensions.getDimensionTriggersLocator('lnsXY_splitDimensionPanel')
    ).toHaveText(['Top 3 values of ip']);
  });

  spaceTest('transitions from pie chart to treemap chart', async ({ pageObjects }) => {
    const { lens } = pageObjects;

    await lens.workspace.openEditor(pieVisId, 'partitionVisChart');

    await expect.poll(() => lens.hasChartSwitchWarning('treemap')).toBe(false);
    await lens.switchToVisualization('treemap');

    await expect(
      lens.dimensions.getDimensionTriggersLocator('lnsPie_groupByDimensionPanel')
    ).toHaveText(['Top 7 values of geo.dest', 'Top 3 values of geo.src']);
    await expect(
      lens.dimensions.getDimensionTriggersLocator('lnsPie_sizeByDimensionPanel')
    ).toHaveText(['Average of bytes']);
  });
});

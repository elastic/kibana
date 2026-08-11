/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest, testData } from '../fixtures';

spaceTest.describe(
  'Lens chart switching from a new visualization',
  { tag: '@local-stateful-classic' },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace }) => {
      // These tests build charts from scratch; the archive is only loaded for the
      // `logstash-*` data view it ships.
      await scoutSpace.savedObjects.load(testData.KBN_ARCHIVE_PATHS.LENS_BASIC);

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

    spaceTest('creates a pie chart and switches to datatable', async ({ pageObjects }) => {
      const { lens } = pageObjects;

      await lens.workspace.openFullEditor();

      await spaceTest.step('configure a pie chart over time', async () => {
        await lens.switchToVisualization('pie', { waitForFieldList: true });
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
      });

      await spaceTest.step('switch to a datatable without data loss', async () => {
        await expect.poll(() => lens.hasChartSwitchWarning('lnsDatatable')).toBe(false);
        await lens.switchToVisualization('lnsDatatable');

        // Switching chart type re-applies the target type's empty-rows default.
        await lens.dimensions.openDimensionEditor('lnsDatatable_rows > lns-dimensionTrigger');
        await lens.dimensions.setIncludeEmptyRows(false);
        await lens.closeDimensionEditor();
      });

      await spaceTest.step('verify the table keeps the pie configuration', async () => {
        await expect.poll(() => lens.datatable.getHeaderText()).toBe('@timestamp per 3 hours');
        await expect.poll(() => lens.datatable.getCellText(0, 0)).toBe('2015-09-20 00:00');
        await expect.poll(() => lens.datatable.getHeaderText(1)).toBe('Average of bytes');
        await expect.poll(() => lens.datatable.getCellText(0, 1)).toBe('6,011.351');
      });
    });

    spaceTest('creates a heatmap chart and transitions to bar chart', async ({ pageObjects }) => {
      const { lens } = pageObjects;

      await lens.workspace.openFullEditor();

      await spaceTest.step('configure a heatmap', async () => {
        await lens.switchToVisualization('heatmap', { search: 'heat', waitForFieldList: true });
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
      });

      await spaceTest.step('switch to a bar chart without data loss', async () => {
        await expect.poll(() => lens.hasChartSwitchWarning('bar')).toBe(false);
        await lens.switchToVisualization('bar');

        await expect(
          lens.dimensions.getDimensionTriggersLocator('lnsXY_xDimensionPanel')
        ).toHaveText(['@timestamp']);
        await expect(
          lens.dimensions.getDimensionTriggersLocator('lnsXY_yDimensionPanel')
        ).toHaveText(['Average of bytes']);
      });
    });
  }
);

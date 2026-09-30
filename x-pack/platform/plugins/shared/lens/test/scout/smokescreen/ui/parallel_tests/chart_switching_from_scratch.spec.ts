/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { createLogstashLensEditorSuiteSetup, spaceTest, testData } from '../fixtures';

// Every chart switch passes an explicit `search` label: the switcher list is virtualized, and
// its filter keeps whatever was typed last, so filtering makes the target option deterministic.

spaceTest.describe('Lens chart switching from scratch', { tag: '@local-stateful-classic' }, () => {
  // These charts are built in the editor, so the suite only needs the Logstash data view
  // and an empty Lens editor per test — no saved-object fixtures.
  const suiteSetup = createLogstashLensEditorSuiteSetup();

  spaceTest.beforeAll(suiteSetup.beforeAll);

  spaceTest.beforeEach(suiteSetup.beforeEach);

  spaceTest.afterAll(suiteSetup.afterAll);

  spaceTest('builds a pie chart and switches it to a datatable', async ({ pageObjects }) => {
    const { lens } = pageObjects;

    await lens.switchToVisualization('pie', { search: 'pie' });

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

    await lens.openChartSwitchPopover({ visType: 'lnsDatatable', search: 'table' });
    await expect(lens.getChartSwitchOption('lnsDatatable')).toBeVisible();
    await expect(lens.getChartSwitchWarning('lnsDatatable')).toBeHidden();
    await lens.selectChartSwitchOption('lnsDatatable');

    // Switching chart type re-applies the target type's empty-rows default, so the datatable
    // turns "Include empty rows" back on. Turn it off again to assert the populated buckets only.
    await lens.dimensions.openDimensionEditor('lnsDatatable_rows > lns-dimensionTrigger');
    await lens.setEuiSwitch('indexPattern-include-empty-rows', false);
    await lens.closeDimensionEditor();
    await lens.waitForVisualization();

    // Verify the date_histogram and average aggregations transferred correctly after the switch.
    expect(await lens.datatable.getHeaderText(0)).toBe('@timestamp per 3 hours');
    expect(await lens.datatable.getHeaderText(1)).toBe(testData.AVERAGE_OF_BYTES);
    // Confirm the datatable has populated rows (aggregation produced results).
    await expect(lens.datatable.getCellLocator(0, 0)).not.toBeEmpty();
    await expect(lens.datatable.getCellLocator(0, 1)).not.toBeEmpty();
  });

  spaceTest('builds a heatmap and switches it to a bar chart', async ({ pageObjects }) => {
    const { lens } = pageObjects;

    await lens.switchToVisualization('heatmap', { search: 'heat' });

    await lens.configureDimension({
      dimension: 'lnsHeatmap_xDimensionPanel > lns-empty-dimension',
      operation: 'date_histogram',
      field: '@timestamp',
    });
    await expect(
      lens.dimensions.getDimensionTriggersLocator('lnsHeatmap_xDimensionPanel')
    ).toHaveText('@timestamp');
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

    await lens.openChartSwitchPopover({ visType: 'bar', search: 'bar' });
    await expect(lens.getChartSwitchOption('bar')).toBeVisible();
    await expect(lens.getChartSwitchWarning('bar')).toBeHidden();
    await lens.selectChartSwitchOption('bar');
    await lens.waitForVisualization('xyVisChart');

    await expect(lens.dimensions.getDimensionTriggersLocator('lnsXY_xDimensionPanel')).toHaveText(
      '@timestamp'
    );
    await expect(lens.dimensions.getDimensionTriggersLocator('lnsXY_yDimensionPanel')).toHaveText(
      testData.AVERAGE_OF_BYTES
    );
  });
});

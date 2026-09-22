/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { createLogstashLensEditorSuiteSetup, spaceTest } from '../fixtures';

const OVERRIDE_AXIS_TITLE = 'overridden axis';

spaceTest.describe('Lens chart style settings', { tag: tags.deploymentAgnostic }, () => {
  const suiteSetup = createLogstashLensEditorSuiteSetup({ enableChartDebug: true });

  spaceTest.beforeAll(suiteSetup.beforeAll);

  spaceTest.beforeEach(suiteSetup.beforeEach);

  spaceTest.afterAll(suiteSetup.afterAll);

  spaceTest(
    'creates a multi-axis bar chart, enables value labels, and overrides the left axis',
    async ({ pageObjects }) => {
      const { lens } = pageObjects;

      await spaceTest.step(
        'create a bar chart and switch the second metric between axes',
        async () => {
          await lens.switchToVisualization('bar', { search: 'bar' });
          await lens.configureDimension({
            dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
            operation: 'terms',
            field: 'geo.dest',
          });
          await lens.configureDimension({
            dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
            operation: 'average',
            field: 'bytes',
          });
          await lens.configureDimension({
            dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
            operation: 'unique_count',
            field: 'bytes',
            keepOpen: true,
          });

          await lens.dimensions.changeAxisSide('right');
          let data = await lens.workspace.getCurrentChartDebugState('xyVisChart');
          expect(data.axes?.y).toHaveLength(2);
          expect(data.axes?.y?.map(({ position }) => position)).toContain('right');

          await lens.dimensions.changeAxisSide('left');
          data = await lens.workspace.getCurrentChartDebugState('xyVisChart');
          expect(data.axes?.y).toHaveLength(1);
          expect(data.axes?.y?.map(({ position }) => position) ?? []).not.toContain('right');

          await lens.dimensions.changeAxisSide('right');
          await lens.waitForVisualization('xyVisChart');
          await lens.closeDimensionEditor();
        }
      );

      await spaceTest.step('show value labels on the bar chart', async () => {
        await lens.style.openStyleSettingsFlyout();
        await lens.style.setValueLabels('inside');
        await lens.style.closeFlyoutWithBackButton();

        const data = await lens.workspace.getCurrentChartDebugState('xyVisChart');
        expect(data.bars?.[0].labels?.length).toBeGreaterThan(0);
      });

      await spaceTest.step('override the left axis title and hide gridlines', async () => {
        await lens.style.openStyleSettingsFlyout();
        await lens.workspace.setInputValue('lnsyLeftAxisTitle', OVERRIDE_AXIS_TITLE);

        let data = await lens.workspace.getCurrentChartDebugState('xyVisChart');
        expect(data.axes?.y?.[1].title).toBe(OVERRIDE_AXIS_TITLE);

        await lens.setEuiSwitch('lnsshowyLeftAxisGridlines', false);

        data = await lens.workspace.getCurrentChartDebugState('xyVisChart');
        expect(data.axes?.y?.[1].gridlines).toHaveLength(0);

        await lens.style.closeFlyoutWithBackButton();
      });
    }
  );

  spaceTest('filters an XY chart by clicking a legend item', async ({ pageObjects }) => {
    const { lens, filterBar } = pageObjects;

    await lens.configureDimension({
      dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
      operation: 'date_histogram',
      field: '@timestamp',
    });
    await lens.configureDimension({
      dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
      operation: 'average',
      field: 'bytes',
    });
    await lens.configureDimension({
      dimension: 'lnsXY_splitDimensionPanel > lns-empty-dimension',
      operation: 'terms',
      field: 'extension.raw',
    });

    await lens.workspace.filterLegend('jpg');
    await expect
      .poll(async () => filterBar.hasFilter({ field: 'extension.raw', value: 'jpg' }))
      .toBe(true);
  });

  spaceTest('filters a pie chart by clicking a legend item', async ({ pageObjects }) => {
    const { lens, filterBar } = pageObjects;

    await lens.switchToVisualization('pie', { search: 'pie' });
    await lens.configureDimension({
      dimension: 'lnsPie_sliceByDimensionPanel > lns-empty-dimension',
      operation: 'terms',
      field: 'extension.raw',
    });
    await lens.configureDimension({
      dimension: 'lnsPie_sliceByDimensionPanel > lns-empty-dimension',
      operation: 'terms',
      field: 'agent.raw',
    });
    await lens.configureDimension({
      dimension: 'lnsPie_sizeByDimensionPanel > lns-empty-dimension',
      operation: 'average',
      field: 'bytes',
    });

    await lens.workspace.filterLegend('jpg');
    await expect
      .poll(async () => filterBar.hasFilter({ field: 'extension.raw', value: 'jpg' }))
      .toBe(true);
  });

  spaceTest('toggles point visibility on a line chart', async ({ pageObjects }) => {
    const { lens } = pageObjects;

    await lens.configureDimension({
      dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
      operation: 'date_histogram',
      field: '@timestamp',
    });
    await lens.configureDimension({
      dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
      operation: 'average',
      field: 'bytes',
    });
    await lens.switchToVisualization('line', { search: 'line' });
    await lens.waitForVisualization('xyVisChart');
    await lens.style.openStyleSettingsFlyout();

    await spaceTest.step('points stay visible when Point visibility is Auto', async () => {
      await lens.style.setPointVisibility('auto');
      const { lines } = await lens.workspace.getCurrentChartDebugState('xyVisChart');
      expect(lines?.[0]?.visiblePoints).toBe(true);
    });

    await spaceTest.step('points stay visible when Point visibility is Show', async () => {
      await lens.style.setPointVisibility('show');
      const { lines } = await lens.workspace.getCurrentChartDebugState('xyVisChart');
      expect(lines?.[0]?.visiblePoints).toBe(true);
    });

    await spaceTest.step('points are hidden when Point visibility is Hide', async () => {
      await lens.style.setPointVisibility('hide');
      const { lines } = await lens.workspace.getCurrentChartDebugState('xyVisChart');
      expect(lines?.[0]?.visiblePoints).toBe(false);
    });
  });
});

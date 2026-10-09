/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { addDataLayer, createLogstashLensEditorSuiteSetup, spaceTest } from '../fixtures';

// Chart switcher list is virtualized; always pass an explicit `search` so the target row is rendered.

spaceTest.describe('Lens layers', { tag: '@local-stateful-classic' }, () => {
  const suiteSetup = createLogstashLensEditorSuiteSetup();

  spaceTest.beforeAll(suiteSetup.beforeAll);

  spaceTest.beforeEach(suiteSetup.beforeEach);

  spaceTest.afterAll(suiteSetup.afterAll);

  spaceTest(
    'transitions from a multi-layer stacked bar to a multi-layer line chart and removes all layers',
    async ({ page, pageObjects: { lens } }) => {
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

      await addDataLayer(page, 'bar');

      await lens.layers.ensureLayerTabIsActive(0);
      await lens.openChartSwitchPopover({ visType: 'line', search: 'line' });
      await expect(lens.getChartSwitchWarning('line')).toBeHidden();
      await lens.selectChartSwitchOption('line');

      await lens.layers.ensureLayerTabIsActive(0);
      expect(await lens.getChartSwitchType()).toBe('Line');
      await lens.layers.ensureLayerTabIsActive(1);
      expect(await lens.getChartSwitchType()).toBe('Bar');

      await lens.configureDimension({
        dimension: 'lns-layerPanel-1 > lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'terms',
        field: 'geo.src',
      });
      await lens.configureDimension({
        dimension: 'lns-layerPanel-1 > lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'machine.ram',
      });

      expect(await lens.layers.getLayerCount()).toBe(2);
      await lens.layers.removeLayer();
      await lens.layers.removeLayer();
      await lens.layers.ensureLayerTabIsActive();
      await expect(page.testSubj.locator('workspace-drag-drop-prompt')).toBeVisible();
    }
  );

  spaceTest(
    'transitions the selected layer in a multi-layer bar using layer chart switch',
    async ({ page, pageObjects: { lens } }) => {
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

      await addDataLayer(page, 'bar');
      expect(await lens.getChartSwitchType()).toBe('Bar');

      await lens.configureDimension({
        dimension: 'lns-layerPanel-1 > lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'terms',
        field: 'geo.src',
      });
      await lens.configureDimension({
        dimension: 'lns-layerPanel-1 > lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'machine.ram',
      });

      await lens.layers.ensureLayerTabIsActive(1);
      await lens.switchToVisualization('line', { search: 'line' });
      await lens.layers.ensureLayerTabIsActive(0);
      expect(await lens.getChartSwitchType()).toBe('Bar');
      await lens.layers.ensureLayerTabIsActive(1);
      expect(await lens.getChartSwitchType()).toBe('Line');

      await lens.layers.ensureLayerTabIsActive(1);
      await lens.switchToVisualization('pie', { search: 'pie' });
      expect(await lens.getChartSwitchType()).toBe('Pie');
      await expect(
        lens.dimensions.getDimensionTriggersLocator('lnsPie_sliceByDimensionPanel')
      ).toHaveText('Top 9 values of geo.src');
      await expect(
        lens.dimensions.getDimensionTriggersLocator('lnsPie_sizeByDimensionPanel')
      ).toHaveText('Average of machine.ram');
    }
  );

  spaceTest(
    'transitions from a multi-layer stacked bar to a treemap chart using suggestions',
    async ({ page, pageObjects: { lens } }) => {
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

      await addDataLayer(page, 'bar');

      await lens.configureDimension({
        dimension: 'lns-layerPanel-1 > lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'terms',
        field: 'geo.src',
      });
      await lens.configureDimension({
        dimension: 'lns-layerPanel-1 > lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });

      await lens.save('twolayerchart', { addToDashboard: 'none' });
      await lens.workspace.applySuggestion('lnsSuggestion-treemap', 'partitionVisChart');

      await expect(
        lens.dimensions.getDimensionTriggersLocator('lnsPie_groupByDimensionPanel')
      ).toHaveText('Top 9 values of geo.dest');
      await expect(
        lens.dimensions.getDimensionTriggersLocator('lnsPie_sizeByDimensionPanel')
      ).toHaveText('Average of bytes');
      expect(await lens.layers.getLayerCount()).toBe(1);
    }
  );

  spaceTest(
    'keeps suggestions up to date with the current configuration',
    async ({ pageObjects: { lens } }) => {
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

      await lens.layers.duplicateLayer();

      // now make the first layer bar percentage to lead it in an broken rendering state
      await lens.layers.ensureLayerTabIsActive(0);
      await lens.layers.switchToVisualizationSubtype('Percentage');

      // now check that both the main visualization and the current visualization suggestion are in error state
      await expect(lens.workspace.currentSuggestionError).toBeVisible();
      expect(await lens.workspace.getErrorCount()).toBe(1);

      // revert the subtype to stacked and everything should be fine again
      await lens.layers.switchToVisualizationSubtype('Stacked');

      await expect(lens.workspace.currentSuggestionError).toBeHidden();
      expect(await lens.workspace.getErrorCount()).toBe(0);
    }
  );
});

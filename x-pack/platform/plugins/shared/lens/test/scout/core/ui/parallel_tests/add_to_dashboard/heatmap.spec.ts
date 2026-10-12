/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createLogstashLensEditorSuiteSetup, spaceTest } from '../../fixtures';

spaceTest.describe('Lens heatmap add to dashboard', { tag: '@local-stateful-classic' }, () => {
  const suiteSetup = createLogstashLensEditorSuiteSetup();

  spaceTest.beforeAll(suiteSetup.beforeAll);

  spaceTest.beforeEach(suiteSetup.beforeEach);

  spaceTest.afterAll(suiteSetup.afterAll);

  // Regression test for https://github.com/elastic/kibana/issues/111104
  spaceTest(
    'adds a heatmap with number-based palette ranges to a new dashboard',
    async ({ pageObjects, scoutSpace }) => {
      const { dashboard, lens } = pageObjects;
      const lensTitle = `New Lens Heatmap ${scoutSpace.id}`;

      await spaceTest.step('build a heatmap with number-based palette ranges', async () => {
        await lens.configureDimension({
          dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
          operation: 'terms',
          field: 'ip',
        });
        await lens.configureDimension({
          dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
          operation: 'average',
          field: 'bytes',
        });
        await lens.switchToVisualization('heatmap', { search: 'heat' });
        await lens.waitForVisualization('heatmapChart');
        await lens.dimensions.openDimensionEditor('lnsHeatmap_cellPanel > lns-dimensionTrigger');
        await lens.openPalettePanelFlyout();
        await lens.style.setPaletteRangeType('number');
        await lens.waitForVisualization('heatmapChart');
      });

      await spaceTest.step('save the heatmap by reference to a new dashboard', async () => {
        await lens.saveToNewDashboard(lensTitle, { saveToLibrary: true });
      });

      await spaceTest.step('show the linked heatmap panel on the dashboard', async () => {
        await dashboard.waitForRenderComplete();
        await dashboard.expectPanelCount(1);
        await dashboard.expectLinkedToLibrary(lensTitle);
      });
    }
  );
});

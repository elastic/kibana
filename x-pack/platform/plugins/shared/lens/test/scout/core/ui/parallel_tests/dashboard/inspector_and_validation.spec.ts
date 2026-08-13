/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { createLogstashLensEditorSuiteSetup, spaceTest, testData } from '../../fixtures';

spaceTest.describe(
  'Lens dashboard inspector and validation',
  { tag: '@local-stateful-classic' },
  () => {
    const suiteSetup = createLogstashLensEditorSuiteSetup({
      loadLensArchives: true,
      skipEmptyLensOpen: true,
    });

    spaceTest.beforeAll(suiteSetup.beforeAll);

    spaceTest.beforeEach(async ({ browserAuth, context, page, pageObjects }) => {
      await suiteSetup.beforeEach({ browserAuth, context, page, pageObjects });
    });

    spaceTest.afterAll(suiteSetup.afterAll);

    spaceTest('shows all data from all layers in the inspector', async ({ page, pageObjects }) => {
      const { dashboard, lens, inspector } = pageObjects;

      await dashboard.openNewDashboard();
      await dashboard.addNewLensPanel();

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

      expect(await lens.workspace.hasChartSwitchWarning('line')).toBe(false);
      // FTR `switchToVisualization('line', undefined, 1)` — pick line at add-time instead of
      // switching after, which remounts the config panel and races the empty dimension.
      await lens.layers.createLayer('data', undefined, 'line');
      await lens.layers.ensureLayerTabIsActive(1);
      await expect(
        page.testSubj.locator('lns-layerPanel-1 > lnsXY_xDimensionPanel > lns-empty-dimension')
      ).toBeVisible({ timeout: 20_000 });
      await lens.configureDimension({
        dimension: 'lns-layerPanel-1 > lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'date_histogram',
        field: '@timestamp',
      });
      await lens.configureDimension({
        dimension: 'lns-layerPanel-1 > lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'median',
        field: 'bytes',
      });
      await expect(lens.saveAndReturnButton).toBeEnabled({ timeout: 20_000 });
      await lens.saveAndReturn();
      await dashboard.waitForRenderComplete();
      await expect(dashboard.getPanelHoverActionsLocator()).toBeVisible();

      await dashboard.clickPanelAction('embeddablePanelAction-openInspector');
      await expect.poll(() => inspector.getRequestNames()).toHaveLength(2);
    });

    spaceTest(
      'disables save-and-return when a validation error appears',
      async ({ pageObjects }) => {
        const { dashboard, lens } = pageObjects;

        await dashboard.openNewDashboard();
        await dashboard.addNewLensPanel();

        await lens.configureDimension({
          dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
          operation: 'date_histogram',
          field: '@timestamp',
        });
        await lens.configureDimension({
          dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
          operation: 'moving_average',
          keepOpen: true,
        });
        await lens.dimensions.configureReference({ operation: 'sum', field: 'bytes' });
        await lens.closeDimensionEditor();

        // Remove the x dimension to trigger the validation error.
        await lens.workspace.removeDimension('lnsXY_xDimensionPanel');
        await expect(lens.saveAndReturnButton).toBeDisabled();
      }
    );

    spaceTest(
      'recovers a Lens panel from an error state when fixing the search query',
      async ({ pageObjects }) => {
        const { dashboard, queryBar } = pageObjects;

        await dashboard.openNewDashboard();
        await dashboard.addPanelFromLibrary(testData.LENS_BASIC_TITLES.XY_VIS);

        await spaceTest.step('an invalid query puts the panel in an error state', async () => {
          await queryBar.setQuery('this is > not valid');
          await queryBar.submitQuery();
          await expect(dashboard.embeddableError).toHaveCount(1);
        });

        await spaceTest.step('clearing the query recovers the panel', async () => {
          await queryBar.setQuery('');
          await queryBar.submitQuery();
          await expect(dashboard.embeddableError).toHaveCount(0);
        });
      }
    );
  }
);

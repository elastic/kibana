/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import {
  createLogstashLensEditorSuiteSetup,
  openSharedLensUrl,
  spaceTest,
  testData,
} from '../../fixtures';

spaceTest.describe(
  'Lens dashboard by-value charts and drilldowns',
  { tag: '@local-stateful-classic' },
  () => {
    const suiteSetup = createLogstashLensEditorSuiteSetup({
      loadLensArchives: true,
      skipEmptyLensOpen: true,
      enableChartDebug: true,
    });

    spaceTest.beforeAll(suiteSetup.beforeAll);

    spaceTest.beforeEach(async ({ browserAuth, context, page, pageObjects }) => {
      await suiteSetup.beforeEach({ browserAuth, context, page, pageObjects });
    });

    spaceTest.afterAll(suiteSetup.afterAll);

    spaceTest(
      "re-entering a by-value Lens panel's editor and its shared URL both retain the saved title",
      async ({ context, kbnUrl, pageObjects }) => {
        const { dashboard, lens } = pageObjects;

        await spaceTest.step('create and save a by-value Lens panel', async () => {
          await dashboard.openNewDashboard();
          await dashboard.addNewLensPanel();
          await lens.configureDimension({
            dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
            operation: 'average',
            field: 'bytes',
          });
          await lens.save('test');
        });

        await spaceTest.step('re-enter the Lens editor via inline edit', async () => {
          await dashboard.navigateToLensEditorFromPanel();
          await expect(lens.workspace.chartTitle).toHaveText('test');
        });

        await spaceTest.step('the shared URL opens the same visualization by title', async () => {
          const url = await lens.workspace.getSharedUrl();
          const { page: sharedPage } = await openSharedLensUrl({ context, kbnUrl, url });
          try {
            await expect(sharedPage.testSubj.locator('lns_ChartTitle')).toHaveText('test');
          } finally {
            await sharedPage.close();
          }
        });
      }
    );

    spaceTest(
      'adds a Discover drilldown to a Lens panel that survives save and reload',
      async ({ page, pageObjects }) => {
        const { dashboard } = pageObjects;
        const dashboardTitle = `dashboardWithDrilldown ${Date.now()}`;

        await dashboard.openNewDashboard();
        await dashboard.addPanelFromLibrary(testData.LENS_BASIC_TITLES.PIE_VIS);
        await dashboard.waitForRenderComplete();

        await spaceTest.step('add a Discover drilldown to the pie chart', async () => {
          await dashboard.clickPanelAction('embeddablePanelAction-OPEN_FLYOUT_ADD_DRILLDOWN');
          await expect(page.testSubj.locator('createDrilldownFlyout')).toBeVisible();
          await dashboard.createDiscoverDrilldown();
          await expect(page.testSubj.locator('createDrilldownFlyout')).toBeHidden();
        });

        await spaceTest.step('the drilldown is available after clicking a slice', async () => {
          await dashboard.clickInPanelChart({ x: 5, y: 5 });
          await expect(dashboard.getDiscoverDrilldownAction()).toBeVisible();
        });

        await spaceTest.step('the drilldown survives a save and reload', async () => {
          await dashboard.saveDashboard(dashboardTitle);
          await dashboard.goto();
          await dashboard.clickDashboardTitleLink(dashboardTitle);
          await dashboard.waitForRenderComplete();

          await dashboard.clickInPanelChart({ x: 5, y: 5 });
          await expect(dashboard.getDiscoverDrilldownAction()).toBeVisible();
        });
      }
    );
  }
);

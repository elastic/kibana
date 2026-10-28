/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import type { ScoutPage } from '@kbn/scout';
import {
  createLogstashLensEditorSuiteSetup,
  openDiscoverFromPopup,
  spaceTest,
  testData,
} from '../../fixtures';

/**
 * Waits until the dashboard URL is `#/view/{id}` (e.g. after first save from `#/create`)
 * and returns that saved dashboard id.
 */
async function waitForDashboardIdFromUrl(page: ScoutPage): Promise<string> {
  await expect(page).toHaveURL(/#\/view\/[^/?]+/);
  return page.url().split('#/view/')[1].split(/[/?]/)[0];
}

spaceTest.describe(
  'Lens show underlying data from dashboard',
  { tag: '@local-stateful-classic' },
  () => {
    const suiteSetup = createLogstashLensEditorSuiteSetup({
      loadLensArchives: true,
      skipEmptyLensOpen: true,
    });

    spaceTest.beforeAll(suiteSetup.beforeAll);

    spaceTest.beforeEach(suiteSetup.beforeEach);

    spaceTest.afterAll(suiteSetup.afterAll);

    spaceTest(
      'brings dashboard and visualization context to Discover',
      async ({ page, pageObjects, context, kbnUrl, scoutSpace }) => {
        // Save to dashboard, two query-language switches, then Discover popup first paint.
        spaceTest.setTimeout(120_000);
        const { visualize, lens, dashboard, queryBar, filterBar } = pageObjects;
        const panelTitle = 'Embedded Visualization';
        const openInDiscoverAction = testData.DATA_TEST_SUBJECTS.OPEN_IN_DISCOVER_ACTION;
        let dashboardId: string;

        await spaceTest.step('save the visualization to a new dashboard', async () => {
          await visualize.goto();
          await visualize.openSavedVisualization(testData.LENS_BASIC_TITLES.XY_VIS, {
            waitFor: 'lens',
          });
          await lens.waitForVisualization(testData.XY_CHART);
          await lens.save(panelTitle, {
            addToDashboard: 'new',
            saveAsNew: true,
            saveToLibrary: false,
          });
          await dashboard.waitForRenderComplete();
          await dashboard.saveDashboard(`Open in Discover Testing ${scoutSpace.id}-${Date.now()}`);
          dashboardId = await waitForDashboardIdFromUrl(page);
        });

        await spaceTest.step('add a Lucene query and filter on the Lens panel', async () => {
          await dashboard.navigateToLensEditorFromPanel(panelTitle);
          await queryBar.switchQueryLanguage('lucene');
          await queryBar.setQuery('host.keyword www.elastic.co');
          await page.testSubj.click('querySubmitButton');
          await lens.waitForVisualization(testData.XY_CHART);
          await filterBar.addFilter({ field: 'geo.src', operator: 'is', value: 'AF' });
          await expect(page.testSubj.locator('~filter-key-geo.src')).toBeVisible();
          await lens.saveAndReturn();
        });

        await spaceTest.step('add a KQL query and filter on the dashboard', async () => {
          await queryBar.switchQueryLanguage('kql');
          await queryBar.setQuery('request.keyword : "/apm"');
          await page.testSubj.click('querySubmitButton');
          await dashboard.waitForRenderComplete();
          await filterBar.addFilter({
            field: 'host.raw',
            operator: 'is',
            value: 'cdn.theacademyofperformingartsandscience.org',
          });
          await expect(page.testSubj.locator('~filter-key-host.raw')).toBeVisible();
          await expect(dashboard.unsavedChangesIndicator).toBeVisible();
          await dashboard.clickQuickSave();
          await expect(dashboard.unsavedChangesIndicator).toBeHidden();
        });

        await spaceTest.step('reload the saved dashboard in view mode', async () => {
          await dashboard.openDashboardWithId(dashboardId);
          await dashboard.waitForPanelsToLoad(1);
        });

        await spaceTest.step('open Discover from the panel and assert merged context', async () => {
          await dashboard.openPanelContextMenu(panelTitle);
          await expect(page.testSubj.locator(openInDiscoverAction)).toBeVisible();

          const discoverPage = await openDiscoverFromPopup({
            context,
            kbnUrl,
            click: () => page.testSubj.click(openInDiscoverAction),
          });

          await expect(discoverPage.testSubj.locator('^filter-badge')).toHaveCount(3);
          await expect
            .soft(
              discoverPage.testSubj.locator('~filter-key-host.raw', {
                hasText: 'cdn.theacademyofperformingartsandscience.org',
              })
            )
            .toBeVisible();
          await expect
            .soft(discoverPage.testSubj.locator('~filter-key-geo.src', { hasText: 'AF' }))
            .toBeVisible();
          await expect
            .soft(discoverPage.testSubj.locator('~filter', { hasText: 'Lens context (lucene)' }))
            .toBeVisible();
          await expect
            .soft(discoverPage.testSubj.locator('queryInput'))
            .toHaveValue('request.keyword : "/apm"');
        });
      }
    );
  }
);

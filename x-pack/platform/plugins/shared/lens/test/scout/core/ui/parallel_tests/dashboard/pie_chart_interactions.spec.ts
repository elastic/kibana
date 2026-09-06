/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import {
  clickElasticChartCanvas,
  createDashboardWithLibraryLensPanel,
  createLogstashLensEditorSuiteSetup,
  getImportedSavedObjectId,
  spaceTest,
  testData,
} from '../../fixtures';

const CREATE_DRILLDOWN_ACTION = 'embeddablePanelAction-OPEN_FLYOUT_ADD_DRILLDOWN';

spaceTest.describe(
  'Lens dashboard pie chart interactions',
  { tag: '@local-stateful-classic' },
  () => {
    const suiteSetup = createLogstashLensEditorSuiteSetup({
      skipEmptyLensOpen: true,
    });

    let pieVisId: string;
    let pieDashboardId: string;

    spaceTest.beforeAll(async ({ scoutSpace, apiServices }) => {
      // Load here (not `loadLensArchives: true`): Dashboard API panels need `ref_id` UUIDs.
      // `createNewCopies` replaces archive ids; `loadLensArchives` discards the import result.
      const imported = await scoutSpace.savedObjects.load(testData.KBN_ARCHIVE_PATHS.LENS_BASIC);
      pieVisId = getImportedSavedObjectId(imported, 'lens', testData.LENS_BASIC_TITLES.PIE_VIS);
      await suiteSetup.beforeAll({ scoutSpace, apiServices });
      pieDashboardId = await createDashboardWithLibraryLensPanel(apiServices, scoutSpace.id, {
        dashboardTitle: `lns-pie-${scoutSpace.id}`,
        lensSavedObjectId: pieVisId,
      });
    });

    spaceTest.beforeEach(suiteSetup.beforeEach);

    spaceTest.afterAll(suiteSetup.afterAll);

    spaceTest('adds a filter by clicking', async ({ page, pageObjects }) => {
      const { dashboard, filterBar } = pageObjects;
      const pieTitle = testData.LENS_BASIC_TITLES.PIE_VIS;

      await dashboard.openDashboardWithId(pieDashboardId);
      await dashboard.waitForPanelsToLoad(1);

      await clickElasticChartCanvas(page, { x: 5, y: 5 });

      await expect(page.testSubj.locator(`embeddablePanelHeading-${pieTitle}`)).toHaveText(
        pieTitle
      );
      await expect(page.testSubj.locator('~filter-key-geo.dest & ~filter-value-AL')).toBeVisible();

      await filterBar.addFilter({ field: 'geo.src', operator: 'is', value: 'US' });
      await filterBar.toggleFilterPinned('geo.src');
      await expect(
        page.testSubj.locator('~filter-key-geo.src & ~filter-value-US & ~filter-pinned')
      ).toBeVisible();
    });

    spaceTest(
      'adds a Discover drilldown to a Lens panel and keeps it after reload',
      async ({ apiServices, page, pageObjects, scoutSpace }) => {
        const { dashboard } = pageObjects;
        const pieTitle = testData.LENS_BASIC_TITLES.PIE_VIS;

        // Own dashboard: this test saves a drilldown onto the panel.
        const dashboardId = await createDashboardWithLibraryLensPanel(apiServices, scoutSpace.id, {
          dashboardTitle: `lns-pie-drilldown-${scoutSpace.id}-${Date.now()}`,
          lensSavedObjectId: pieVisId,
        });
        await dashboard.openDashboardWithIdInEditMode(dashboardId);
        await dashboard.waitForPanelsToLoad(1);

        await dashboard.clickPanelAction(CREATE_DRILLDOWN_ACTION, pieTitle);
        await page.testSubj.click('drilldownFactoryItem-discover_drilldown');
        await page.testSubj.click('drilldownWizardSubmit');
        await expect(page.testSubj.locator('drilldownWizardSubmit')).toBeHidden();

        await clickElasticChartCanvas(page, { x: 5, y: 5 });
        await expect(
          page.locator('[data-test-subj^="embeddablePanelAction-discover_drilldown"]')
        ).toBeVisible();

        await dashboard.saveChangesToExistingDashboard();
        await dashboard.openDashboardWithId(dashboardId);
        await dashboard.waitForPanelsToLoad(1);

        await clickElasticChartCanvas(page, { x: 5, y: 5 });
        await expect(
          page.locator('[data-test-subj^="embeddablePanelAction-discover_drilldown"]')
        ).toBeVisible();
      }
    );
  }
);

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import {
  createDashboardWithLibraryLensPanel,
  createLogstashLensEditorSuiteSetup,
  getImportedSavedObjectId,
  spaceTest,
  testData,
} from '../../fixtures';

spaceTest.describe('Lens dashboard filters and query', { tag: '@local-stateful-classic' }, () => {
  const suiteSetup = createLogstashLensEditorSuiteSetup({
    skipEmptyLensOpen: true,
  });

  let xyVisId: string;
  let pieVisId: string;

  spaceTest.beforeAll(async ({ scoutSpace, apiServices }) => {
    // Load here (not `loadLensArchives: true`): Dashboard API panels need `ref_id` UUIDs.
    // `createNewCopies` replaces archive ids; `loadLensArchives` discards the import result.
    const imported = await scoutSpace.savedObjects.load(testData.KBN_ARCHIVE_PATHS.LENS_BASIC);
    xyVisId = getImportedSavedObjectId(imported, 'lens', testData.LENS_BASIC_TITLES.XY_VIS);
    pieVisId = getImportedSavedObjectId(imported, 'lens', testData.LENS_BASIC_TITLES.PIE_VIS);
    await suiteSetup.beforeAll({ scoutSpace, apiServices });
  });

  spaceTest.beforeEach(suiteSetup.beforeEach);

  spaceTest.afterAll(suiteSetup.afterAll);

  spaceTest(
    'does not carry unpinned filters into a new Lens visualization from Dashboard',
    async ({ apiServices, page, pageObjects, scoutSpace }) => {
      const { dashboard, filterBar, lens } = pageObjects;

      const dashboardId = await createDashboardWithLibraryLensPanel(apiServices, scoutSpace.id, {
        dashboardTitle: `lns-filter-carry-${scoutSpace.id}-${Date.now()}`,
        lensSavedObjectId: pieVisId,
      });
      await dashboard.openDashboardWithIdInEditMode(dashboardId);
      await dashboard.waitForPanelsToLoad(1);

      await filterBar.addFilter({ field: 'geo.src', operator: 'is', value: 'US' });
      await filterBar.toggleFilterPinned('geo.src');
      await filterBar.addFilter({ field: 'geo.dest', operator: 'is', value: 'LS' });

      await dashboard.addNewLensPanel();
      await lens.waitForLensApp();

      await expect(page.testSubj.locator('~filter-key-geo.dest')).toBeHidden();
      await expect(page.testSubj.locator('~filter-key-geo.src & ~filter-pinned')).toBeVisible();
    }
  );

  spaceTest(
    'recovers a Lens panel after an invalid search query is cleared',
    async ({ apiServices, page, pageObjects, scoutSpace }) => {
      const { dashboard, queryBar } = pageObjects;

      const dashboardId = await createDashboardWithLibraryLensPanel(apiServices, scoutSpace.id, {
        dashboardTitle: `lns-invalid-query-${scoutSpace.id}-${Date.now()}`,
        lensSavedObjectId: xyVisId,
      });
      await dashboard.openDashboardWithId(dashboardId);
      await dashboard.waitForPanelsToLoad(1);

      await queryBar.setQuery('this is > not valid');
      await page.testSubj.click('querySubmitButton');
      await dashboard.waitForRenderComplete();
      await expect(page.testSubj.locator('embeddableError')).toHaveCount(1);

      await queryBar.setQuery('');
      await page.testSubj.click('querySubmitButton');
      await dashboard.waitForRenderComplete();
      await expect(page.testSubj.locator('embeddableError')).toHaveCount(0);
    }
  );
});

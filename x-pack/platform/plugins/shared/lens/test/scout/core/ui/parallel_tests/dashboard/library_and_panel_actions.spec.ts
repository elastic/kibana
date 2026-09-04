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

const EXPLORE_DATA_ACTION = 'embeddablePanelAction-ACTION_EXPLORE_DATA';
const EXPORT_CSV_ACTION = 'embeddablePanelAction-ACTION_EXPORT_CSV';
const SAVE_TO_LIBRARY_ACTION = 'embeddablePanelAction-saveToLibrary';
const UNLINK_FROM_LIBRARY_ACTION = 'embeddablePanelAction-unlinkFromLibrary';

spaceTest.describe(
  'Lens dashboard library and panel actions',
  { tag: '@local-stateful-classic' },
  () => {
    const suiteSetup = createLogstashLensEditorSuiteSetup({
      skipEmptyLensOpen: true,
    });

    let artistMetricId: string;
    let xyVisId: string;
    let pieVisId: string;

    spaceTest.beforeAll(async ({ scoutSpace, apiServices }) => {
      // Load here (not `loadLensArchives: true`): Dashboard API panels need `ref_id` UUIDs.
      // `createNewCopies` replaces archive ids; `loadLensArchives` discards the import result.
      const imported = await scoutSpace.savedObjects.load(testData.KBN_ARCHIVE_PATHS.LENS_BASIC);
      artistMetricId = getImportedSavedObjectId(
        imported,
        'lens',
        testData.LENS_BASIC_TITLES.ARTIST_METRIC
      );
      xyVisId = getImportedSavedObjectId(imported, 'lens', testData.LENS_BASIC_TITLES.XY_VIS);
      pieVisId = getImportedSavedObjectId(imported, 'lens', testData.LENS_BASIC_TITLES.PIE_VIS);
      await suiteSetup.beforeAll({ scoutSpace, apiServices });
    });

    spaceTest.beforeEach(suiteSetup.beforeEach);

    spaceTest.afterAll(suiteSetup.afterAll);

    spaceTest(
      'embeds a legacy metric visualization from the library',
      async ({ apiServices, pageObjects, scoutSpace }) => {
        const { dashboard, lens } = pageObjects;

        const dashboardId = await createDashboardWithLibraryLensPanel(apiServices, scoutSpace.id, {
          dashboardTitle: `lns-embed-metric-${scoutSpace.id}-${Date.now()}`,
          lensSavedObjectId: artistMetricId,
        });
        await dashboard.openDashboardWithId(dashboardId);
        await dashboard.waitForPanelsToLoad(1);

        await expect(lens.metric.legacyMetricLabel).toHaveText(testData.MAX_BYTES_LABEL);
        await expect(lens.metric.legacyMetricValue).toHaveText('19,986');
      }
    );

    spaceTest(
      'hides the old explore underlying data panel action',
      async ({ apiServices, pageObjects, scoutSpace }) => {
        const { dashboard } = pageObjects;
        const xyTitle = testData.LENS_BASIC_TITLES.XY_VIS;

        const dashboardId = await createDashboardWithLibraryLensPanel(apiServices, scoutSpace.id, {
          dashboardTitle: `lns-explore-hidden-${scoutSpace.id}-${Date.now()}`,
          lensSavedObjectId: xyVisId,
        });
        await dashboard.openDashboardWithId(dashboardId);
        await dashboard.waitForPanelsToLoad(1);

        expect(await dashboard.panelHasAction(EXPLORE_DATA_ACTION, xyTitle)).toBe(false);
      }
    );

    spaceTest(
      'shows CSV export in the Lens panel context menu',
      async ({ apiServices, pageObjects, scoutSpace }) => {
        const { dashboard } = pageObjects;
        const pieTitle = testData.LENS_BASIC_TITLES.PIE_VIS;

        const dashboardId = await createDashboardWithLibraryLensPanel(apiServices, scoutSpace.id, {
          dashboardTitle: `lns-csv-export-${scoutSpace.id}-${Date.now()}`,
          lensSavedObjectId: pieVisId,
        });
        await dashboard.openDashboardWithId(dashboardId);
        await dashboard.waitForPanelsToLoad(1);

        expect(await dashboard.panelHasAction(EXPORT_CSV_ACTION, pieTitle)).toBe(true);
      }
    );

    spaceTest(
      'unlinks a Lens panel from the library and saves a copy back',
      async ({ apiServices, page, pageObjects, scoutSpace }) => {
        const { dashboard } = pageObjects;
        const pieTitle = testData.LENS_BASIC_TITLES.PIE_VIS;
        const copyTitle = `lnsPieVis - copy ${scoutSpace.id}`;

        const dashboardId = await createDashboardWithLibraryLensPanel(apiServices, scoutSpace.id, {
          dashboardTitle: `lns-unlink-${scoutSpace.id}-${Date.now()}`,
          lensSavedObjectId: pieVisId,
        });
        await dashboard.openDashboardWithIdInEditMode(dashboardId);
        await dashboard.waitForPanelsToLoad(1);

        await spaceTest.step('unlink the panel from the library', async () => {
          await dashboard.unlinkFromLibrary(pieTitle);
          expect(await dashboard.panelHasAction(SAVE_TO_LIBRARY_ACTION, pieTitle)).toBe(true);
        });

        await spaceTest.step('save a uniquely named copy back to the library', async () => {
          await dashboard.saveToLibrary(copyTitle, pieTitle);
          expect(await dashboard.panelHasAction(UNLINK_FROM_LIBRARY_ACTION, copyTitle)).toBe(true);
        });

        await spaceTest.step('original library visualization is still listed', async () => {
          await dashboard.openLibraryFlyout();
          await expect(
            page.testSubj.locator(`savedObjectTitle${pieTitle.split(' ').join('-')}`)
          ).toBeVisible();
          await dashboard.closeLibraryFlyout();
        });
      }
    );
  }
);

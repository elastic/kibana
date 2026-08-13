/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { createLogstashLensEditorSuiteSetup, spaceTest, testData } from '../../fixtures';

spaceTest.describe('Lens dashboard panel actions', { tag: '@local-stateful-classic' }, () => {
  const suiteSetup = createLogstashLensEditorSuiteSetup({
    loadLensArchives: true,
    skipEmptyLensOpen: true,
  });

  spaceTest.beforeAll(suiteSetup.beforeAll);

  spaceTest.beforeEach(async ({ browserAuth, context, page, pageObjects }) => {
    await suiteSetup.beforeEach({ browserAuth, context, page, pageObjects });
  });

  spaceTest.afterAll(suiteSetup.afterAll);

  spaceTest('metric should be embeddable', async ({ pageObjects }) => {
    const { dashboard, lens } = pageObjects;

    await dashboard.openNewDashboard();
    await dashboard.addPanelFromLibrary(testData.LENS_BASIC_TITLES.ARTIST_METRIC);
    await dashboard.waitForRenderComplete();

    await expect
      .poll(async () => {
        const metric = await lens.metric.getLegacyMetricData();
        return metric.title;
      })
      .toBe('Maximum of bytes');
    const metric = await lens.metric.getLegacyMetricData();
    expect(Number(metric.value.replace(/,/g, ''))).toBeGreaterThan(0);
  });

  spaceTest('hides the old "explore underlying data" action', async ({ pageObjects }) => {
    const { dashboard } = pageObjects;

    await dashboard.openNewDashboard();
    await dashboard.addPanelFromLibrary(testData.LENS_BASIC_TITLES.XY_VIS);
    await dashboard.waitForRenderComplete();
    await dashboard.saveDashboard(`lnsDrilldown ${Date.now()}`);

    // Requires xpack.discoverEnhanced.actions.exploreDataInContextMenu.enabled, which Scout's
    // stateful base config sets (see base.config.ts) but serverless does not.
    await dashboard.expectMissingPanelAction(
      'embeddablePanelAction-ACTION_EXPLORE_DATA',
      testData.LENS_BASIC_TITLES.XY_VIS
    );
  });

  spaceTest('CSV export action exists in panel context menu', async ({ pageObjects }) => {
    const { dashboard } = pageObjects;

    await dashboard.openNewDashboard();
    await dashboard.addPanelFromLibrary(testData.LENS_BASIC_TITLES.PIE_VIS);
    await dashboard.waitForRenderComplete();

    await dashboard.expectExistsPanelAction(
      'embeddablePanelAction-ACTION_EXPORT_CSV',
      testData.LENS_BASIC_TITLES.PIE_VIS
    );
  });

  spaceTest('unlinks then re-saves a panel to the embeddable library', async ({ pageObjects }) => {
    const { dashboard } = pageObjects;
    const libraryCopyTitle = `lnsPieVis - copy ${Date.now()}`;

    await dashboard.openNewDashboard();
    await dashboard.addPanelFromLibrary(testData.LENS_BASIC_TITLES.PIE_VIS);

    await spaceTest.step('unlink the panel from the library', async () => {
      // `unlinkFromLibrary` already asserts the panel is no longer linked.
      await dashboard.unlinkFromLibrary(testData.LENS_BASIC_TITLES.PIE_VIS);
    });

    await spaceTest.step('save the by-value panel back to the library', async () => {
      // `saveToLibrary` already asserts the panel is linked under its new title.
      await dashboard.saveToLibrary(libraryCopyTitle, testData.LENS_BASIC_TITLES.PIE_VIS);
      // Persist the dashboard itself: unlink/save-to-library only change the panel, so
      // without this the dashboard still has unsaved changes, and navigating to a new
      // dashboard next would hit a "leave without saving" confirm that Playwright
      // dismisses by default, silently keeping us on this same dashboard.
      await dashboard.saveDashboard(`unlink-relink ${Date.now()}`);
    });

    await spaceTest.step(
      'the original library item survives the unlink, and the new copy is available alongside it',
      async () => {
        await dashboard.openNewDashboard();
        // `addPanelFromLibrary` asserts each exact title is found and added, so adding both
        // confirms the unlink only detached the dashboard panel — it did not delete the
        // original `PIE_VIS` library item — while also covering the copy from the previous step.
        await dashboard.addPanelFromLibrary(testData.LENS_BASIC_TITLES.PIE_VIS, libraryCopyTitle);
        await dashboard.expectPanelCount(2);
      }
    );
  });
});

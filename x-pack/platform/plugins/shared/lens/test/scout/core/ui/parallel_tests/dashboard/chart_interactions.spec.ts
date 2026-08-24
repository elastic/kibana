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

const XY_TIME_FILTER_LABEL =
  '@timestamp: Sep 21, 2015 @ 09:00:00.000 to Sep 21, 2015 @ 12:00:00.000';
const XY_IP_FILTER_LABEL = 'ip: 97.220.3.248';
/** New date-range picker exposes ISO via `datePicker.getTimeConfig()`. */
const XY_TIME_START = '2015-09-21T09:00:00.000Z';
const XY_TIME_END = '2015-09-21T12:00:00.000Z';
const CREATE_DRILLDOWN_ACTION = 'embeddablePanelAction-OPEN_FLYOUT_ADD_DRILLDOWN';

spaceTest.describe('Lens dashboard chart interactions', { tag: '@local-stateful-classic' }, () => {
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
    'adds filters and time range by clicking in an XY chart',
    async ({ apiServices, page, pageObjects, scoutSpace }) => {
      const { dashboard, datePicker } = pageObjects;
      const xyTitle = testData.LENS_BASIC_TITLES.XY_VIS;

      const dashboardId = await createDashboardWithLibraryLensPanel(apiServices, scoutSpace.id, {
        dashboardTitle: `lns-xy-click-${scoutSpace.id}-${Date.now()}`,
        lensSavedObjectId: xyVisId,
      });
      await dashboard.openDashboardWithId(dashboardId);
      await dashboard.waitForPanelsToLoad(1);
      await expect(page.testSubj.locator('xyVisChart')).toBeVisible();

      // FTR pixel offsets (center-relative) for a logstash XY bar at 1280×1200.
      await clickElasticChartCanvas(page, { x: 30, y: 5 });

      const applyFiltersButton = page.testSubj.locator('applyFiltersPopoverButton');
      const applyFiltersDialog = page.getByRole('dialog').filter({ has: applyFiltersButton });
      await expect(applyFiltersButton).toBeVisible();
      await expect(applyFiltersDialog.getByText(XY_TIME_FILTER_LABEL)).toBeVisible();
      await expect(applyFiltersDialog.getByText(XY_IP_FILTER_LABEL)).toBeVisible();
      await applyFiltersButton.click();
      await expect(applyFiltersButton).toBeHidden();

      await expect(page.testSubj.locator(`embeddablePanelHeading-${xyTitle}`)).toHaveText(xyTitle);
      const time = await datePicker.getTimeConfig();
      expect(time.start).toBe(XY_TIME_START);
      expect(time.end).toBe(XY_TIME_END);
      await expect(
        page.testSubj.locator('~filter-key-ip & ~filter-value-97.220.3.248')
      ).toBeVisible();
    }
  );

  spaceTest(
    'adds filters by right-clicking in an XY chart',
    async ({ apiServices, page, pageObjects, scoutSpace }) => {
      const { dashboard, datePicker } = pageObjects;

      const dashboardId = await createDashboardWithLibraryLensPanel(apiServices, scoutSpace.id, {
        dashboardTitle: `lns-xy-right-click-${scoutSpace.id}-${Date.now()}`,
        lensSavedObjectId: xyVisId,
      });
      await dashboard.openDashboardWithId(dashboardId);
      await dashboard.waitForPanelsToLoad(1);
      await expect(page.testSubj.locator('xyVisChart')).toBeVisible();

      // Tooltip actions: [0] Filter by time, [1] Filter N selected series (expression_xy).
      const tooltipActions = page.locator('.echTooltipActions');
      await clickElasticChartCanvas(page, { x: 30, y: 5 }, { button: 'right' });
      await tooltipActions.getByText(/Filter \d+ selected series/).click();
      await expect(
        page.testSubj.locator('~filter-key-ip & ~filter-value-97.220.3.248')
      ).toBeVisible();

      await clickElasticChartCanvas(page, { x: 35, y: 5 }, { button: 'right' });
      await tooltipActions.getByText('Filter by time').click();
      const time = await datePicker.getTimeConfig();
      expect(time.start).toBe(XY_TIME_START);
      expect(time.end).toBe(XY_TIME_END);
    }
  );

  spaceTest(
    'adds a filter by clicking in a pie chart',
    async ({ apiServices, page, pageObjects, scoutSpace }) => {
      const { dashboard, filterBar } = pageObjects;
      const pieTitle = testData.LENS_BASIC_TITLES.PIE_VIS;

      const dashboardId = await createDashboardWithLibraryLensPanel(apiServices, scoutSpace.id, {
        dashboardTitle: `lns-pie-click-${scoutSpace.id}-${Date.now()}`,
        lensSavedObjectId: pieVisId,
      });
      await dashboard.openDashboardWithId(dashboardId);
      await dashboard.waitForPanelsToLoad(1);

      await clickElasticChartCanvas(page, { x: 5, y: 5 });

      await expect(page.testSubj.locator(`embeddablePanelHeading-${pieTitle}`)).toHaveText(
        pieTitle
      );
      expect(await filterBar.hasFilter({ field: 'geo.dest', value: 'AL' })).toBe(true);
      await filterBar.addFilter({ field: 'geo.src', operator: 'is', value: 'US' });
      await filterBar.toggleFilterPinned('geo.src');
      expect(await filterBar.hasFilter({ field: 'geo.src', value: 'US', pinned: true })).toBe(true);
    }
  );

  spaceTest(
    'adds a Discover drilldown to a Lens pie panel and keeps it after reload',
    async ({ apiServices, page, pageObjects, scoutSpace }) => {
      const { dashboard } = pageObjects;
      const pieTitle = testData.LENS_BASIC_TITLES.PIE_VIS;
      const dashboardTitle = `lns-pie-drilldown-${scoutSpace.id}-${Date.now()}`;

      const dashboardId = await createDashboardWithLibraryLensPanel(apiServices, scoutSpace.id, {
        dashboardTitle,
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
});

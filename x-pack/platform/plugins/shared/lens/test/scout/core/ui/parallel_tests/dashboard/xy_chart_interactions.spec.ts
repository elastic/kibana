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
/** New date-range picker stores ISO on `data-date-range`. */
const XY_TIME_START = '2015-09-21T09:00:00.000Z';
const XY_TIME_END = '2015-09-21T12:00:00.000Z';

spaceTest.describe(
  'Lens dashboard XY chart interactions',
  { tag: '@local-stateful-classic' },
  () => {
    const suiteSetup = createLogstashLensEditorSuiteSetup({
      skipEmptyLensOpen: true,
    });

    let xyVisId: string;
    let xyDashboardId: string;

    spaceTest.beforeAll(async ({ scoutSpace, apiServices }) => {
      // Load here (not `loadLensArchives: true`): Dashboard API panels need `ref_id` UUIDs.
      // `createNewCopies` replaces archive ids; `loadLensArchives` discards the import result.
      const imported = await scoutSpace.savedObjects.load(testData.KBN_ARCHIVE_PATHS.LENS_BASIC);
      xyVisId = getImportedSavedObjectId(imported, 'lens', testData.LENS_BASIC_TITLES.XY_VIS);
      await suiteSetup.beforeAll({ scoutSpace, apiServices });
      xyDashboardId = await createDashboardWithLibraryLensPanel(apiServices, scoutSpace.id, {
        dashboardTitle: `lns-xy-${scoutSpace.id}`,
        lensSavedObjectId: xyVisId,
      });
    });

    spaceTest.beforeEach(suiteSetup.beforeEach);

    spaceTest.afterAll(suiteSetup.afterAll);

    spaceTest('adds filters and time range by clicking', async ({ page, pageObjects }) => {
      const { dashboard } = pageObjects;
      const xyTitle = testData.LENS_BASIC_TITLES.XY_VIS;

      await dashboard.openDashboardWithId(xyDashboardId);
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
      await expect(page.testSubj.locator('dateRangePickerControlButton')).toHaveAttribute(
        'data-date-range',
        `${XY_TIME_START} to ${XY_TIME_END}`
      );
      await expect(
        page.testSubj.locator('~filter-key-ip & ~filter-value-97.220.3.248')
      ).toBeVisible();
    });

    spaceTest('adds an ip filter by right-clicking a series', async ({ page, pageObjects }) => {
      const { dashboard } = pageObjects;
      const tooltipActions = page.locator('.echTooltipActions');

      await dashboard.openDashboardWithId(xyDashboardId);
      await dashboard.waitForPanelsToLoad(1);
      await expect(page.testSubj.locator('xyVisChart')).toBeVisible();

      await clickElasticChartCanvas(page, { x: 30, y: 5 }, { button: 'right' });
      await expect(tooltipActions).toBeVisible();
      await tooltipActions.getByText(/Filter \d+ selected series/).click();
      await expect(
        page.testSubj.locator('~filter-key-ip & ~filter-value-97.220.3.248')
      ).toBeVisible();
    });

    spaceTest('adds a time range by right-clicking', async ({ page, pageObjects }) => {
      const { dashboard } = pageObjects;
      const tooltipActions = page.locator('.echTooltipActions');

      await dashboard.openDashboardWithId(xyDashboardId);
      await dashboard.waitForPanelsToLoad(1);
      await expect(page.testSubj.locator('xyVisChart')).toBeVisible();

      await clickElasticChartCanvas(page, { x: 30, y: 5 }, { button: 'right' });
      await expect(tooltipActions).toBeVisible();
      await tooltipActions.getByText('Filter by time').click();
      await expect(page.testSubj.locator('dateRangePickerControlButton')).toHaveAttribute(
        'data-date-range',
        `${XY_TIME_START} to ${XY_TIME_END}`
      );
    });
  }
);

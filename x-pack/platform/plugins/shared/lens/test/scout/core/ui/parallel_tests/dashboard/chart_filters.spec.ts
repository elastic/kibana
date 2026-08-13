/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { createLogstashLensEditorSuiteSetup, spaceTest, testData } from '../../fixtures';

const XY_BAR_TIME_FILTER_LABEL =
  '@timestamp: Sep 21, 2015 @ 09:00:00.000 to Sep 21, 2015 @ 12:00:00.000';
// `DatePicker.getTimeConfig` reads the new date range picker's `data-date-range` attribute
// verbatim (raw ISO), unlike the "Apply filters" popover label above which is pre-formatted.
const XY_BAR_TIME_RANGE = { start: '2015-09-21T09:00:00.000Z', end: '2015-09-21T12:00:00.000Z' };

spaceTest.describe('Lens dashboard chart filters', { tag: '@local-stateful-classic' }, () => {
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
    'adds filters and a time range by clicking a bar in an XY chart',
    async ({ pageObjects }) => {
      const { dashboard, datePicker, filterBar } = pageObjects;

      await dashboard.openNewDashboard();
      await dashboard.addPanelFromLibrary(testData.LENS_BASIC_TITLES.XY_VIS);
      await dashboard.waitForRenderComplete();

      await dashboard.clickInPanelChart({ x: 30, y: 5 });
      await expect
        .poll(() => dashboard.getPendingChartFilterLabels())
        .toStrictEqual([XY_BAR_TIME_FILTER_LABEL, 'ip: 97.220.3.248']);
      await dashboard.applyChartFilters();
      await dashboard.waitForRenderComplete();

      await expect(
        dashboard.getPanelHoverActionsLocator(testData.LENS_BASIC_TITLES.XY_VIS)
      ).toBeVisible();
      await expect.poll(() => datePicker.getTimeConfig()).toStrictEqual(XY_BAR_TIME_RANGE);
      await expect
        .poll(() => filterBar.hasFilter({ field: 'ip', value: '97.220.3.248' }))
        .toBe(true);
    }
  );

  spaceTest('adds a filter by right-clicking a bar in an XY chart', async ({ pageObjects }) => {
    const { dashboard, datePicker, filterBar } = pageObjects;

    await dashboard.openNewDashboard();
    await dashboard.addPanelFromLibrary(testData.LENS_BASIC_TITLES.XY_VIS);
    await dashboard.waitForRenderComplete();

    await spaceTest.step('right-click reveals the tooltip actions for a bar', async () => {
      const ipFilterAction = dashboard.getChartTooltipAction(/Filter \d+ selected series/);
      await dashboard.clickInPanelChart({ x: 30, y: 5 }, { button: 'right' });
      await expect(ipFilterAction).toBeVisible();
      // echTooltipActions portal repositions while Playwright waits for stability
      await ipFilterAction.dispatchEvent('click');
      await expect
        .poll(() => filterBar.hasFilter({ field: 'ip', value: '97.220.3.248' }))
        .toBe(true);
    });

    await spaceTest.step('right-click a different bar applies the time range', async () => {
      const timeFilterAction = dashboard.getChartTooltipAction('Filter by time');
      await dashboard.clickInPanelChart({ x: 35, y: 5 }, { button: 'right' });
      await expect(timeFilterAction).toBeVisible();
      // echTooltipActions portal repositions while Playwright waits for stability
      await timeFilterAction.dispatchEvent('click');
      await expect.poll(() => datePicker.getTimeConfig()).toStrictEqual(XY_BAR_TIME_RANGE);
    });
  });

  spaceTest('adds a filter by clicking a slice in a pie chart', async ({ pageObjects }) => {
    const { dashboard, filterBar } = pageObjects;

    await dashboard.openNewDashboard();
    await dashboard.addPanelFromLibrary(testData.LENS_BASIC_TITLES.PIE_VIS);
    await dashboard.waitForRenderComplete();

    await dashboard.clickInPanelChart({ x: 5, y: 5 });
    // justified: pie hit-testing can lag one render after canvas click
    await expect
      .poll(() => filterBar.hasFilter({ field: 'geo.dest', value: 'AL' }), {
        timeout: 20_000,
      })
      .toBe(true);

    await expect(
      dashboard.getPanelHoverActionsLocator(testData.LENS_BASIC_TITLES.PIE_VIS)
    ).toBeVisible();
  });

  spaceTest(
    'carries pinned dashboard filters into a new Lens panel, but not unpinned ones',
    async ({ pageObjects }) => {
      const { dashboard, datePicker, filterBar } = pageObjects;

      await dashboard.openNewDashboard();
      await datePicker.setAbsoluteRange(testData.LOGSTASH_IN_RANGE_DATES);

      // Add a panel to populate data views before filters can be added.
      await dashboard.addPanelFromLibrary(testData.LENS_BASIC_TITLES.PIE_VIS);
      await dashboard.waitForRenderComplete();

      await filterBar.addFilter({ field: 'geo.src', operator: 'is', value: 'US' });
      await filterBar.toggleFilterPinned('geo.src');
      await filterBar.addFilter({ field: 'geo.dest', operator: 'is', value: 'LS' });

      await dashboard.addNewLensPanel();

      // Inline editor mount can briefly leave dashboard filters visible — poll until settled.
      await expect.poll(() => filterBar.hasFilter({ field: 'geo.dest', value: 'LS' })).toBe(false);
      await expect
        .poll(() => filterBar.hasFilter({ field: 'geo.src', value: 'US', pinned: true }))
        .toBe(true);
    }
  );
});

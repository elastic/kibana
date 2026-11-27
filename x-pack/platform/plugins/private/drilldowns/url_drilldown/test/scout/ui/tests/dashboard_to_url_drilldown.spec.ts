/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

const ES_ARCHIVE_LOGSTASH = 'x-pack/platform/test/fixtures/es_archives/logstash_functional';
const KBN_ARCHIVE =
  'x-pack/platform/test/functional/fixtures/kbn_archives/dashboard_drilldowns/drilldowns';
const DASHBOARD_WITH_AREA_CHART_ID = '24f3f950-69d9-11ea-a14d-e341629a29e6';
const AREA_CHART_PANEL_TITLE = 'Visualization漢字 AreaChart';
const DRILLDOWN_TO_DISCOVER_NAME = 'Go to discover';
// Time range stored on the "Dashboard With Area Chart" saved object
const DASHBOARD_TIME_FROM = '2015-09-19T17:34:10.297Z';
const DASHBOARD_TIME_TO = '2015-09-23T00:09:17.180Z';
const URL_TEMPLATE =
  "{{kibanaUrl}}/app/discover#/?_g=(filters:!(),refreshInterval:(pause:!t,value:0),time:(from:'{{date event.from}}',to:'{{date event.to}}'))" +
  "&_a=(columns:!(_source),filters:{{rison context.panel.filters}},index:'{{context.panel.indexPatternId}}',interval:auto,query:(language:{{context.panel.query.language}},query:'{{context.panel.query.query}}'),sort:!())";

const HOUR_MS = 60 * 60 * 1000;

const getTimeRangeDurationMs = (url: string) => {
  const match = decodeURIComponent(url).match(/time:\(from:'([^']+)',to:'([^']+)'\)/);
  if (!match) {
    throw new Error(`Expected "${url}" to contain a time range in _g`);
  }
  return new Date(match[2]).getTime() - new Date(match[1]).getTime();
};

test.describe('Dashboard to URL drilldown', { tag: '@local-stateful-classic' }, () => {
  let prevDefaultIndex: string | number | boolean | undefined;

  test.beforeAll(async ({ esArchiver, kbnClient, uiSettings }) => {
    prevDefaultIndex = await kbnClient.uiSettings.get('defaultIndex');
    await esArchiver.loadIfNeeded(ES_ARCHIVE_LOGSTASH);
    await kbnClient.importExport.load(KBN_ARCHIVE);
    await uiSettings.set({ defaultIndex: 'logstash-*' });
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
  });

  test.afterAll(async ({ kbnClient, uiSettings }) => {
    await kbnClient.savedObjects.cleanStandardList();
    if (prevDefaultIndex !== undefined) {
      await uiSettings.set({ defaultIndex: prevDefaultIndex });
    } else {
      await uiSettings.unset('defaultIndex');
    }
  });

  test('should create dashboard to URL drilldown and use it to navigate to discover', async ({
    page,
    pageObjects,
  }) => {
    const { dashboard } = pageObjects;

    await test.step('create the URL drilldown in edit mode', async () => {
      await dashboard.openDashboardWithIdInEditMode(DASHBOARD_WITH_AREA_CHART_ID);
      await dashboard.clickPanelAction(
        'embeddablePanelAction-OPEN_FLYOUT_ADD_DRILLDOWN',
        AREA_CHART_PANEL_TITLE
      );
      await expect(page.testSubj.locator('createDrilldownFlyout')).toBeVisible();
      await dashboard.createUrlDrilldown(
        DRILLDOWN_TO_DISCOVER_NAME,
        URL_TEMPLATE,
        'on_select_range',
        true
      );
      await expect(page.testSubj.locator('createDrilldownFlyout')).toBeHidden();
    });

    await test.step('save the dashboard', async () => {
      // The panel already has a dashboard to dashboard drilldown, so the badge shows 2
      await dashboard.openPanelContextMenu(AREA_CHART_PANEL_TITLE);
      await expect(
        page.testSubj
          .locator('embeddablePanelAction-OPEN_FLYOUT_EDIT_DRILLDOWN')
          .filter({ visible: true })
          .locator('.euiNotificationBadge')
      ).toHaveText('2');
      await page.keyboard.press('Escape');

      await dashboard.saveChangesToExistingDashboard();
    });

    await test.step('brush the chart and navigate to discover through the drilldown', async () => {
      // Reloading from the saved object verifies the drilldown was persisted
      await dashboard.openDashboardWithId(DASHBOARD_WITH_AREA_CHART_ID);
      const areaChart = page.testSubj.locator('visualizationLoader');
      await expect(areaChart).toBeVisible();
      const box = await areaChart.boundingBox();
      if (!box) {
        throw new Error('Expected the area chart to have a bounding box');
      }
      const y = box.y + box.height / 2;
      const centerX = box.x + box.width / 2;
      await page.mouse.move(centerX - 100, y);
      await page.mouse.down();
      await page.mouse.move(centerX, y, { steps: 5 });
      await page.mouse.move(centerX + 100, y, { steps: 5 });
      await page.mouse.up();

      const actionsMenu = page.testSubj.locator('multipleActionsContextMenu');
      await expect(actionsMenu).toBeVisible();
      const [discoverPage] = await Promise.all([
        page.waitForEvent('popup'),
        actionsMenu.getByText(DRILLDOWN_TO_DISCOVER_NAME, { exact: true }).click(),
      ]);

      await discoverPage.waitForURL(/app\/discover/);
      const originalDurationMs =
        new Date(DASHBOARD_TIME_TO).getTime() - new Date(DASHBOARD_TIME_FROM).getTime();
      const newDurationMs = getTimeRangeDurationMs(discoverPage.url());
      // The brushed range replaces the dashboard time range, and is not the default last 15 minutes
      expect(newDurationMs).toBeLessThan(originalDurationMs);
      expect(newDurationMs).toBeGreaterThan(HOUR_MS);
    });
  });
});

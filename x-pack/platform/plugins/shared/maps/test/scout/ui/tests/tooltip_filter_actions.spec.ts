/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags, test } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

const KBN_ARCHIVE = 'x-pack/platform/test/functional/fixtures/kbn_archives/maps.json';
const ES_ARCHIVE_LOGSTASH = 'x-pack/platform/test/fixtures/es_archives/logstash_functional';
const ES_ARCHIVE_MAPS_DATA = 'x-pack/platform/test/fixtures/es_archives/maps/data';
const DEFAULT_INDEX_ID = 'c698b940-e149-11e8-a35a-370a8516603a';
const TOOLTIP_FILTER_ACTION_DASHBOARD_ID = '03c7cbf0-8eae-11e9-b674-69d1999628e4';

test.describe(
  'Maps - tooltip filter actions',
  {
    tag: tags.stateful.classic,
  },
  () => {
    test.beforeAll(async ({ kbnClient, esArchiver, uiSettings }) => {
      await esArchiver.loadIfNeeded(ES_ARCHIVE_LOGSTASH);
      await esArchiver.loadIfNeeded(ES_ARCHIVE_MAPS_DATA);
      await kbnClient.importExport.load(KBN_ARCHIVE);
      await uiSettings.set({ defaultIndex: DEFAULT_INDEX_ID });
    });

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsViewer();
    });

    test.afterAll(async ({ kbnClient, uiSettings }) => {
      await kbnClient.savedObjects.cleanStandardList();
      await uiSettings.unset('defaultIndex');
    });

    test.describe('apply filter to current view', () => {
      test('apply filter to current view lifecycle', async ({ page, pageObjects }) => {
        await pageObjects.dashboard.openDashboardWithId(TOOLTIP_FILTER_ACTION_DASHBOARD_ID);
        await pageObjects.maps.lockTooltipAtPosition(200, -200);

        await test.step('create filter button is visible when tooltip is locked', async () => {
          await expect(page.testSubj.locator('mapTooltipCreateFilterButton')).toBeVisible();
        });

        await test.step('clicking create filter button adds a join filter', async () => {
          await page.testSubj.click('mapTooltipCreateFilterButton');
          await pageObjects.dashboard.waitForRenderComplete();
          await pageObjects.maps.waitForLayersToLoad();

          const numFilters = await pageObjects.filterBar.getFilterCount();
          expect(numFilters).toBe(1);

          const hasJoinFilter = await pageObjects.filterBar.hasFilter({
            field: 'runtime_shape_name',
            value: 'charlie',
          });
          expect(hasJoinFilter).toBe(true);
        });
      });
    });

    test.describe('panel actions', () => {
      test('should trigger dashboard drilldown action when clicked', async ({
        page,
        pageObjects,
      }) => {
        await pageObjects.dashboard.openDashboardWithId(TOOLTIP_FILTER_ACTION_DASHBOARD_ID);
        await pageObjects.maps.lockTooltipAtPosition(200, -200);

        await page.testSubj.click('mapTooltipMoreActionsButton');
        await page.testSubj.click('mapFilterActionButton__drilldown1');

        // Assert we landed on the target dashboard with filter from drilldown action
        await expect(pageObjects.dashboard.getAppTitle()).toContainText('map embeddable example');
        await pageObjects.dashboard.waitForRenderComplete();
        const panelCount = await pageObjects.dashboard.getPanelCount();
        expect(panelCount).toBe(2);

        const hasJoinFilter = await pageObjects.filterBar.hasFilter({
          field: 'runtime_shape_name',
          value: 'charlie',
        });
        expect(hasJoinFilter).toBe(true);
      });

      test('should trigger url drilldown action when clicked', async ({
        page,
        pageObjects,
      }) => {
        await pageObjects.dashboard.openDashboardWithId(TOOLTIP_FILTER_ACTION_DASHBOARD_ID);
        await pageObjects.maps.lockTooltipAtPosition(200, -200);

        await page.testSubj.click('mapTooltipMoreActionsButton');
        await page.testSubj.click('mapFilterActionButton__urlDrilldownToDiscover');

        // Assert we landed on Discover with filter from drilldown action
        await page.locator('.dscPage').waitFor({ state: 'visible' });
        const hasFilter = await pageObjects.filterBar.hasFilter({
          field: 'name',
          value: 'charlie',
        });
        expect(hasFilter).toBe(true);
      });
    });
  }
);

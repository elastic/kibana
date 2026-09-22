/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags, test } from '@kbn/scout';

const KBN_ARCHIVE = 'x-pack/platform/test/functional/fixtures/kbn_archives/maps.json';
const ES_ARCHIVE_LOGSTASH = 'x-pack/platform/test/fixtures/es_archives/logstash_functional';
const ES_ARCHIVE_MAPS_DATA = 'x-pack/platform/test/fixtures/es_archives/maps/data';
const FILTER_BY_MAP_EXTENT_ACTION = 'embeddablePanelAction-FILTER_BY_MAP_EXTENT';
const FILTER_BY_MAP_EXTENT_SWITCH = 'filterByMapExtentSwitch24ade730-afe4-42b6-919a-c4e0a98c94f2';
const DEFAULT_INDEX_ID = 'c698b940-e149-11e8-a35a-370a8516603a';

test.describe(
  'Maps - filter by map extent',
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
      await browserAuth.loginAsAdmin();
    });

    test.afterAll(async ({ kbnClient, uiSettings }) => {
      await kbnClient.savedObjects.cleanStandardList();
      await uiSettings.unset('defaultIndex');
    });

    // Failing: https://github.com/elastic/kibana/issues/283853
    test.skip(true, 'Failing: https://github.com/elastic/kibana/issues/283853');

    test('should not filter dashboard by map extent before "filter by map extent" is enabled', async ({
      pageObjects,
    }) => {
      await pageObjects.dashboard.goto();
      await pageObjects.dashboard.clickDashboardTitleLink('filter by map extent dashboard');
      await pageObjects.dashboard.switchToEditMode();
      await pageObjects.lens.assertLegacyMetric('Count of records', '6');
    });

    test('should filter dashboard by map extent when "filter by map extent" is enabled', async ({
      page,
      pageObjects,
    }) => {
      await pageObjects.dashboard.goto();
      await pageObjects.dashboard.clickDashboardTitleLink('filter by map extent dashboard');
      await pageObjects.dashboard.switchToEditMode();

      await pageObjects.dashboard.clickPanelAction(FILTER_BY_MAP_EXTENT_ACTION, 'document example');
      await pageObjects.lens.setEuiSwitch(FILTER_BY_MAP_EXTENT_SWITCH, true);
      await page.keyboard.press('Escape');
      await pageObjects.dashboard.waitForRenderComplete();

      await pageObjects.lens.assertLegacyMetric('Count of records', '1');
    });

    test('should filter dashboard by new map extent when map is moved', async ({
      page,
      pageObjects,
    }) => {
      await pageObjects.dashboard.goto();
      await pageObjects.dashboard.clickDashboardTitleLink('filter by map extent dashboard');
      await pageObjects.dashboard.switchToEditMode();

      await pageObjects.dashboard.clickPanelAction(FILTER_BY_MAP_EXTENT_ACTION, 'document example');
      await pageObjects.lens.setEuiSwitch(FILTER_BY_MAP_EXTENT_SWITCH, true);
      await page.keyboard.press('Escape');
      await pageObjects.dashboard.waitForRenderComplete();

      await pageObjects.maps.setView(32.95539, -93.93054, 5);
      await pageObjects.dashboard.waitForRenderComplete();

      await pageObjects.lens.assertLegacyMetric('Count of records', '2');
    });

    test('should remove map extent filter when "filter by map extent" is disabled', async ({
      page,
      pageObjects,
    }) => {
      await pageObjects.dashboard.goto();
      await pageObjects.dashboard.clickDashboardTitleLink('filter by map extent dashboard');
      await pageObjects.dashboard.switchToEditMode();

      await pageObjects.dashboard.clickPanelAction(FILTER_BY_MAP_EXTENT_ACTION, 'document example');
      await pageObjects.lens.setEuiSwitch(FILTER_BY_MAP_EXTENT_SWITCH, true);
      await page.keyboard.press('Escape');
      await pageObjects.dashboard.waitForRenderComplete();

      await pageObjects.dashboard.clickPanelAction(FILTER_BY_MAP_EXTENT_ACTION, 'document example');
      await pageObjects.lens.setEuiSwitch(FILTER_BY_MAP_EXTENT_SWITCH, false);
      await page.keyboard.press('Escape');
      await pageObjects.dashboard.waitForRenderComplete();

      await pageObjects.lens.assertLegacyMetric('Count of records', '6');
    });
  }
);

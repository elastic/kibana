/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { tags, test } from '@kbn/scout';

const KBN_ARCHIVE = 'x-pack/platform/test/functional/fixtures/kbn_archives/maps.json';
const ES_ARCHIVE_LOGSTASH = 'x-pack/platform/test/fixtures/es_archives/logstash_functional';
const ES_ARCHIVE_MAPS_DATA = 'x-pack/platform/test/fixtures/es_archives/maps/data';
const FILTER_BY_MAP_EXTENT_ACTION = 'embeddablePanelAction-FILTER_BY_MAP_EXTENT';
const FILTER_BY_MAP_EXTENT_SWITCH = 'filterByMapExtentSwitch24ade730-afe4-42b6-919a-c4e0a98c94f2';
const DEFAULT_INDEX_ID = 'c698b940-e149-11e8-a35a-370a8516603a';
const FILTER_BY_MAP_EXTENT_DASHBOARD_ID = '42f6f040-b34f-11eb-8c95-dd19591c63df';

test.describe(
  'Maps - filter by map extent',
  {
    tag: tags.stateful.classic,
  },
  () => {
    let prevDefaultIndex: string | number | boolean | undefined;

    test.beforeAll(async ({ kbnClient, esArchiver, uiSettings }) => {
      prevDefaultIndex = await kbnClient.uiSettings.get('defaultIndex');
      await esArchiver.loadIfNeeded(ES_ARCHIVE_LOGSTASH);
      await esArchiver.loadIfNeeded(ES_ARCHIVE_MAPS_DATA);
      await kbnClient.importExport.load(KBN_ARCHIVE);
      await uiSettings.set({ defaultIndex: DEFAULT_INDEX_ID });
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

    test('filter by map extent lifecycle', async ({ page, pageObjects }) => {
      await pageObjects.dashboard.openDashboardWithId(FILTER_BY_MAP_EXTENT_DASHBOARD_ID);
      await pageObjects.dashboard.switchToEditMode();

      await test.step('metric shows all records before filter is enabled', async () => {
        await pageObjects.lens.assertLegacyMetric('Count of records', '6');
      });

      await test.step('metric filters to current extent when filter is enabled', async () => {
        await pageObjects.dashboard.clickPanelAction(
          FILTER_BY_MAP_EXTENT_ACTION,
          'document example'
        );
        await pageObjects.lens.setEuiSwitch(FILTER_BY_MAP_EXTENT_SWITCH, true);
        await page.keyboard.press('Escape');
        await expect
          .poll(() => page.locator('[data-test-subj="metric_value"]').textContent())
          .toBe('1');
      });

      await test.step('metric updates when map is panned', async () => {
        await pageObjects.maps.setView(32.95539, -93.93054, 5);
        await expect
          .poll(() => page.locator('[data-test-subj="metric_value"]').textContent())
          .toBe('2');
      });

      await test.step('metric returns to all records when filter is disabled', async () => {
        await pageObjects.dashboard.clickPanelAction(
          FILTER_BY_MAP_EXTENT_ACTION,
          'document example'
        );
        await pageObjects.lens.setEuiSwitch(FILTER_BY_MAP_EXTENT_SWITCH, false);
        await page.keyboard.press('Escape');
        await expect
          .poll(() => page.locator('[data-test-subj="metric_value"]').textContent())
          .toBe('6');
      });
    });
  }
);

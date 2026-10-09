/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { test } from '@kbn/scout';
import { UnifiedFieldList } from '../fixtures/unified_field_list';

const KBN_ARCHIVE = 'x-pack/platform/test/functional/fixtures/kbn_archives/maps.json';
const ES_ARCHIVE_LOGSTASH = 'x-pack/platform/test/fixtures/es_archives/logstash_functional';
const ES_ARCHIVE_MAPS_DATA = 'x-pack/platform/test/fixtures/es_archives/maps/data';

test.describe(
  'Maps - discover visualize button',
  {
    tag: '@local-stateful-classic',
  },
  () => {
    test.beforeAll(async ({ kbnClient, esArchiver }) => {
      await esArchiver.loadIfNeeded(ES_ARCHIVE_LOGSTASH);
      await esArchiver.loadIfNeeded(ES_ARCHIVE_MAPS_DATA);
      await kbnClient.importExport.load(KBN_ARCHIVE);
      await kbnClient.uiSettings.update({
        'timepicker:timeDefaults':
          '{ "from": "2015-09-22T00:00:00.000Z", "to": "2015-09-22T04:00:00.000Z" }',
      });
    });

    test.beforeEach(async ({ browserAuth, page }) => {
      await browserAuth.loginAsPrivilegedUser();
      await page.gotoApp('discover');
    });

    test.afterAll(async ({ kbnClient }) => {
      await kbnClient.uiSettings.unset('timepicker:timeDefaults');
      await kbnClient.savedObjects.cleanStandardList();
    });

    test('should link geo_shape fields to Maps application', async ({ page, pageObjects }) => {
      const { maps, discover } = pageObjects;
      const unifiedFieldList = new UnifiedFieldList(page);

      await discover.selectDataView('geo_shapes*');
      await unifiedFieldList.clickFieldListItemVisualize('geometry');
      await maps.waitForLayersToLoad();
      await expect
        .poll(async () => maps.doesLayerExist('geo_shapes*'), { timeout: 60_000 })
        .toBe(true);
      await expect
        .poll(() => maps.getLayerTocTooltipMsg('geo_shapes*'), { timeout: 60_000 })
        .toBe('geo_shapes*\nFound ~8 documents. This count is approximate.');

      await maps.refreshAndClearUnsavedChangesWarning();
    });

    test('should link geo_point fields to Maps application with time and query context', async ({
      page,
      pageObjects,
    }) => {
      const { maps, discover, queryBar } = pageObjects;
      const unifiedFieldList = new UnifiedFieldList(page);

      await discover.selectDataView('logstash-*');
      await queryBar.setQuery('machine.os.raw : "ios"');
      await queryBar.submitQuery();

      await unifiedFieldList.clickFieldListItemVisualize('geo.coordinates');
      await maps.waitForLayersToLoad();
      await expect
        .poll(async () => maps.doesLayerExist('logstash-*'), { timeout: 60_000 })
        .toBe(true);
      await expect
        .poll(() => maps.getLayerTocTooltipMsg('logstash-*'), { timeout: 60_000 })
        .toBe(
          'logstash-*\nFound 7 documents.\nResults narrowed by global search\nResults narrowed by global time'
        );

      await maps.refreshAndClearUnsavedChangesWarning();
    });
  }
);

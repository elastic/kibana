/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { test } from '@kbn/scout';

const KBN_ARCHIVE = 'x-pack/platform/test/functional/fixtures/kbn_archives/maps.json';
const ES_ARCHIVE_LOGSTASH = 'x-pack/platform/test/fixtures/es_archives/logstash_functional';
const ES_ARCHIVE_MAPS_DATA = 'x-pack/platform/test/fixtures/es_archives/maps/data';
const DEFAULT_INDEX_ID = 'c698b940-e149-11e8-a35a-370a8516603a';

// Saved map IDs from the kbn_archives/maps.json fixture
const TOP_HITS_MAP_ID = '68305470-87bc-11e9-a991-3b492a7c3e09';
const TOP_HITS_SCRIPTED_FIELD_MAP_ID = '4ea1e4f0-4dba-11ea-b554-4ba0def79f86';

test.describe(
  'Maps - geo top hits',
  {
    tag: '@local-stateful-classic',
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

    test('split on string field - should display top hits per entity', async ({ pageObjects }) => {
      await pageObjects.maps.openMapWithId(TOP_HITS_MAP_ID);
      await expect
        .poll(() => pageObjects.maps.getLayerTocTooltipMsg('logstash'), { timeout: 20_000 })
        .toContain('Found 5 entities. Showing top 2 documents per entity.');

      // should not return any hits
      await expect.poll(() => pageObjects.maps.getHits(), { timeout: 20_000 }).toBe('0');
    });

    test('split on scripted field - should display top hits per entity', async ({
      pageObjects,
    }) => {
      await pageObjects.maps.openMapWithId(TOP_HITS_SCRIPTED_FIELD_MAP_ID);
      await expect
        .poll(() => pageObjects.maps.getLayerTocTooltipMsg('logstash'), { timeout: 20_000 })
        .toContain('Found 24 entities. Showing top 1 documents per entity.');
    });
  }
);

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
const DEFAULT_INDEX_ID = 'c698b940-e149-11e8-a35a-370a8516603a';

// Saved map ID from the kbn_archives/maps.json fixture
const AUTO_FIT_INITIAL_LOCATION_MAP_ID = '13776f20-db37-11ea-8fbb-3da39bb9bff2';

test.describe(
  'Maps - auto fit map to bounds - initial location',
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

    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsPrivilegedUser();
      await pageObjects.maps.openMapWithId(AUTO_FIT_INITIAL_LOCATION_MAP_ID);
    });

    test.afterAll(async ({ kbnClient, uiSettings }) => {
      await kbnClient.savedObjects.cleanStandardList();
      if (prevDefaultIndex !== undefined) {
        await uiSettings.set({ defaultIndex: prevDefaultIndex });
      } else {
        await uiSettings.unset('defaultIndex');
      }
    });

    test('should automatically fit to bounds on initial map load', async ({ pageObjects }) => {
      const hits = await pageObjects.maps.getHits();
      expect(hits).toBe('6');

      const { lat, lon } = await pageObjects.maps.getView();
      expect(Math.round(lat)).toBeGreaterThanOrEqual(41);
      expect(Math.round(lat)).toBeLessThanOrEqual(43);
      expect(Math.round(lon)).toBe(-99);
    });
  }
);

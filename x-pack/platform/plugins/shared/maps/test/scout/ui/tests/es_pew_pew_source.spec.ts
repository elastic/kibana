/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { test } from '@kbn/scout';

const KBN_ARCHIVE = 'x-pack/platform/test/functional/fixtures/kbn_archives/maps.json';
const ES_ARCHIVE_MAPS_DATA = 'x-pack/platform/test/fixtures/es_archives/maps/data';

const PEW_PEW_MAP_ID = '3c9949f0-c8dc-11e9-9ea1-8b2710d4a86b';
const VECTOR_SOURCE_ID = '67c1de2c-2fc5-4425-8983-094b589afe61';

test.describe(
  'Maps - point to point source',
  {
    tag: '@local-stateful-classic',
  },
  () => {
    test.beforeAll(async ({ kbnClient, esArchiver }) => {
      await esArchiver.loadIfNeeded(ES_ARCHIVE_MAPS_DATA);
      await kbnClient.importExport.load(KBN_ARCHIVE);
    });

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsPrivilegedUser();
    });

    test.afterAll(async ({ kbnClient }) => {
      await kbnClient.savedObjects.cleanStandardList();
    });

    test('point to point source', async ({ pageObjects }) => {
      await pageObjects.maps.openMapWithId(PEW_PEW_MAP_ID);

      await test.step('should render lines', async () => {
        await expect
          .poll(async () => {
            const mapboxStyle = await pageObjects.maps.getMapboxStyle();
            const features = mapboxStyle.sources[VECTOR_SOURCE_ID]?.data?.features;
            return { count: features.length, type: features[0]?.geometry.type };
          })
          .toStrictEqual({ count: 4, type: 'LineString' });
      });

      await test.step('should fit to bounds', async () => {
        // Move to the other side of the world so no data is visible
        await pageObjects.maps.setView(-70, 0, 6);
        await pageObjects.maps.clickFitToBounds('connections');
        await expect
          .poll(async () => {
            const { lat, lon } = await pageObjects.maps.getView();
            return { lat: Math.round(lat), lon: Math.round(lon) };
          })
          .toStrictEqual({ lat: 41, lon: -70 });
      });
    });
  }
);

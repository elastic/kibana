/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

const KBN_ARCHIVE = 'x-pack/platform/test/functional/fixtures/kbn_archives/maps.json';
const ES_ARCHIVE_MAPS_DATA = 'x-pack/platform/test/fixtures/es_archives/maps/data';

const MVT_JOIN_MAP_ID = 'f85dc420-ba99-11ec-8403-51529e77089a';
const LAYER_NAME = 'geo_shapes*';

test.describe('Maps - vector tile layer with joins', { tag: '@local-stateful-classic' }, () => {
  test.beforeAll(async ({ esArchiver, kbnClient }) => {
    await esArchiver.loadIfNeeded(ES_ARCHIVE_MAPS_DATA);
    await kbnClient.importExport.load(KBN_ARCHIVE);
  });

  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.maps.openMapWithId(MVT_JOIN_MAP_ID);
  });

  test.afterAll(async ({ kbnClient }) => {
    await kbnClient.savedObjects.cleanStandardList();
  });

  test('legend and tooltip', async ({ page, pageObjects }) => {
    await test.step('should show dynamic data range in legend', async () => {
      await expect
        .poll(
          async () =>
            (await pageObjects.maps.getLayerTOCDetails(LAYER_NAME)).trim().split('\n').slice(0, 9),
          { timeout: 15_000 }
        )
        .toStrictEqual([
          // field display name
          'max prop1',
          // bands 1-8
          '< 4.13',
          '4.13 up to 5.25',
          '5.25 up to 6.38',
          '6.38 up to 7.5',
          '7.5 up to 8.63',
          '8.63 up to 9.75',
          '9.75 up to 11',
          '>= 11',
        ]);
    });

    await test.step('should show join metrics in tooltip', async () => {
      // zoom in on feature so tooltip click can not miss
      await pageObjects.maps.setView(-1, 60, 9);
      await pageObjects.maps.lockTooltipAtPosition(200, -200);

      const tooltipRows = page.locator('.mapFeatureTooltip_row');
      await expect(tooltipRows).toHaveText(['name charlie', 'max prop1 12'], {
        useInnerText: true,
      });
    });
  });

  test('query bar', async ({ pageObjects }) => {
    await pageObjects.maps.setAndSubmitQuery('prop1 < 10');

    await test.step('should update dynamic data range in legend', async () => {
      // join metrics load separately from the map; poll until the legend reflects the query
      await expect
        .poll(
          async () =>
            (await pageObjects.maps.getLayerTOCDetails(LAYER_NAME)).trim().split('\n').slice(0, 9),
          { timeout: 15_000 }
        )
        .toStrictEqual([
          // field display name
          'max prop1',
          // bands 1-8
          '< 3.63',
          '3.63 up to 4.25',
          '4.25 up to 4.88',
          '4.88 up to 5.5',
          '5.5 up to 6.13',
          '6.13 up to 6.75',
          '6.75 up to 7.38',
          '>= 7.38',
        ]);
    });

    await test.step('fit to bounds should exclude source features without join matches', async () => {
      await pageObjects.maps.clickFitToData();

      const { lat, lon, zoom } = await pageObjects.maps.getView();
      expect(Math.round(lat)).toBe(0);
      expect(Math.round(lon)).toBe(90);
      expect(Math.ceil(zoom)).toBe(5);
    });
  });
});

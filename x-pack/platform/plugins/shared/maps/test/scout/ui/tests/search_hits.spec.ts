/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout';
import { test } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

const KBN_ARCHIVE = 'x-pack/platform/test/functional/fixtures/kbn_archives/maps.json';
const ES_ARCHIVE_LOGSTASH = 'x-pack/platform/test/fixtures/es_archives/logstash_functional';
const ES_ARCHIVE_MAPS_DATA = 'x-pack/platform/test/fixtures/es_archives/maps/data';
const DEFAULT_INDEX_ID = 'c698b940-e149-11e8-a35a-370a8516603a';

// Saved map IDs from the kbn_archives/maps.json fixture
const DOCUMENT_EXAMPLE_ID = 'd2e73f40-e14a-11e8-a35a-370a8516603a'; // 'document example'
const ANTIMERIDIAN_POINTS_ID = '346fbec0-1811-11e9-b78a-23d706cd2507'; // 'antimeridian points example'
const ANTIMERIDIAN_SHAPES_ID = '6a6ff930-18f8-11e9-97c8-5da5e037299c'; // 'antimeridian shapes example'

const LAYER_NAME = 'logstash';
const QUERY = 'machine.os.raw : "win 8" OR machine.os.raw : "ios"';
const LAYER_QUERY = 'machine.os.raw : "ios"';

const MAPS_ALL_READ_INDICES_ROLE: KibanaRole = {
  kibana: [{ base: [], feature: { maps: ['all'] }, spaces: ['*'] }],
  elasticsearch: {
    cluster: [],
    indices: [
      {
        names: ['logstash*', 'antimeridian_points*', 'antimeridian_shapes*'],
        privileges: ['read', 'view_index_metadata'],
      },
    ],
  },
};

test.describe(
  'Maps - documents source - search hits',
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

    test.beforeEach(async ({ browserAuth, page }) => {
      // Fit-to-bounds zoom depends on the viewport size, so match the FTR window size.
      await page.setViewportSize({ width: 1600, height: 1000 });
      await browserAuth.loginWithCustomRole(MAPS_ALL_READ_INDICES_ROLE);
    });

    test.afterAll(async ({ kbnClient, uiSettings }) => {
      await kbnClient.savedObjects.cleanStandardList();
      if (prevDefaultIndex !== undefined) {
        await uiSettings.set({ defaultIndex: prevDefaultIndex });
      } else {
        await uiSettings.unset('defaultIndex');
      }
    });

    test('should re-fetch documents with refresh timer', async ({ pageObjects }) => {
      const { maps } = pageObjects;
      await maps.openMapWithId(DOCUMENT_EXAMPLE_ID);

      let beforeRefreshTimerTimestamp = '';
      await expect
        .poll(async () => {
          beforeRefreshTimerTimestamp = await maps.getRequestTimestamp();
          return beforeRefreshTimerTimestamp.length;
        })
        .toBe(24);
      await maps.triggerSingleRefresh(1000);
      await expect
        .poll(() => maps.getRequestTimestamp(), { timeout: 30_000 })
        .not.toBe(beforeRefreshTimerTimestamp);
    });

    test('query bar', async ({ pageObjects }) => {
      const { maps } = pageObjects;
      await maps.openMapWithId(DOCUMENT_EXAMPLE_ID);

      await test.step('should register elasticsearch request in inspector', async () => {
        // the next step types a query
        await expect.poll(() => maps.getHits(undefined, true)).toBe('5');
      });

      await test.step('should apply query to search request', async () => {
        await maps.setAndSubmitQuery(QUERY);
        await expect.poll(() => maps.getHits()).toBe('2');
      });

      await test.step('should re-fetch query when "refresh" is clicked', async () => {
        const beforeQueryRefreshTimestamp = await maps.getRequestTimestamp();
        await maps.refreshQuery();
        await expect.poll(() => maps.getRequestTimestamp()).not.toBe(beforeQueryRefreshTimestamp);
      });

      await test.step('should apply query to fit to bounds', async () => {
        // Set view to other side of world so no matching results
        await maps.setView(-15, -100, 6);
        await maps.clickFitToBounds(LAYER_NAME);
        await expect
          .poll(async () => {
            const { lat, lon, zoom } = await maps.getView();
            return {
              lat: Math.round(lat),
              lon: Math.round(lon),
              // Centering is correct, but screen-size and dpi affect zoom level,
              // causing this test to be brittle in different environments
              // Expecting zoom-level to be between ]4,5]
              zoom: Math.ceil(zoom),
            };
          })
          .toStrictEqual({ lat: 41, lon: -102, zoom: 5 });
      });
    });

    test('layer query', async ({ pageObjects }) => {
      const { maps } = pageObjects;
      await maps.openMapWithId(DOCUMENT_EXAMPLE_ID);

      await test.step('should apply layer query to search request', async () => {
        // Layer data is filtered by map extent, so center the view on the matching documents
        await maps.setView(43, -102, 5);
        await maps.setLayerQuery(LAYER_NAME, LAYER_QUERY);
        await expect.poll(() => maps.getHits()).toBe('2');
      });

      await test.step('should apply layer query to fit to bounds', async () => {
        // Set view to other side of world so no matching results
        await maps.setView(-15, -100, 6);
        await maps.clickFitToBounds(LAYER_NAME);
        await expect
          .poll(async () => {
            const { lat, lon } = await maps.getView();
            return { lat: Math.round(lat), lon: Math.round(lon) };
          })
          .toStrictEqual({ lat: 43, lon: -102 });
        // Screen-size and dpi affect zoom level, so allow a range
        await expect.poll(async () => (await maps.getView()).zoom).toBeGreaterThan(3.5);
        await expect.poll(async () => (await maps.getView()).zoom).toBeLessThan(5.5);
      });
    });

    test('filter by extent - should handle geo_point filtering with extents that cross antimeridian', async ({
      pageObjects,
    }) => {
      await pageObjects.maps.openMapWithId(ANTIMERIDIAN_POINTS_ID);
      await expect.poll(() => pageObjects.maps.getHits()).toBe('2');
    });

    test('filter by extent - should handle geo_shape filtering with extents that cross antimeridian', async ({
      pageObjects,
    }) => {
      await pageObjects.maps.openMapWithId(ANTIMERIDIAN_SHAPES_ID);
      await expect.poll(() => pageObjects.maps.getHits()).toBe('2');
    });
  }
);

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Feature } from 'geojson';
import { test } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

const KBN_ARCHIVE = 'x-pack/platform/test/functional/fixtures/kbn_archives/maps.json';
const ES_ARCHIVE_LOGSTASH = 'x-pack/platform/test/fixtures/es_archives/logstash_functional';
const ES_ARCHIVE_MAPS_DATA = 'x-pack/platform/test/fixtures/es_archives/maps/data';
const DEFAULT_INDEX_ID = 'c698b940-e149-11e8-a35a-370a8516603a';

// Saved map IDs from the kbn_archives/maps.json fixture
const GEO_POINT_MAP_ID = '88845ec0-03ae-11e9-83d4-5b39b6575325'; // 'geo grid vector grid example'
const GEO_SHAPE_MAP_ID = '0c86d024-a767-11ea-bb37-0242ac130002'; // 'geo grid vector grid example with shape'

const LAYER_ID = 'g1xkv';
const GEO_POINT_REQUEST_NAME = 'load layer features (logstash-*)';
const GEO_SHAPE_REQUEST_NAME = 'load layer features (geo_shapes*)';

const DOC_COUNT_PROP_NAME = 'doc_count';
const MAX_OF_BYTES_PROP_NAME = 'max_of_bytes';

const DATA_CENTER_LON = -98;
const DATA_CENTER_LAT = 38;

const EXPECTED_NUM_FEATURES_ZOOMED_OUT = 8;
const EXPECTED_NUM_PARTIAL_FEATURES = 4;

test.describe(
  'Maps - geojson vector layer - es geo grid source',
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
      // Feature counts depend on how much of the map is visible, so match the FTR window size.
      await page.setViewportSize({ width: 1600, height: 1000 });
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

    test('geo_point - aggregation request and data', async ({ pageObjects }) => {
      const { maps } = pageObjects;
      await maps.openMapWithId(GEO_POINT_MAP_ID);

      await test.step('should decorate feature properties with metrics properties', async () => {
        const mapboxStyle = await maps.getMapboxStyle();
        const features: Array<Feature<null, Record<string, unknown>>> =
          mapboxStyle.sources[LAYER_ID].data.features;
        expect(features).toHaveLength(12);

        features.forEach(({ properties }) => {
          expect(Object.hasOwn(properties, MAX_OF_BYTES_PROP_NAME)).toBe(true);
          expect(Object.hasOwn(properties, DOC_COUNT_PROP_NAME)).toBe(true);
        });
      });

      await test.step('should contain geotile_grid aggregation elasticsearch request', async () => {
        await maps.setView(0, 0, 0);
        const { rawResponse: response } = await maps.getResponse(GEO_POINT_REQUEST_NAME);
        expect(response.aggregations.gridSplit.buckets).toHaveLength(4);
      });

      await test.step('should apply query to geotile_grid aggregation request', async () => {
        // view is still 0,0,0 from the previous step
        await maps.setAndSubmitQuery('machine.os.raw : "win 8"');
        const { rawResponse: response } = await maps.getResponse(GEO_POINT_REQUEST_NAME);
        expect(response.aggregations.gridSplit.buckets).toHaveLength(1);
      });

      // Must be the last step: removes the layer
      await test.step('should not contain any elasticsearch request after layer is deleted', async () => {
        await maps.removeLayer('logstash-*');
        expect(await maps.doesInspectorHaveRequests()).toBe(true);
      });
    });

    test('geo_point - request lifecycle', async ({ pageObjects }) => {
      const { maps } = pageObjects;
      await maps.openMapWithId(GEO_POINT_MAP_ID);

      await maps.setView(DATA_CENTER_LAT, DATA_CENTER_LON, 1);

      await test.step('should re-fetch geotile_grid aggregation with refresh timer', async () => {
        const beforeRefreshTimerTimestamp = await maps.getRequestTimestamp(GEO_POINT_REQUEST_NAME);
        expect(beforeRefreshTimerTimestamp).toHaveLength(24);
        await maps.triggerSingleRefresh(1000);
        await expect
          .poll(() => maps.getRequestTimestamp(GEO_POINT_REQUEST_NAME), { timeout: 30_000 })
          .not.toBe(beforeRefreshTimerTimestamp);
      });

      await test.step('should not rerequest when pan changes do not move map view area outside of buffer', async () => {
        const beforeTimestamp = await maps.getRequestTimestamp(GEO_POINT_REQUEST_NAME);
        await maps.setView(DATA_CENTER_LAT + 1, DATA_CENTER_LON + 1, 1);
        const afterTimestamp = await maps.getRequestTimestamp(GEO_POINT_REQUEST_NAME);
        expect(afterTimestamp).toBe(beforeTimestamp);
      });

      await test.step('should not rerequest when zoom changes do not cause geotile_grid precision to change', async () => {
        await maps.setView(DATA_CENTER_LAT, DATA_CENTER_LON, 1.4);
        const beforeSameZoom = await maps.getRequestTimestamp(GEO_POINT_REQUEST_NAME);
        await maps.setView(DATA_CENTER_LAT, DATA_CENTER_LON, 1.6);
        const afterTimestamp = await maps.getRequestTimestamp(GEO_POINT_REQUEST_NAME);
        expect(afterTimestamp).toBe(beforeSameZoom);
      });

      await test.step('should rerequest when zoom changes causes the geotile_grid precision to change', async () => {
        const beforeTimestamp = await maps.getRequestTimestamp(GEO_POINT_REQUEST_NAME);
        await maps.setView(DATA_CENTER_LAT, DATA_CENTER_LON, 4);
        const afterTimestamp = await maps.getRequestTimestamp(GEO_POINT_REQUEST_NAME);
        expect(afterTimestamp).not.toBe(beforeTimestamp);
      });
    });

    test('geo_point - grid features follow the map extent', async ({ pageObjects }) => {
      const { maps } = pageObjects;
      await maps.openMapWithId(GEO_POINT_MAP_ID);

      await test.step('should not return any data when the extent does not cover the data bounds', async () => {
        await maps.setView(64, 179, 5);
        const mapboxStyle = await maps.getMapboxStyle();
        expect(mapboxStyle.sources[LAYER_ID].data.features).toHaveLength(0);
      });

      await test.step('should request the data when the map covers the databounds', async () => {
        await maps.setView(DATA_CENTER_LAT, DATA_CENTER_LON, 1);
        const mapboxStyle = await maps.getMapboxStyle();
        expect(mapboxStyle.sources[LAYER_ID].data.features).toHaveLength(
          EXPECTED_NUM_FEATURES_ZOOMED_OUT
        );
      });

      await test.step('should request only partial data when the map only covers part of the databounds', async () => {
        // this verifies the extent-filtering behavior (not really the correct application of geotile_grid-precision)
        await maps.setView(DATA_CENTER_LAT, DATA_CENTER_LON, 6);
        const mapboxStyle = await maps.getMapboxStyle();
        expect(mapboxStyle.sources[LAYER_ID].data.features).toHaveLength(
          EXPECTED_NUM_PARTIAL_FEATURES
        );
      });
    });

    test('geo_shape - grid cells and inspector', async ({ pageObjects }) => {
      const { maps } = pageObjects;
      await maps.openMapWithId(GEO_SHAPE_MAP_ID);

      await test.step('should get expected number of grid cells', async () => {
        const mapboxStyle = await maps.getMapboxStyle();
        expect(mapboxStyle.sources[LAYER_ID].data.features).toHaveLength(26);
      });

      await test.step('should contain geotile_grid aggregation elasticsearch request', async () => {
        const { rawResponse: response } = await maps.getResponse(GEO_SHAPE_REQUEST_NAME);
        expect(response.aggregations.gridSplit.buckets).toHaveLength(13);
      });
    });
  }
);

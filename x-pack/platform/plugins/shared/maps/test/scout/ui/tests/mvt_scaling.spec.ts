/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

const KBN_ARCHIVE = 'x-pack/platform/test/functional/fixtures/kbn_archives/maps.json';
const ES_ARCHIVE_LOGSTASH = 'x-pack/platform/test/fixtures/es_archives/logstash_functional';
const ES_ARCHIVE_MAPS_DATA = 'x-pack/platform/test/fixtures/es_archives/maps/data';

const GEO_SHAPE_MVT_MAP_ID = 'bff99716-e3dc-11ea-87d0-0242ac130003';
const GEO_SHAPE_MVT_SOURCE_ID = 'caffa63a-ebfb-466d-8ff6-d797975b88ab';
const MVT_DOCUMENTS_MAP_ID = '2aff3160-3d78-11ec-9b35-f52e723e8a71';
const MVT_DOCUMENTS_SOURCE_ID = 'a7ab2e06-145b-48c5-bd86-b633849017ad';
const CONTROL_LAYER_SOURCE_ID = '3c1f6a52-7b0e-4d0b-9c55-5d2a1e9f8b11';

const QUERY = 'machine.os.raw : "win 8"';
const TIME_FROM = 'Sep 20, 2015 @ 00:00:00.000';
const TIME_TO = 'Sep 20, 2015 @ 03:00:00.000';

// Layer settings that control whether a layer responds to global query, time and refresh.
// All are enabled by default; a scenario sets a setting to false to turn it off in the layer panel.
interface LayerSettings {
  applyGlobalQuery: boolean;
  applyGlobalTime: boolean;
  applyForceRefresh: boolean;
}

const SETTING_CHECKBOX_TEST_SUBJ: Record<keyof LayerSettings, string> = {
  applyGlobalQuery: 'mapLayerPanelApplyGlobalQueryCheckbox',
  applyGlobalTime: 'mapLayerPanelApplyGlobalTimeCheckbox',
  applyForceRefresh: 'mapLayerPanelRespondToForceRefreshCheckbox',
};

const FILTERING_SCENARIOS: LayerSettings[] = [
  { applyGlobalQuery: true, applyGlobalTime: true, applyForceRefresh: true },
  { applyGlobalQuery: false, applyGlobalTime: true, applyForceRefresh: true },
  { applyGlobalQuery: true, applyGlobalTime: false, applyForceRefresh: true },
  { applyGlobalQuery: true, applyGlobalTime: true, applyForceRefresh: false },
];

test.describe('Maps - MVT scaling', { tag: '@local-stateful-classic' }, () => {
  test.beforeAll(async ({ esArchiver, kbnClient }) => {
    await esArchiver.loadIfNeeded(ES_ARCHIVE_LOGSTASH);
    await esArchiver.loadIfNeeded(ES_ARCHIVE_MAPS_DATA);
    await kbnClient.importExport.load(KBN_ARCHIVE);
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
  });

  test.afterAll(async ({ kbnClient }) => {
    await kbnClient.savedObjects.cleanStandardList();
  });

  test('layer style', async ({ pageObjects }) => {
    await pageObjects.maps.openMapWithId(GEO_SHAPE_MVT_MAP_ID);
    const mapboxStyle = await pageObjects.maps.getMapboxStyle();

    await test.step('should request tiles from /internal/maps/mvt/getTile', () => {
      const tileUrl = new URL(
        mapboxStyle.sources[GEO_SHAPE_MVT_SOURCE_ID].tiles[0],
        'http://absolute_path'
      );
      const searchParams = Object.fromEntries(tileUrl.searchParams);

      expect(tileUrl.pathname).toBe('/internal/maps/mvt/getTile/%7Bz%7D/%7Bx%7D/%7By%7D.pbf');

      // token is an unique id that changes between runs
      expect(typeof searchParams.token).toBe('string');
      delete searchParams.token;

      expect(searchParams).toStrictEqual({
        buffer: '4',
        executionContextId: 'bff99716-e3dc-11ea-87d0-0242ac130003',
        geometryFieldName: 'geometry',
        hasLabels: 'false',
        index: 'geo_shapes*',
        requestBody:
          '(fields:!(prop1),query:(bool:(filter:!((exists:(field:geometry))),must:!(),must_not:!(),should:!())),runtime_mappings:(),size:10001)',
      });
    });

    await test.step('should have fill layer', () => {
      // Should correctly load meta for style-rule (sigma is set to 1, opacity to 1)
      const fillLayer = mapboxStyle.layers.find(
        (layer: { id: string }) => layer.id === `${GEO_SHAPE_MVT_SOURCE_ID}_fill`
      );
      expect(fillLayer.paint).toStrictEqual({
        'fill-color': [
          'interpolate',
          ['linear'],
          [
            'coalesce',
            [
              'case',
              ['==', ['get', 'prop1'], null],
              0.3819660112501051,
              [
                'max',
                ['min', ['to-number', ['get', 'prop1']], 3.618033988749895],
                1.381966011250105,
              ],
            ],
            0.3819660112501051,
          ],
          0.3819660112501051,
          'rgba(0,0,0,0)',
          1.381966011250105,
          '#e0ecff',
          1.6614745084375788,
          '#cfe1ff',
          1.9409830056250525,
          '#bed7ff',
          2.2204915028125263,
          '#adccff',
          2.5,
          '#9bc2ff',
          2.7795084971874737,
          '#89b7ff',
          3.0590169943749475,
          '#76adff',
          3.338525491562421,
          '#61a2ff',
        ],
        'fill-opacity': 1,
      });
    });

    await test.step('should have toomanyfeatures layer', () => {
      const layer = mapboxStyle.layers.find(
        (mbLayer: { id: string }) => mbLayer.id === `${GEO_SHAPE_MVT_SOURCE_ID}_toomanyfeatures`
      );

      expect(layer).toStrictEqual({
        id: 'caffa63a-ebfb-466d-8ff6-d797975b88ab_toomanyfeatures',
        type: 'line',
        source: 'caffa63a-ebfb-466d-8ff6-d797975b88ab',
        'source-layer': 'meta',
        minzoom: 0,
        maxzoom: 24,
        filter: [
          'all',
          ['==', ['get', 'hits.total.relation'], 'gte'],
          ['>=', ['get', 'hits.total.value'], 10002],
        ],
        layout: { visibility: 'visible' },
        paint: {
          'line-color': '#9bc2ff',
          'line-width': 3,
          'line-dasharray': [2, 1],
          'line-opacity': 1,
        },
      });
    });
  });

  for (const scenario of FILTERING_SCENARIOS) {
    test(`filtering - ${Object.entries(scenario)
      .map(([setting, value]) => `${setting}: ${value}`)
      .join(', ')}`, async ({ page, pageObjects }) => {
      const { maps } = pageObjects;

      // Tile URL of every MVT source, keyed by source id.
      const getTileUrls = async (waitForFocusQuiet: boolean = false) => {
        const { sources } = await maps.getMapboxStyle(waitForFocusQuiet);
        return Object.fromEntries(
          Object.entries<any>(sources)
            .filter(([, source]) => Array.isArray(source.tiles))
            .map(([id, source]) => [id, source.tiles[0] as string])
        );
      };
      const getTileUrl = async () => (await getTileUrls())[MVT_DOCUMENTS_SOURCE_ID];

      const getControlTileUrl = async (waitForFocusQuiet: boolean = false) =>
        (await getTileUrls(waitForFocusQuiet))[CONTROL_LAYER_SOURCE_ID];

      // Captures the current tile URLs, runs `action`, and returns the captured URLs.
      const runAction = async (action: () => Promise<void>) => {
        const prevTileUrl = await getTileUrl();
        // Last inspector close before the action, so wait for focus to settle.
        const prevControlTileUrl = await getControlTileUrl(true);
        await action();
        return { prevTileUrl, prevControlTileUrl };
      };

      const expectTileUrlUpdated = async (action: () => Promise<void>) => {
        const { prevTileUrl } = await runAction(action);
        await expect.poll(async () => (await getTileUrl()) !== prevTileUrl).toBe(true);
      };

      const expectTileUrlUnchanged = async (action: () => Promise<void>) => {
        const { prevTileUrl, prevControlTileUrl } = await runAction(action);
        // The control layer responds to every change. Once its URL changes the map has
        // processed the action, so an unchanged URL on the layer under test is meaningful.
        await expect
          .poll(async () => (await getControlTileUrl()) !== prevControlTileUrl)
          .toBe(true);
        expect(await getTileUrl()).toBe(prevTileUrl);
      };

      // Asserts the tile URL changes (or stays the same) after `action` runs.
      const expectTileUrl = (action: () => Promise<void>, shouldUpdate: boolean) =>
        shouldUpdate ? expectTileUrlUpdated(action) : expectTileUrlUnchanged(action);

      await maps.openMapWithId(MVT_DOCUMENTS_MAP_ID);

      const hasDisabledSetting = Object.values(scenario).includes(false);
      if (hasDisabledSetting) {
        await maps.openLayerPanel('logstash-*');
        for (const setting of Object.keys(SETTING_CHECKBOX_TEST_SUBJ)) {
          const key = setting as keyof LayerSettings;
          if (!scenario[key]) {
            await page.testSubj.click(SETTING_CHECKBOX_TEST_SUBJ[key]);
            await maps.waitForLayersToLoad();
          }
        }
        await maps.keepLayerPanelChanges();
      }

      await test.step('query changes', async () => {
        await expectTileUrl(() => maps.setAndSubmitQuery(QUERY), scenario.applyGlobalQuery);
      });

      await test.step('time changes', async () => {
        await expectTileUrl(
          () => maps.setAbsoluteRange(TIME_FROM, TIME_TO),
          scenario.applyGlobalTime
        );
      });

      await test.step('refresh clicked', async () => {
        await expectTileUrl(() => maps.refreshQuery(), scenario.applyForceRefresh);
      });
    });
  }
});

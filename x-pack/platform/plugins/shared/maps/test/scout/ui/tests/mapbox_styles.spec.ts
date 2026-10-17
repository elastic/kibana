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

const JOIN_EXAMPLE_MAP_ID = '1649cc70-f736-11e8-8ce0-9723965e01e3';

test.describe('Maps - mapbox styles', { tag: '@local-stateful-classic' }, () => {
  test.beforeAll(async ({ esArchiver, kbnClient }) => {
    await esArchiver.loadIfNeeded(ES_ARCHIVE_MAPS_DATA);
    await kbnClient.importExport.load(KBN_ARCHIVE);
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
  });

  test.afterAll(async ({ kbnClient }) => {
    await kbnClient.savedObjects.cleanStandardList();
  });

  test('layer styles', async ({ pageObjects }) => {
    await pageObjects.maps.openMapWithId(JOIN_EXAMPLE_MAP_ID);
    const mapboxStyle = await pageObjects.maps.getMapboxStyle();

    await test.step('should style circle layer as expected', () => {
      const layer = mapboxStyle.layers.find(
        (mbLayer: { id: string }) => mbLayer.id === 'n1t6f_circle'
      );
      expect(layer).toStrictEqual({
        id: 'n1t6f_circle',
        type: 'circle',
        source: 'n1t6f',
        minzoom: 0,
        maxzoom: 24,
        filter: [
          'all',
          ['!=', ['get', '__kbn_is_centroid_feature__'], true],
          ['any', ['==', ['geometry-type'], 'Point'], ['==', ['geometry-type'], 'MultiPoint']],
          ['==', ['get', '__kbn_isvisibleduetojoin__'], true],
        ],
        layout: { visibility: 'visible' },
        paint: {
          'circle-color': [
            'interpolate',
            ['linear'],
            [
              'coalesce',
              [
                'case',
                [
                  '==',
                  [
                    'feature-state',
                    '__kbnjoin__max_of_prop1__855ccb86-fe42-11e8-8eb2-f2801f1b9fd1',
                  ],
                  null,
                ],
                2,
                [
                  'max',
                  [
                    'min',
                    [
                      'to-number',
                      [
                        'feature-state',
                        '__kbnjoin__max_of_prop1__855ccb86-fe42-11e8-8eb2-f2801f1b9fd1',
                      ],
                    ],
                    12,
                  ],
                  3,
                ],
              ],
              2,
            ],
            2,
            'rgba(0,0,0,0)',
            3,
            '#e0ecff',
            4.125,
            '#cfe1ff',
            5.25,
            '#bed7ff',
            6.375,
            '#adccff',
            7.5,
            '#9bc2ff',
            8.625,
            '#89b7ff',
            9.75,
            '#76adff',
            10.875,
            '#61a2ff',
          ],
          'circle-opacity': 0.75,
          'circle-stroke-color': '#009490',
          'circle-stroke-opacity': 0.75,
          'circle-stroke-width': 1,
          'circle-radius': 10,
        },
      });
    });

    await test.step('should style fill layer as expected', () => {
      const layer = mapboxStyle.layers.find(
        (mbLayer: { id: string }) => mbLayer.id === 'n1t6f_fill'
      );
      expect(layer).toStrictEqual({
        id: 'n1t6f_fill',
        type: 'fill',
        source: 'n1t6f',
        minzoom: 0,
        maxzoom: 24,
        filter: [
          'all',
          ['any', ['==', ['geometry-type'], 'Polygon'], ['==', ['geometry-type'], 'MultiPolygon']],
          ['==', ['get', '__kbn_isvisibleduetojoin__'], true],
        ],
        layout: { visibility: 'visible' },
        paint: {
          'fill-color': [
            'interpolate',
            ['linear'],
            [
              'coalesce',
              [
                'case',
                [
                  '==',
                  [
                    'feature-state',
                    '__kbnjoin__max_of_prop1__855ccb86-fe42-11e8-8eb2-f2801f1b9fd1',
                  ],
                  null,
                ],
                2,
                [
                  'max',
                  [
                    'min',
                    [
                      'to-number',
                      [
                        'feature-state',
                        '__kbnjoin__max_of_prop1__855ccb86-fe42-11e8-8eb2-f2801f1b9fd1',
                      ],
                    ],
                    12,
                  ],
                  3,
                ],
              ],
              2,
            ],
            2,
            'rgba(0,0,0,0)',
            3,
            '#e0ecff',
            4.125,
            '#cfe1ff',
            5.25,
            '#bed7ff',
            6.375,
            '#adccff',
            7.5,
            '#9bc2ff',
            8.625,
            '#89b7ff',
            9.75,
            '#76adff',
            10.875,
            '#61a2ff',
          ],
          'fill-opacity': 0.75,
        },
      });
    });

    await test.step('should style line layer as expected', () => {
      const layer = mapboxStyle.layers.find(
        (mbLayer: { id: string }) => mbLayer.id === 'n1t6f_line'
      );
      expect(layer).toStrictEqual({
        id: 'n1t6f_line',
        type: 'line',
        source: 'n1t6f',
        minzoom: 0,
        maxzoom: 24,
        filter: [
          'all',
          [
            'any',
            ['==', ['geometry-type'], 'Polygon'],
            ['==', ['geometry-type'], 'MultiPolygon'],
            ['==', ['geometry-type'], 'LineString'],
            ['==', ['geometry-type'], 'MultiLineString'],
          ],
          ['==', ['get', '__kbn_isvisibleduetojoin__'], true],
        ],
        layout: { visibility: 'visible' },
        paint: { 'line-color': '#009490', 'line-opacity': 0.75, 'line-width': 1 },
      });
    });
  });
});

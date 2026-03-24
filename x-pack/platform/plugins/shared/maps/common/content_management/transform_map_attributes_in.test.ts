/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SOURCE_TYPES } from '../constants';
import { transformMapAttributesIn } from './transform_map_attributes_in';

describe('transformMapIn', () => {
  test('should only return provided values', () => {
    expect(transformMapAttributesIn({ title: 'my map' })).toMatchInlineSnapshot(`
      Object {
        "attributes": Object {
          "title": "my map",
        },
        "references": Array [],
      }
    `);
  });

  test('layerListJSON', () => {
    expect(
      transformMapAttributesIn({
        title: 'my map',
        layers: [
          {
            sourceDescriptor: {
              type: SOURCE_TYPES.ES_GEO_GRID,
              indexPatternId: 'c698b940-e149-11e8-a35a-370a8516603a',
            },
          } as any,
        ],
      })
    ).toMatchInlineSnapshot(`
      Object {
        "attributes": Object {
          "layerListJSON": "[{\\"sourceDescriptor\\":{\\"type\\":\\"ES_GEO_GRID\\",\\"indexPatternRefName\\":\\"layer_0_source_index_pattern\\"}}]",
          "title": "my map",
        },
        "references": Array [
          Object {
            "id": "c698b940-e149-11e8-a35a-370a8516603a",
            "name": "layer_0_source_index_pattern",
            "type": "index-pattern",
          },
        ],
      }
    `);
  });

  test('mapStateJSON', () => {
    expect(
      transformMapAttributesIn({
        title: 'my map',
        adHocDataViews: [],
        center: {
          lat: 60,
          lon: 120,
        },
        filters: [],
        query: {
          query: 'find me',
          language: 'kql',
        },
        refreshInterval: {
          pause: false,
          value: 500,
        },
        settings: {},
        timeFilters: {
          from: 'now',
          to: 'now-15m',
        },
        zoom: 1,
      })
    ).toMatchInlineSnapshot(`
      Object {
        "attributes": Object {
          "mapStateJSON": "{\\"adHocDataViews\\":[],\\"center\\":{\\"lat\\":60,\\"lon\\":120},\\"filters\\":[],\\"query\\":{\\"query\\":\\"find me\\",\\"language\\":\\"kql\\"},\\"refreshConfig\\":{\\"isPaused\\":false,\\"interval\\":500},\\"settings\\":{},\\"timeFilters\\":{\\"from\\":\\"now\\",\\"to\\":\\"now-15m\\"},\\"zoom\\":1}",
          "title": "my map",
        },
        "references": Array [],
      }
    `);
  });

  test('uiStateJSON', () => {
    expect(
      transformMapAttributesIn({
        title: 'my map',
        isLayerTOCOpen: false,
        openTOCDetails: ['layer1'],
      })
    ).toMatchInlineSnapshot(`
      Object {
        "attributes": Object {
          "title": "my map",
          "uiStateJSON": "{\\"isLayerTOCOpen\\":false,\\"openTOCDetails\\":[\\"layer1\\"]}",
        },
        "references": Array [],
      }
    `);
  });
});

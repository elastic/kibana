/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformMapAttributesOut } from './transform_map_attributes_out';

describe('transformMapOut', () => {
  const findReference = () => undefined;
  test('should only return provided values', () => {
    expect(transformMapAttributesOut({ title: 'my map' }, findReference)).toMatchInlineSnapshot(`
      Object {
        "title": "my map",
      }
    `);
  });

  test('descrption', () => {
    expect(
      transformMapAttributesOut(
        { title: 'my map', description: 'this is a great map' },
        findReference
      )
    ).toMatchInlineSnapshot(`
      Object {
        "description": "this is a great map",
        "title": "my map",
      }
    `);
  });

  test('layerListJSON', () => {
    expect(
      transformMapAttributesOut(
        {
          title: 'my map',
          layerListJSON:
            '[{"sourceDescriptor":{"type":"ES_GEO_GRID","indexPatternRefName":"layer_0_source_index_pattern"}}]',
        },
        () => ({
          id: 'c698b940-e149-11e8-a35a-370a8516603a',
          name: 'layer_0_source_index_pattern',
          type: 'index-pattern',
        })
      )
    ).toMatchInlineSnapshot(`
      Object {
        "layers": Array [
          Object {
            "sourceDescriptor": Object {
              "indexPatternId": "c698b940-e149-11e8-a35a-370a8516603a",
              "type": "ES_GEO_GRID",
            },
          },
        ],
        "title": "my map",
      }
    `);
  });

  test('mapStateJSON', () => {
    expect(
      transformMapAttributesOut(
        {
          title: 'my map',
          mapStateJSON:
            '{"center":{"lat":60,"lon":120},"refreshConfig":{"isPaused":false,"interval":500}}',
        },
        findReference
      )
    ).toMatchInlineSnapshot(`
      Object {
        "center": Object {
          "lat": 60,
          "lon": 120,
        },
        "refreshInterval": Object {
          "pause": false,
          "value": 500,
        },
        "title": "my map",
      }
    `);
  });

  test('uiStateJSON', () => {
    expect(
      transformMapAttributesOut(
        {
          title: 'my map',
          uiStateJSON: '{"isLayerTOCOpen":false,"openTOCDetails":["layer1"]}',
        },
        findReference
      )
    ).toMatchInlineSnapshot(`
      Object {
        "isLayerTOCOpen": false,
        "openTOCDetails": Array [
          "layer1",
        ],
        "title": "my map",
      }
    `);
  });

  test('Should ignore legacy keys in mapStateJOSN and uiStateJSON', () => {
    expect(
      transformMapAttributesOut(
        {
          title: 'my map',
          mapStateJSON: '{"idDarkMode":false}',
          uiStateJSON: '{"idDarkMode":false}',
        },
        findReference
      )
    ).toMatchInlineSnapshot(`
      Object {
        "title": "my map",
      }
    `);
  });
});

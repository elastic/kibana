/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformMapAttributesOut } from './transform_map_attributes_out';

describe('transformMapOut', () => {
  test('should only return provided values', () => {
    expect(transformMapAttributesOut({ title: 'my map' }, [])).toMatchInlineSnapshot(`
      Object {
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
        []
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
});

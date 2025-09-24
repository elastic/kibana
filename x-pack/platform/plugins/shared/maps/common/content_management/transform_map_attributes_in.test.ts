/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

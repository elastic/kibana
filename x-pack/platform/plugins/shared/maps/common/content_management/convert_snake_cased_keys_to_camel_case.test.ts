/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { convertSnakeCasedKeysToCamelCase } from './convert_snake_cased_keys_to_camel_case';

const storedLayer = {
  id: 'a',
  style: {
    type: 'VECTOR',
    properties: {
      fillColor: {
        type: 'DYNAMIC',
        options: {
          fieldMetaOptions: { isEnabled: true },
          customColorPalette: [{ stop: null, color: '#fff' }],
        },
      },
      labelBorderSize: { options: { size: 'SMALL' } },
      labelZoomRange: { options: { useLayerZoomRange: false, minZoom: 1, maxZoom: 5 } },
    },
    isTimeAware: true,
  },
};
const layer = {
  id: 'a',
  style: {
    type: 'VECTOR',
    properties: {
      fill_color: {
        type: 'DYNAMIC',
        options: {
          field_meta_options: { is_enabled: true },
          custom_color_palette: [{ stop: null, color: '#fff' }],
        },
      },
      label_border_size: { options: { size: 'SMALL' } },
      label_zoom_range: { options: { use_layer_zoom_range: false, min_zoom: 1, max_zoom: 5 } },
    },
    is_time_aware: true,
  },
};

describe('convertSnakeCasedKeysToCamelCase', () => {
  test('converts snake_case keys to camelCase', () => {
    expect(convertSnakeCasedKeysToCamelCase([layer])).toEqual([storedLayer]);
  });

  test('values are unchanged', () => {
    expect(convertSnakeCasedKeysToCamelCase({ a_b: 'some_value', c: [1, null] })).toEqual({
      aB: 'some_value',
      c: [1, null],
    });
  });

  test('skipKeys values are not converted', () => {
    const query = { language: 'lucene', query: { match_all: {} } };
    expect(
      convertSnakeCasedKeysToCamelCase({ fill_color: 'a', query, join: { where_query: query } }, [
        'query',
        'whereQuery',
      ])
    ).toEqual({ fillColor: 'a', query, join: { whereQuery: query } });
  });
});

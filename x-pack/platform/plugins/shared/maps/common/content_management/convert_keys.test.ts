/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { convertToCamelCase, convertToSnakeCase } from './convert_keys';

const camelCased = {
  title: 'my map',
  isLayerTOCOpen: false,
  openTOCDetails: ['layer1'],
  adHocDataViews: [{ id: 'a', timeFieldName: '@timestamp', title: 'logs-*' }],
  settings: { customIcons: [{ symbolId: 'foo' }], spatialFiltersAlpa: 0.5 },
  layers: [
    {
      id: 'layer1',
      minZoom: 1,
      sourceDescriptor: { type: 'ES_SEARCH', indexPatternId: 'abc', topHitsSize: 2 },
      joins: [{ leftField: 'a', right: { whereQuery: { query: 'foo', language: 'kuery' } } }],
      style: { type: 'VECTOR', isTimeAware: true, properties: { fillColor: {} } },
    },
  ],
};

const snakeCased = {
  title: 'my map',
  is_layer_toc_open: false,
  open_toc_details: ['layer1'],
  ad_hoc_data_views: [{ id: 'a', time_field_name: '@timestamp', title: 'logs-*' }],
  settings: { custom_icons: [{ symbol_id: 'foo' }], spatial_filters_alpa: 0.5 },
  layers: [
    {
      id: 'layer1',
      min_zoom: 1,
      source_descriptor: { type: 'ES_SEARCH', index_pattern_id: 'abc', top_hits_size: 2 },
      joins: [{ left_field: 'a', right: { where_query: { query: 'foo', language: 'kuery' } } }],
      style: { type: 'VECTOR', is_time_aware: true, properties: { fillColor: {} } },
    },
  ],
};

describe('convertToSnakeCase', () => {
  test('should convert known keys', () => {
    expect(convertToSnakeCase(camelCased)).toEqual(snakeCased);
  });

  test('should not convert unknown keys or opaque values', () => {
    const state = {
      unknownKey: { geoField: 'a' },
      filters: [{ meta: { indexRefName: 'foo' }, geoField: 'a' }],
      query: { geoField: 'a' },
      layers: [{ style: { __styleMeta: { fieldMeta: { geoField: { range: {} } } } } }],
    };
    expect(convertToSnakeCase(state)).toEqual({
      unknownKey: { geo_field: 'a' },
      filters: state.filters,
      query: state.query,
      layers: state.layers,
    });
  });
});

describe('convertToCamelCase', () => {
  test('should convert known keys', () => {
    expect(convertToCamelCase(snakeCased)).toEqual(camelCased);
  });

  test('should round trip', () => {
    expect(convertToCamelCase(convertToSnakeCase(camelCased))).toEqual(camelCased);
  });

  test('should leave camelCased keys untouched', () => {
    expect(convertToCamelCase(camelCased)).toEqual(camelCased);
  });
});

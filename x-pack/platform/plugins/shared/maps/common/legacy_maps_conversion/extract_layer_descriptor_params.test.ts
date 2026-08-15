/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  extractRegionMapLayerDescriptorParams,
  extractTileMapLayerDescriptorParams,
} from './extract_layer_descriptor_params';

describe('extractTileMapLayerDescriptorParams', () => {
  test('extracts geohash and metric fields from serialized aggs', () => {
    expect(
      extractTileMapLayerDescriptorParams({
        label: 'My tile map',
        mapType: 'Scaled Circle Markers',
        colorSchema: 'Blues',
        indexPatternId: 'data-view-1',
        aggs: [
          { schema: 'metric', type: 'sum', params: { field: 'bytes' } },
          { schema: 'segment', type: 'geohash_grid', params: { field: 'geo.coordinates' } },
        ],
      })
    ).toEqual({
      label: 'My tile map',
      mapType: 'Scaled Circle Markers',
      colorSchema: 'Blues',
      indexPatternId: 'data-view-1',
      geoFieldName: 'geo.coordinates',
      metricAgg: 'sum',
      metricFieldName: 'bytes',
    });
  });

  test('uses fallback geo field when geohash is not configured', () => {
    expect(
      extractTileMapLayerDescriptorParams({
        label: 'My tile map',
        mapType: 'Heatmap',
        indexPatternId: 'data-view-1',
        fallbackGeoFieldName: 'location',
        aggs: [{ schema: 'metric', type: 'count', params: {} }],
      })
    ).toMatchObject({
      geoFieldName: 'location',
      metricAgg: 'count',
      colorSchema: 'Yellow to Red',
    });
  });
});

describe('extractRegionMapLayerDescriptorParams', () => {
  test('extracts EMS join and terms agg params', () => {
    expect(
      extractRegionMapLayerDescriptorParams({
        label: 'My region map',
        colorSchema: 'Green to Red',
        indexPatternId: 'data-view-1',
        selectedLayer: { isEMS: true, id: 'world_countries' },
        selectedJoinField: { name: 'iso2' },
        aggs: [
          { schema: 'metric', type: 'count', params: {} },
          { schema: 'segment', type: 'terms', params: { field: 'geo.src', size: 10 } },
        ],
      })
    ).toEqual({
      label: 'My region map',
      colorSchema: 'Green to Red',
      indexPatternId: 'data-view-1',
      emsLayerId: 'world_countries',
      leftFieldName: 'iso2',
      termsFieldName: 'geo.src',
      termsSize: 10,
      metricAgg: 'count',
      metricFieldName: undefined,
    });
  });
});

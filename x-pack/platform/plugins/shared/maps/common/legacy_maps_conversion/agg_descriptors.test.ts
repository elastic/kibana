/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMapAggDescriptor } from './agg_descriptors';

describe('createMapAggDescriptor', () => {
  test('Should allow supported metric aggs', () => {
    expect(createMapAggDescriptor('sum', 'bytes', 'Scaled Circle Markers')).toEqual({
      type: 'sum',
      field: 'bytes',
    });
  });

  test('Should fallback to count when field not provided', () => {
    expect(createMapAggDescriptor('sum', undefined, 'Scaled Circle Markers')).toEqual({
      type: 'count',
    });
  });

  test('Should fallback to count when metric agg is not supported in maps', () => {
    expect(createMapAggDescriptor('top_hits', 'bytes', 'Scaled Circle Markers')).toEqual({
      type: 'count',
    });
  });

  describe('heatmap', () => {
    test('Should allow countable metric aggs', () => {
      expect(createMapAggDescriptor('sum', 'bytes', 'Heatmap')).toEqual({
        type: 'sum',
        field: 'bytes',
      });
    });

    test('Should fallback to count for non-countable metric aggs', () => {
      expect(createMapAggDescriptor('avg', 'bytes', 'Heatmap')).toEqual({
        type: 'count',
      });
    });
  });

  test('Should allow non-heatmap region-style metrics without mapType', () => {
    expect(createMapAggDescriptor('avg', 'bytes')).toEqual({
      type: 'avg',
      field: 'bytes',
    });
  });
});

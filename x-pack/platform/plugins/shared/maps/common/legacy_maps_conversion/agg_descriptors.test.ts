/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTileMapAggDescriptor } from './agg_descriptors';

describe('createTileMapAggDescriptor', () => {
  test('Should allow supported metric aggs', () => {
    expect(createTileMapAggDescriptor('Scaled Circle Markers', 'sum', 'bytes')).toEqual({
      type: 'sum',
      field: 'bytes',
    });
  });

  test('Should fallback to count when field not provided', () => {
    expect(createTileMapAggDescriptor('Scaled Circle Markers', 'sum', undefined)).toEqual({
      type: 'count',
    });
  });

  test('Should fallback to count when metric agg is not supported in maps', () => {
    expect(createTileMapAggDescriptor('Scaled Circle Markers', 'top_hits', 'bytes')).toEqual({
      type: 'count',
    });
  });

  describe('heatmap', () => {
    test('Should allow countable metric aggs', () => {
      expect(createTileMapAggDescriptor('Heatmap', 'sum', 'bytes')).toEqual({
        type: 'sum',
        field: 'bytes',
      });
    });

    test('Should fallback to count for non-countable metric aggs', () => {
      expect(createTileMapAggDescriptor('Heatmap', 'avg', 'bytes')).toEqual({
        type: 'count',
      });
    });
  });
});

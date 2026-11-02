/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GRID_RESOLUTION, RENDER_AS } from '../../../../common/constants';
import {
  getGeoGridPrecision,
  getGeoHashPrecision,
  getGeoHexPrecision,
} from './get_geo_grid_precision';

describe('getGeoGridPrecision', () => {
  test.each([
    [GRID_RESOLUTION.COARSE, RENDER_AS.GRID, 7],
    [GRID_RESOLUTION.FINE, RENDER_AS.GRID, 8],
    [GRID_RESOLUTION.MOST_FINE, RENDER_AS.GRID, 9],
    [GRID_RESOLUTION.SUPER_FINE, RENDER_AS.GRID, 13],
    [GRID_RESOLUTION.COARSE, RENDER_AS.HEX, 7],
    [GRID_RESOLUTION.FINE, RENDER_AS.HEX, 10],
    [GRID_RESOLUTION.MOST_FINE, RENDER_AS.HEX, 10],
    [GRID_RESOLUTION.SUPER_FINE, RENDER_AS.HEX, 13],
  ])('resolution %s, render as %s at zoom 4.5 should be %s', (resolution, renderAs, expected) => {
    expect(getGeoGridPrecision(4.5, resolution, renderAs)).toBe(expected);
  });

  test('should not exceed the max geotile level', () => {
    expect(getGeoGridPrecision(28, GRID_RESOLUTION.SUPER_FINE, RENDER_AS.GRID)).toBe(29);
  });
});

describe('getGeoHexPrecision', () => {
  test.each([
    [GRID_RESOLUTION.COARSE, 3], // geotile level 7
    [GRID_RESOLUTION.FINE, 4], // geotile level 10
    [GRID_RESOLUTION.MOST_FINE, 4], // geotile level 10
    [GRID_RESOLUTION.SUPER_FINE, 6], // geotile level 13
  ])('resolution %s at zoom 4.5 should be H3 resolution %s', (resolution, expected) => {
    expect(getGeoHexPrecision(4.5, resolution)).toBe(expected);
  });

  test('should not exceed the max H3 resolution', () => {
    expect(getGeoHexPrecision(28, GRID_RESOLUTION.SUPER_FINE)).toBe(15);
    expect(getGeoHexPrecision(0, GRID_RESOLUTION.COARSE)).toBe(0);
  });
});

describe('getGeoHashPrecision', () => {
  test.each([
    [GRID_RESOLUTION.COARSE, 3], // geotile level 7, closest to geohash 3 (level 8)
    [GRID_RESOLUTION.FINE, 3], // geotile level 8
    [GRID_RESOLUTION.MOST_FINE, 4], // geotile level 9, equally close to 3 and 4, finer wins
    [GRID_RESOLUTION.SUPER_FINE, 5], // geotile level 13
  ])('resolution %s at zoom 4.5 should be geohash precision %s', (resolution, expected) => {
    expect(getGeoHashPrecision(4.5, resolution)).toBe(expected);
  });

  test('should stay within the geohash precision range', () => {
    expect(getGeoHashPrecision(0, GRID_RESOLUTION.COARSE)).toBe(1);
    expect(getGeoHashPrecision(28, GRID_RESOLUTION.SUPER_FINE)).toBe(12);
  });
});

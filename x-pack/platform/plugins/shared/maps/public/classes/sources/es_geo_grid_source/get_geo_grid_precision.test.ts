/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GRID_RESOLUTION, RENDER_AS } from '../../../../common/constants';
import { getGeoGridPrecision } from './get_geo_grid_precision';

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

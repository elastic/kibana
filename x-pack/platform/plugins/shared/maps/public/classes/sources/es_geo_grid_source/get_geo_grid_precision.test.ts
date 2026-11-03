/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GRID_RESOLUTION } from '@kbn/geo-precision';
import { RENDER_AS } from '../../../../common/constants';
import { getGeoGridPrecisionResolutionDelta } from './get_geo_grid_precision';

describe('getGeoGridPrecisionResolutionDelta', () => {
  test.each([
    [GRID_RESOLUTION.COARSE, RENDER_AS.GRID, 2],
    [GRID_RESOLUTION.FINE, RENDER_AS.GRID, 3],
    [GRID_RESOLUTION.COARSE, RENDER_AS.HEX, 2],
    [GRID_RESOLUTION.FINE, RENDER_AS.HEX, 5],
  ])('resolution %s, render as %s should be %s', (resolution, renderAs, expected) => {
    expect(getGeoGridPrecisionResolutionDelta(resolution, renderAs)).toBe(expected);
  });

  test('should throw for unrecognized resolution', () => {
    expect(() =>
      getGeoGridPrecisionResolutionDelta('foo' as GRID_RESOLUTION, RENDER_AS.GRID)
    ).toThrow();
  });
});

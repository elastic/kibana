/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tilesFor } from './ems';

describe('tilesFor', () => {
  it('takes 256-pixel tiles at zoom + 1, which match MapLibre’s 512-pixel tiles at zoom', () => {
    expect(tilesFor({ lat: 0, lon: 0, zoom: 1, width: 512, height: 512 })).toEqual({
      zoom: 2,
      x0: 1,
      y0: 1,
      columns: 2,
      rows: 2,
    });
  });

  it('steps out a zoom until the view fits in 4 by 4 tiles', () => {
    const grid = tilesFor({ lat: 40, lon: -100, zoom: 4.28, width: 1400, height: 1000 })!;
    expect(grid.zoom).toBeLessThan(5);
    expect(grid.columns).toBeLessThanOrEqual(4);
    expect(grid.rows).toBeLessThanOrEqual(4);
  });

  it('stays within the service’s zooms and the world', () => {
    const grid = tilesFor({ lat: 0, lon: 0, zoom: 14, width: 256, height: 256 }, { maxZoom: 10 })!;
    expect(grid.zoom).toBe(10);
    const world = tilesFor({ lat: 0, lon: 0, zoom: 0, width: 2000, height: 2000 })!;
    expect(world).toMatchObject({ zoom: 1, x0: 0, y0: 0, columns: 2, rows: 2 });
  });
});

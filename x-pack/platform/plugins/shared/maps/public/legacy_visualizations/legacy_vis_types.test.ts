/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { regionMapVisType } from './region_map/region_map_vis_type';
import { tileMapVisType } from './tile_map/tile_map_vis_type';

describe('legacy visualization types', () => {
  // disableCreate keeps the legacy types out of the Visualize "Create visualization" wizard
  test('region map should not be creatable', () => {
    expect(regionMapVisType.disableCreate).toBe(true);
  });

  test('tile map should not be creatable', () => {
    expect(tileMapVisType.disableCreate).toBe(true);
  });
});

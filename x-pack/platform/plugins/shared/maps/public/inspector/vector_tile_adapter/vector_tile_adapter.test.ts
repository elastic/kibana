/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TileMetaFeature } from '../../../common/descriptor_types';
import { getTileError, getTileMetaFeature } from './vector_tile_adapter';

describe('getTileError', () => {
  test('should find tileError for tile', () => {
    const tileErrors = [
      {
        message: 'simulated failure 1',
        tileKey: '1/0/0',
      },
      {
        message: 'simulated failure 2',
        tileKey: '1/1/0',
      },
    ];
    const tileError = getTileError(0, 0, 1, tileErrors);
    expect(tileError).not.toBeUndefined();
    expect(tileError!.message).toBe('simulated failure 1');
  });
});

describe('getTileMetaFeature', () => {
  test('should find tileMetaFeature for tile', () => {
    const tileMetaFeatures = [
      {
        geometry: {
          coordinates: [
            [
              [0, -85.05112877980659],
              [0, 0],
              [180, 0],
              [180, -85.05112877980659],
              [0, -85.05112877980659],
            ],
          ],
          type: 'Polygon',
        },
        properties: {
          'hits.total.value': 0,
        },
        type: 'Feature',
      } as TileMetaFeature,
      {
        geometry: {
          coordinates: [
            [
              [-180, 0],
              [-180, 85.05112877980659],
              [0, 85.05112877980659],
              [0, 0],
              [-180, 0],
            ],
          ],
          type: 'Polygon',
        },
        properties: {
          'hits.total.value': 182,
        },
        type: 'Feature',
      } as TileMetaFeature,
    ];
    const tileMetaFeature = getTileMetaFeature(0, 0, 1, tileMetaFeatures);
    expect(tileMetaFeature).not.toBeUndefined();
    expect(tileMetaFeature!.properties['hits.total.value']).toBe(182);
  });
});

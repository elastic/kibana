/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renameLayerTypes } from './rename_layer_types';

describe('renameLayerTypes', () => {
  test('Should handle missing layerListJSON attribute', () => {
    const attributes = {
      title: 'my map',
    };
    expect(renameLayerTypes({ attributes })).toEqual({
      title: 'my map',
    });
  });

  test('Should rename TILED_VECTOR to MVT_VECTOR', () => {
    const layerListJSON = JSON.stringify([
      {
        type: 'TILED_VECTOR',
      },
    ]);
    const attributes = {
      title: 'my map',
      layerListJSON,
    };
    expect(renameLayerTypes({ attributes })).toEqual({
      title: 'my map',
      layerListJSON: '[{"type":"MVT_VECTOR"}]',
    });
  });

  test('Should rename VECTOR_TILE to EMS_VECTOR_TILE', () => {
    const layerListJSON = JSON.stringify([
      {
        type: 'VECTOR_TILE',
      },
    ]);
    const attributes = {
      title: 'my map',
      layerListJSON,
    };
    expect(renameLayerTypes({ attributes })).toEqual({
      title: 'my map',
      layerListJSON: '[{"type":"EMS_VECTOR_TILE"}]',
    });
  });

  test('Should rename VECTOR to GEOJSON_VECTOR', () => {
    const layerListJSON = JSON.stringify([
      {
        type: 'VECTOR',
      },
    ]);
    const attributes = {
      title: 'my map',
      layerListJSON,
    };
    expect(renameLayerTypes({ attributes })).toEqual({
      title: 'my map',
      layerListJSON: '[{"type":"GEOJSON_VECTOR"}]',
    });
  });

  test('Should rename TILE to RASTER_TILE', () => {
    const layerListJSON = JSON.stringify([
      {
        type: 'TILE',
      },
    ]);
    const attributes = {
      title: 'my map',
      layerListJSON,
    };
    expect(renameLayerTypes({ attributes })).toEqual({
      title: 'my map',
      layerListJSON: '[{"type":"RASTER_TILE"}]',
    });
  });
});

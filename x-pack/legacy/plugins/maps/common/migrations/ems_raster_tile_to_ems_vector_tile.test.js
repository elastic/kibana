/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint max-len: 0 */

import { emsRasterTileToEmsVectorTile } from './ems_raster_tile_to_ems_vector_tile';

describe('emsRasterTileToEmsVectorTile', () => {
  test('Should handle missing layerListJSON attribute', () => {
    const attributes = {
      title: 'my map',
    };
    expect(emsRasterTileToEmsVectorTile({ attributes })).toEqual({
      title: 'my map',
    });
  });

  test('Should update TILE layers with EMS_TMS sources to VECTOR_TILE layers', () => {
    const layerListJSON = JSON.stringify([
      {
        type: 'TILE',
        sourceDescriptor: {
          type: 'EMS_TMS',
        },
      },
    ]);
    const attributes = {
      title: 'my map',
      layerListJSON,
    };
    expect(emsRasterTileToEmsVectorTile({ attributes })).toEqual({
      title: 'my map',
      layerListJSON: '[{"type":"VECTOR_TILE","sourceDescriptor":{"type":"EMS_TMS"}}]',
    });
  });

  test('Should not update TILE layers that are not EMS_TMS source', () => {
    const layerListJSON = JSON.stringify([
      {
        type: 'TILE',
        sourceDescriptor: {
          type: 'KIBANA_TILEMAP',
        },
      },
    ]);
    const attributes = {
      title: 'my map',
      layerListJSON,
    };
    expect(emsRasterTileToEmsVectorTile({ attributes })).toEqual({
      title: 'my map',
      layerListJSON,
    });
  });
});

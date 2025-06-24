/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('./tile_request_tab', () => ({
  TileRequestTab: () => {
    return <div>mockTileRequestTab</div>;
  },
}));

import React from 'react';
import { render, screen } from '@testing-library/react';
import { RESPONSE_VIEW_ID, VectorTileInspector } from './vector_tile_inspector';
import { VectorTileAdapter } from '../vector_tile_adapter';
import { I18nProvider } from '@kbn/i18n-react';

describe('VectorTileInspector', () => {
  let vectorTileAdapter: VectorTileAdapter | undefined;
  beforeEach(() => {
    vectorTileAdapter = new VectorTileAdapter();
    vectorTileAdapter.addLayer(
      'layer1',
      'layer1 label',
      '/pof/internal/maps/mvt/getGridTile/{z}/{x}/{y}.pbf?geometryFieldName=geo.coordinates&hasLabels=false&buffer=7&index=kibana_sample_data_logs&gridPrecision=8&requestBody=()&renderAs=heatmap&token=1'
    );
    vectorTileAdapter.addLayer(
      'layer2',
      'layer2 label',
      '/pof/internal/maps/mvt/getGridTile/{z}/{x}/{y}.pbf?geometryFieldName=geo.coordinates&hasLabels=false&buffer=7&index=kibana_sample_data_logs&gridPrecision=8&requestBody=()&renderAs=heatmap&token=1'
    );
    vectorTileAdapter.setTiles([
      {
        x: 0,
        y: 0,
        z: 1,
      },
      {
        x: 1,
        y: 0,
        z: 1,
      },
      {
        x: 0,
        y: 1,
        z: 1,
      },
      {
        x: 1,
        y: 1,
        z: 1,
      },
    ]);
  });

  test('should show first layer, first tile, and request tab when options not provided', () => {
    render(
      <I18nProvider>
        <VectorTileInspector adapters={{ vectorTiles: vectorTileAdapter }} title="Vector tiles" />
      </I18nProvider>
    );
    screen.getByText('layer1 label');
    screen.getByText('1/0/0');
    screen.getByText('mockTileRequestTab');
  });

  test('should show layer, tile, and tab specified by options', () => {
    const options = {
      initialLayerId: 'layer2',
      initialTileKey: '1/1/1',
      initialTab: RESPONSE_VIEW_ID,
    };
    render(
      <I18nProvider>
        <VectorTileInspector
          adapters={{ vectorTiles: vectorTileAdapter! }}
          options={options}
          title="Vector tiles"
        />
      </I18nProvider>
    );
    screen.getByText('layer2 label');
    screen.getByText('1/1/1');
    screen.getByText('Not available'); // response is not available because tileMetaFeature or tileError where not provided
  });
});

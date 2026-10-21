/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMapModel, MAP_PLOT_WIDTH } from './model';
import { geotileBounds, latToY, lonToX } from './projection';
import type { MapNode } from './types';

const NYC = { id: 'nyc', lat: 40.71, lon: -74.01, label: 'New York' };

describe('createMapModel basemap tiles', () => {
  it('projects tiles into the same mercator fit as markers', () => {
    const zoom = 2;
    const n = 2 ** zoom;
    const originX = Math.floor(lonToX(NYC.lon) * n);
    const originY = Math.floor(latToY(NYC.lat) * n);
    const node: MapNode = {
      type: 'map',
      view: 'fit',
      markers: [NYC],
      basemap: {
        zoom,
        originX,
        originY,
        columns: 1,
        rows: 1,
        tiles: [{ col: 0, row: 0, src: 'data:image/png;base64,tile' }],
      },
    };

    const model = createMapModel(node);
    expect(model.tiles).toHaveLength(1);

    const [tile] = model.tiles;
    const [marker] = model.markers;
    expect(marker.x).toBeGreaterThanOrEqual(tile.left);
    expect(marker.x).toBeLessThanOrEqual(tile.left + tile.width);
    expect(marker.y).toBeGreaterThanOrEqual(tile.top);
    expect(marker.y).toBeLessThanOrEqual(tile.top + tile.height);

    const tileBounds = geotileBounds({ z: zoom, x: originX, y: originY });
    expect(tile.left).toBeLessThan(0);
    expect(tile.left + tile.width).toBeGreaterThan(MAP_PLOT_WIDTH);
    expect(tileBounds.west).toBeLessThan(model.bounds.west);
    expect(tileBounds.east).toBeGreaterThan(model.bounds.east);
  });

  it('does not stretch tiles as a regular grid that fills the plot', () => {
    const node: MapNode = {
      type: 'map',
      view: 'fit',
      markers: [NYC],
      basemap: {
        zoom: 2,
        originX: 0,
        originY: 1,
        columns: 2,
        rows: 1,
        tiles: [
          { col: 0, row: 0, src: 'data:image/png;base64,a' },
          { col: 1, row: 0, src: 'data:image/png;base64,b' },
        ],
      },
    };

    const model = createMapModel(node);
    expect(model.tiles[0].left).not.toBe(0);
    expect(model.tiles[0].width).not.toBe(MAP_PLOT_WIDTH / 2);
    expect(model.tiles[1].left).not.toBe(MAP_PLOT_WIDTH / 2);
  });
});

describe('createMapModel cells', () => {
  it('drops geotile keys whose x/y are outside 0..2^z-1', () => {
    const model = createMapModel({
      type: 'map',
      cells: [
        { key: '4/4/6', value: 1 },
        { key: '4/999/999', value: 2 },
      ],
    });
    expect(model.cells).toHaveLength(1);
    expect(model.cells[0].key).toBe('4/4/6');
    expect(model.droppedCellCount).toBe(1);
  });
});

describe('createMapModel layers', () => {
  it('stacks the single-layer fields under `layers`, in order, each with its own ramp and color', () => {
    const model = createMapModel({
      type: 'map',
      regions: [{ code: 'US', value: 1 }],
      regionSet: 'world_countries',
      layers: [
        {
          kind: 'regions',
          regionSet: 'usa_states',
          regionKey: 'name',
          regionRamp: 'blues',
          regions: [
            { code: 'Ohio', value: 1 },
            { code: 'Utah', value: 3 },
          ],
        },
        { kind: 'markers', color: '#2200ff', markers: [{ id: 'a', lat: 40, lon: -100 }] },
      ],
    });
    expect(model.layers.map((layer) => layer.kind)).toEqual(['regions', 'regions', 'markers']);
    const [world, states, markers] = model.layers;
    expect(world.kind === 'regions' && world.regionSet).toBe('world_countries');
    expect(states.kind === 'regions' && states.regions[0].fill).not.toBe(
      states.kind === 'regions' && states.regions[1].fill
    );
    expect(markers.kind === 'markers' && markers.markers[0].fill).toBe('#2200ff');
    expect(model.regions).toHaveLength(3);
  });
});

describe('createMapModel layer paint', () => {
  it('carries each layer’s outline and label paint, as its Maps style sets them', () => {
    const model = createMapModel({
      type: 'map',
      layers: [
        {
          kind: 'markers',
          lineColor: '#ffffff',
          lineWidth: 2,
          labelColor: '#000000',
          labelSize: 14,
          markers: [{ id: 'a', lat: 0, lon: 0, label: 'A' }],
        },
      ],
    });
    expect(model.layers[0]).toMatchObject({
      lineColor: '#ffffff',
      lineWidth: 2,
      labelColor: '#000000',
      labelSize: 14,
    });
  });
});

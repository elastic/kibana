/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_ZOOM, MIN_ZOOM } from '../../../../common/constants';
import { LayerDescriptor } from '../../../../common/descriptor_types';
import { LayerGroup } from './layer_group';
import { AbstractLayer, ILayer } from '../layer';
import type { ISource } from '../../sources/source';

describe('getMinZoom', () => {
  test('should return MIN_ZOOM when there are no children', async () => {
    const layerGroup = new LayerGroup({ layerDescriptor: {} });
    expect(layerGroup.getMinZoom()).toBe(MIN_ZOOM);
  });

  test('should return smallest child.getMinZoom()', async () => {
    const layerGroup = new LayerGroup({ layerDescriptor: {} });
    layerGroup.setChildren([
      {
        getMinZoom: () => {
          return 1;
        },
      } as unknown as ILayer,
      {
        getMinZoom: () => {
          return 4;
        },
      } as unknown as ILayer,
    ]);
    expect(layerGroup.getMinZoom()).toBe(1);
  });
});

describe('getMaxZoom', () => {
  test('should return MAX_ZOOM when there are no children', async () => {
    const layerGroup = new LayerGroup({ layerDescriptor: {} });
    expect(layerGroup.getMaxZoom()).toBe(MAX_ZOOM);
  });

  test('should return largest child.getMaxZoom()', async () => {
    const layerGroup = new LayerGroup({ layerDescriptor: {} });
    layerGroup.setChildren([
      {
        getMaxZoom: () => {
          return 18;
        },
      } as unknown as ILayer,
      {
        getMaxZoom: () => {
          return 20;
        },
      } as unknown as ILayer,
    ]);
    expect(layerGroup.getMaxZoom()).toBe(20);
  });
});

describe('isLayerLoading', () => {
  function createTiledLayer(layerDescriptor: Partial<LayerDescriptor>) {
    const layer = new AbstractLayer({
      layerDescriptor,
      source: {} as unknown as ISource,
    });
    layer._isTiled = () => true;
    return layer;
  }

  test('should be true when some children have not started loading', async () => {
    const layerGroup = new LayerGroup({ layerDescriptor: {} });
    layerGroup.setChildren([
      createTiledLayer({
        __areTilesLoaded: true,
      }),
      createTiledLayer({}),
    ]);
    expect(layerGroup.isLayerLoading(1)).toBe(true);
  });

  test('should be true when some children are loading', async () => {
    const layerGroup = new LayerGroup({ layerDescriptor: {} });
    layerGroup.setChildren([
      createTiledLayer({
        __areTilesLoaded: true,
      }),
      createTiledLayer({
        __areTilesLoaded: false,
      }),
    ]);
    expect(layerGroup.isLayerLoading(1)).toBe(true);
  });

  test('should be false when all children have loaded or are not visible', async () => {
    const layerGroup = new LayerGroup({ layerDescriptor: {} });
    layerGroup.setChildren([
      createTiledLayer({
        __areTilesLoaded: true,
      }),
      createTiledLayer({
        visible: false,
      }),
      createTiledLayer({
        maxZoom: 24,
        minZoom: 3,
      }),
    ]);
    expect(layerGroup.isLayerLoading(1)).toBe(false);
  });

  test('should be false when all children have loaded', async () => {
    const layerGroup = new LayerGroup({ layerDescriptor: {} });
    layerGroup.setChildren([
      createTiledLayer({
        __areTilesLoaded: true,
      }),
      createTiledLayer({
        __areTilesLoaded: true,
      }),
    ]);
    expect(layerGroup.isLayerLoading(1)).toBe(false);
  });
});

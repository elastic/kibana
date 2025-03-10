/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */

import _ from 'lodash';
import type { Map as MbMap, LayerSpecification, StyleSpecification } from '@kbn/mapbox-gl';
import { getIsTextLayer, syncLayerOrder } from './sort_layers';
import { SPATIAL_FILTERS_LAYER_ID } from '../../../common/constants';
import { ILayer } from '../../classes/layers/layer';

let moveCounter = 0;

class MockMbMap {
  private _style: StyleSpecification;

  constructor(style: StyleSpecification) {
    this._style = _.cloneDeep(style);
  }

  getStyle() {
    return _.cloneDeep(this._style);
  }

  moveLayer(id: string, beforeId?: string) {
    moveCounter++;

    if (!this._style.layers) {
      throw new Error(`Can not move layer, mapbox style does not contain layers`);
    }

    const layerIndex = this._style.layers.findIndex((layer) => {
      return layer.id === id;
    });
    if (layerIndex === -1) {
      throw new Error(`Can not move layer, layer with id: ${id} does not exist`);
    }
    const moveMbLayer = this._style.layers[layerIndex];

    if (beforeId) {
      const beforeLayerIndex = this._style.layers.findIndex((mbLayer) => {
        return mbLayer.id === beforeId;
      });
      if (beforeLayerIndex === -1) {
        throw new Error(`Can not move layer, before layer with id: ${id} does not exist`);
      }
      this._style.layers.splice(beforeLayerIndex, 0, moveMbLayer);
    } else {
      const topIndex = this._style.layers.length;
      this._style.layers.splice(topIndex, 0, moveMbLayer);
    }

    // Remove layer from previous location
    this._style.layers.splice(layerIndex, 1);

    return this;
  }
}

class MockMapLayer {
  private readonly _id: string;
  private readonly _areLabelsOnTop: boolean;

  constructor(id: string, areLabelsOnTop: boolean) {
    this._id = id;
    this._areLabelsOnTop = areLabelsOnTop;
  }

  ownsMbLayerId(mbLayerId: string) {
    return mbLayerId.startsWith(this._id);
  }

  areLabelsOnTop() {
    return this._areLabelsOnTop;
  }

  getId() {
    return this._id;
  }
}

test('getIsTextLayer', () => {
  const paintLabelMbLayer = {
    id: `mylayer_text`,
    type: 'symbol',
    paint: { 'text-color': 'red' },
  } as LayerSpecification;
  expect(getIsTextLayer(paintLabelMbLayer)).toBe(true);

  const layoutLabelMbLayer = {
    id: `mylayer_text`,
    type: 'symbol',
    layout: { 'text-size': 'red' },
  } as unknown as LayerSpecification;
  expect(getIsTextLayer(layoutLabelMbLayer)).toBe(true);

  const iconMbLayer = {
    id: `mylayer_text`,
    type: 'symbol',
    paint: { 'icon-color': 'house' },
  } as LayerSpecification;
  expect(getIsTextLayer(iconMbLayer)).toBe(false);

  const circleMbLayer = { id: `mylayer_text`, type: 'circle' } as LayerSpecification;
  expect(getIsTextLayer(circleMbLayer)).toBe(false);
});

describe('sortLayer', () => {
  const ALPHA_LAYER_ID = 'alpha';
  const BRAVO_LAYER_ID = 'bravo';
  const CHARLIE_LAYER_ID = 'charlie';

  const spatialFilterLayer = new MockMapLayer(SPATIAL_FILTERS_LAYER_ID, false) as unknown as ILayer;
  const mapLayers = [
    new MockMapLayer(CHARLIE_LAYER_ID, true) as unknown as ILayer,
    new MockMapLayer(BRAVO_LAYER_ID, false) as unknown as ILayer,
    new MockMapLayer(ALPHA_LAYER_ID, false) as unknown as ILayer,
  ];

  beforeEach(() => {
    moveCounter = 0;
  });

  // Initial order that styles are added to mapbox is non-deterministic and depends on the order of data fetches.
  test('Should sort initial layer load order to expected order', () => {
    const initialMbStyle = {
      version: 8 as 8,
      layers: [
        { id: `${BRAVO_LAYER_ID}_text`, type: 'symbol' } as LayerSpecification,
        { id: `${BRAVO_LAYER_ID}_circle`, type: 'circle' } as LayerSpecification,
        { id: `${SPATIAL_FILTERS_LAYER_ID}_fill`, type: 'fill' } as LayerSpecification,
        { id: `${SPATIAL_FILTERS_LAYER_ID}_circle`, type: 'circle' } as LayerSpecification,
        { id: `gl-draw-polygon-fill-active.cold`, type: 'fill' } as LayerSpecification,
        {
          id: `${CHARLIE_LAYER_ID}_text`,
          type: 'symbol',
          paint: { 'text-color': 'red' },
        } as LayerSpecification,
        { id: `${CHARLIE_LAYER_ID}_fill`, type: 'fill' } as LayerSpecification,
        { id: `${ALPHA_LAYER_ID}_text`, type: 'symbol' } as LayerSpecification,
        { id: `${ALPHA_LAYER_ID}_circle`, type: 'circle' } as LayerSpecification,
      ],
      sources: {},
    };
    const mbMap = new MockMbMap(initialMbStyle);
    syncLayerOrder(mbMap as unknown as MbMap, spatialFilterLayer, mapLayers);
    const sortedMbStyle = mbMap.getStyle();
    const sortedMbLayerIds = sortedMbStyle.layers!.map((mbLayer) => {
      return mbLayer.id;
    });
    expect(sortedMbLayerIds).toEqual([
      'charlie_fill',
      'bravo_text',
      'bravo_circle',
      'alpha_text',
      'alpha_circle',
      'charlie_text',
      'gl-draw-polygon-fill-active.cold',
      'SPATIAL_FILTERS_LAYER_ID_fill',
      'SPATIAL_FILTERS_LAYER_ID_circle',
    ]);
  });

  // Test case testing when layer is moved in Table of Contents
  test('Should sort single layer single move to expected order', () => {
    const initialMbStyle = {
      version: 8 as 8,
      layers: [
        { id: `${CHARLIE_LAYER_ID}_fill`, type: 'fill' } as LayerSpecification,
        { id: `${ALPHA_LAYER_ID}_text`, type: 'symbol' } as LayerSpecification,
        { id: `${ALPHA_LAYER_ID}_circle`, type: 'circle' } as LayerSpecification,
        { id: `${BRAVO_LAYER_ID}_text`, type: 'symbol' } as LayerSpecification,
        { id: `${BRAVO_LAYER_ID}_circle`, type: 'circle' } as LayerSpecification,
        {
          id: `${CHARLIE_LAYER_ID}_text`,
          type: 'symbol',
          paint: { 'text-color': 'red' },
        } as LayerSpecification,
        { id: `${SPATIAL_FILTERS_LAYER_ID}_fill`, type: 'fill' } as LayerSpecification,
        { id: `${SPATIAL_FILTERS_LAYER_ID}_circle`, type: 'circle' } as LayerSpecification,
      ],
      sources: {},
    };
    const mbMap = new MockMbMap(initialMbStyle);
    syncLayerOrder(mbMap as unknown as MbMap, spatialFilterLayer, mapLayers);
    const sortedMbStyle = mbMap.getStyle();
    const sortedMbLayerIds = sortedMbStyle.layers!.map((mbLayer) => {
      return mbLayer.id;
    });
    expect(sortedMbLayerIds).toEqual([
      'charlie_fill',
      'bravo_text',
      'bravo_circle',
      'alpha_text',
      'alpha_circle',
      'charlie_text',
      'SPATIAL_FILTERS_LAYER_ID_fill',
      'SPATIAL_FILTERS_LAYER_ID_circle',
    ]);
  });

  // Hidden map layers on map load may not add mbLayers to mbStyle.
  test('Should sort with missing mblayers to expected order', () => {
    // Notice there are no bravo mbLayers in initial style.
    const initialMbStyle = {
      version: 8 as 8,
      layers: [
        { id: `${CHARLIE_LAYER_ID}_fill`, type: 'fill' } as LayerSpecification,
        { id: `${ALPHA_LAYER_ID}_circle`, type: 'circle' } as LayerSpecification,
      ],
      sources: {},
    };
    const mbMap = new MockMbMap(initialMbStyle);
    syncLayerOrder(mbMap as unknown as MbMap, spatialFilterLayer, mapLayers);
    const sortedMbStyle = mbMap.getStyle();
    const sortedMbLayerIds = sortedMbStyle.layers!.map((mbLayer) => {
      return mbLayer.id;
    });
    expect(sortedMbLayerIds).toEqual(['charlie_fill', 'alpha_circle']);
  });

  test('Should not call move layers when layers are in expected order', () => {
    const initialMbStyle = {
      version: 8 as 8,
      layers: [
        { id: `${CHARLIE_LAYER_ID}_fill`, type: 'fill' } as LayerSpecification,
        { id: `${BRAVO_LAYER_ID}_text`, type: 'symbol' } as LayerSpecification,
        { id: `${BRAVO_LAYER_ID}_circle`, type: 'circle' } as LayerSpecification,
        { id: `${ALPHA_LAYER_ID}_text`, type: 'symbol' } as LayerSpecification,
        { id: `${ALPHA_LAYER_ID}_circle`, type: 'circle' } as LayerSpecification,
        {
          id: `${CHARLIE_LAYER_ID}_text`,
          type: 'symbol',
          paint: { 'text-color': 'red' },
        } as LayerSpecification,
        { id: `${SPATIAL_FILTERS_LAYER_ID}_fill`, type: 'fill' } as LayerSpecification,
        { id: `${SPATIAL_FILTERS_LAYER_ID}_circle`, type: 'circle' } as LayerSpecification,
      ],
      sources: {},
    };
    const mbMap = new MockMbMap(initialMbStyle);
    syncLayerOrder(mbMap as unknown as MbMap, spatialFilterLayer, mapLayers);
    expect(moveCounter).toBe(0);
  });
});

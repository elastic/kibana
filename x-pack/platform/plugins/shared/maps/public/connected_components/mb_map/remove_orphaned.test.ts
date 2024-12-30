/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */

import type {
  Map as MbMap,
  LayerSpecification,
  SourceSpecification,
  StyleSpecification,
} from '@kbn/mapbox-gl';
import { removeOrphanedSourcesAndLayers } from './remove_orphaned';
import { SPATIAL_FILTERS_LAYER_ID } from '../../../common/constants';
import _ from 'lodash';
import { ILayer } from '../../classes/layers/layer';

class MockMbMap {
  private _style: StyleSpecification;

  constructor(style: StyleSpecification) {
    this._style = _.cloneDeep(style);
  }

  getStyle() {
    return _.cloneDeep(this._style);
  }

  removeSource(sourceId: string) {
    delete this._style.sources[sourceId];
  }

  removeLayer(layerId: string) {
    const layerToRemove = this._style.layers.findIndex((layer) => {
      return layer.id === layerId;
    });
    this._style.layers.splice(layerToRemove, 1);
  }
}

class MockLayer {
  private readonly _mbSourceIds: string[];
  private readonly _mbLayerIdsToSource: Array<{ id: string; source: string }>;

  constructor(mbSourceIds: string[], mbLayerIdsToSource: Array<{ id: string; source: string }>) {
    this._mbSourceIds = mbSourceIds;
    this._mbLayerIdsToSource = mbLayerIdsToSource;
  }

  // Custom interface used in getMockStyle for populating maplibre style with layers and sources
  getMbSourceIds() {
    return this._mbSourceIds;
  }
  getMbLayersIdsToSource() {
    return this._mbLayerIdsToSource;
  }

  // ILayer interface
  ownsMbLayerId(mbLayerId: string) {
    return this._mbLayerIdsToSource.some((mbLayerToSource) => {
      return mbLayerToSource.id === mbLayerId;
    });
  }

  ownsMbSourceId(mbSourceId: string) {
    return this._mbSourceIds.some((id) => mbSourceId === id);
  }
}

function getMockStyle(orderedMockLayerList: MockLayer[]) {
  const mockStyle = {
    version: 8 as 8,
    sources: {},
    layers: [],
  } as StyleSpecification;

  orderedMockLayerList.forEach((mockLayer) => {
    mockLayer.getMbSourceIds().forEach((mbSourceId) => {
      mockStyle.sources[mbSourceId] = {} as unknown as SourceSpecification;
    });
    mockLayer.getMbLayersIdsToSource().forEach(({ id, source }) => {
      mockStyle.layers.push({
        id,
        source,
      } as unknown as LayerSpecification);
    });
  });

  return mockStyle;
}

function makeSingleSourceMockLayer(layerId: string) {
  const source1 = layerId + '_source1';
  return new MockLayer(
    [source1],
    [
      { id: source1 + '_fill', source: source1 },
      { id: source1 + '_line', source: source1 },
    ]
  );
}

function makeMultiSourceMockLayer(layerId: string) {
  const source1 = layerId + '_source1';
  const source2 = layerId + '_source2';
  return new MockLayer(
    [source1, source2],
    [
      { id: source1 + '_fill', source: source1 },
      { id: source2 + '_line', source: source2 },
      { id: source1 + '_line', source: source1 },
      { id: source1 + '_point', source: source1 },
    ]
  );
}

describe('removeOrphanedSourcesAndLayers', () => {
  const spatialFilterLayer = makeMultiSourceMockLayer(SPATIAL_FILTERS_LAYER_ID);
  test('should remove foo and bar layer', async () => {
    const bazLayer = makeSingleSourceMockLayer('baz');
    const fooLayer = makeSingleSourceMockLayer('foo');
    const barLayer = makeSingleSourceMockLayer('bar');

    const currentLayerList = [bazLayer, fooLayer, barLayer];
    const nextLayerList = [bazLayer];

    const currentStyle = getMockStyle(currentLayerList);
    const mockMbMap = new MockMbMap(currentStyle);

    removeOrphanedSourcesAndLayers(
      mockMbMap as unknown as MbMap,
      nextLayerList as unknown as ILayer[],
      spatialFilterLayer as unknown as ILayer
    );
    const removedStyle = mockMbMap.getStyle();

    const nextStyle = getMockStyle(nextLayerList);
    expect(removedStyle).toEqual(nextStyle);
  });

  test('should remove foo and bar layer (multisource)', () => {
    const bazLayer = makeMultiSourceMockLayer('baz');
    const fooLayer = makeMultiSourceMockLayer('foo');
    const barLayer = makeMultiSourceMockLayer('bar');

    const currentLayerList = [bazLayer, fooLayer, barLayer];
    const nextLayerList = [bazLayer];

    const currentStyle = getMockStyle(currentLayerList);
    const mockMbMap = new MockMbMap(currentStyle);

    removeOrphanedSourcesAndLayers(
      mockMbMap as unknown as MbMap,
      nextLayerList as unknown as ILayer[],
      spatialFilterLayer as unknown as ILayer
    );
    const removedStyle = mockMbMap.getStyle();

    const nextStyle = getMockStyle(nextLayerList);
    expect(removedStyle).toEqual(nextStyle);
  });

  test('should not remove anything', () => {
    const bazLayer = makeSingleSourceMockLayer('baz');
    const fooLayer = makeSingleSourceMockLayer('foo');
    const barLayer = makeSingleSourceMockLayer('bar');

    const currentLayerList = [bazLayer, fooLayer, barLayer];
    const nextLayerList = [bazLayer, fooLayer, barLayer];

    const currentStyle = getMockStyle(currentLayerList);
    const mockMbMap = new MockMbMap(currentStyle);

    removeOrphanedSourcesAndLayers(
      mockMbMap as unknown as MbMap,
      nextLayerList as unknown as ILayer[],
      spatialFilterLayer as unknown as ILayer
    );
    const removedStyle = mockMbMap.getStyle();

    const nextStyle = getMockStyle(nextLayerList);
    expect(removedStyle).toEqual(nextStyle);
  });

  test('should not remove spatial filter layer and sources when spatialFilterLayer is provided', () => {
    const styleWithSpatialFilters = getMockStyle([spatialFilterLayer]);
    const mockMbMap = new MockMbMap(styleWithSpatialFilters);

    removeOrphanedSourcesAndLayers(
      mockMbMap as unknown as MbMap,
      [],
      spatialFilterLayer as unknown as ILayer
    );
    expect(mockMbMap.getStyle()).toEqual(styleWithSpatialFilters);
  });

  test('should remove sources after spatial filter layer', () => {
    const barLayer = makeMultiSourceMockLayer('bar');

    const currentLayerList = [spatialFilterLayer, barLayer];

    const currentStyle = getMockStyle(currentLayerList);
    const mockMbMap = new MockMbMap(currentStyle);

    removeOrphanedSourcesAndLayers(
      mockMbMap as unknown as MbMap,
      [],
      spatialFilterLayer as unknown as ILayer
    );
    const removedStyle = mockMbMap.getStyle();

    expect(Object.keys(removedStyle.sources)).toEqual([
      'SPATIAL_FILTERS_LAYER_ID_source1',
      'SPATIAL_FILTERS_LAYER_ID_source2',
    ]);
  });

  test('should not remove mapbox gl draw layers and sources', () => {
    const fooLayer = makeMultiSourceMockLayer('foo');
    const layerList = [fooLayer];

    const currentStyle = getMockStyle(layerList);
    currentStyle.layers.push({ id: 'gl-draw-points' } as unknown as LayerSpecification);
    const mockMbMap = new MockMbMap(currentStyle);

    removeOrphanedSourcesAndLayers(
      mockMbMap as unknown as MbMap,
      layerList as unknown as ILayer[],
      spatialFilterLayer as unknown as ILayer
    );
    expect(mockMbMap.getStyle()).toEqual(currentStyle);
  });
});

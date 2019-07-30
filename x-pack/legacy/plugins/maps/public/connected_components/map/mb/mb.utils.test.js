/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { removeOrphanedSourcesAndLayers, syncLayerOrder } from './utils';
import _ from 'lodash';

class MockMbMap {

  constructor(style) {
    this._style = _.cloneDeep(style);
  }

  getStyle() {
    return _.cloneDeep(this._style);
  }

  moveLayer(layerId, nextLayerId) {

    const indexOfLayerToMove = this._style.layers.findIndex(layer => {
      return layer.id === layerId;
    });

    const layerToMove = this._style.layers[indexOfLayerToMove];
    this._style.layers.splice(indexOfLayerToMove, 1);

    const indexOfNextLayer = this._style.layers.findIndex(layer => {
      return layer.id === nextLayerId;
    });

    this._style.layers.splice(indexOfNextLayer, 0, layerToMove);

  }

  removeSource(sourceId) {
    delete this._style.sources[sourceId];
  }

  removeLayer(layerId) {
    const layerToRemove = this._style.layers.findIndex(layer => {
      return layer.id === layerId;
    });
    this._style.layers.splice(layerToRemove, 1);
  }
}


class MockLayer {
  constructor(layerId, mbSourceIds, mbLayerIdsToSource) {
    this._mbSourceIds = mbSourceIds;
    this._mbLayerIdsToSource = mbLayerIdsToSource;
    this._layerId = layerId;
  }
  getId() {
    return this._layerId;
  }
  getMbSourceIds() {
    return this._mbSourceIds;
  }
  getMbLayersIdsToSource() {
    return this._mbLayerIdsToSource;
  }

}


function getMockStyle(orderedMockLayerList) {

  const mockStyle = {
    sources: {},
    layers: []
  };

  orderedMockLayerList.forEach(mockLayer => {
    mockLayer.getMbSourceIds().forEach((mbSourceId) => {
      mockStyle.sources[mbSourceId] = {};
    });
    mockLayer.getMbLayersIdsToSource().forEach(({ id, source }) => {
      mockStyle.layers.push({
        id: id,
        source: source
      });
    });
  });

  return mockStyle;
}


function makeSingleSourceMockLayer(layerId) {
  return new MockLayer(
    layerId,
    [layerId],
    [{ id: layerId + '_fill', source: layerId }, { id: layerId + '_line', source: layerId }]
  );
}

describe('mb/utils', () => {

  test('should remove foo and bar layer', async () => {

    const bazLayer = makeSingleSourceMockLayer('baz');
    const fooLayer = makeSingleSourceMockLayer('foo');
    const barLayer = makeSingleSourceMockLayer('bar');

    const currentLayerList = [bazLayer, fooLayer, barLayer];
    const nextLayerList = [bazLayer];

    const currentStyle = getMockStyle(currentLayerList);
    const mockMbMap = new MockMbMap(currentStyle);

    removeOrphanedSourcesAndLayers(mockMbMap, nextLayerList);
    const removedStyle = mockMbMap.getStyle();


    const nextStyle = getMockStyle(nextLayerList);
    expect(removedStyle).toEqual(nextStyle);

  });

  test('should not remove anything', async () => {

    const bazLayer = makeSingleSourceMockLayer('baz');
    const fooLayer = makeSingleSourceMockLayer('foo');
    const barLayer = makeSingleSourceMockLayer('bar');

    const currentLayerList = [bazLayer, fooLayer, barLayer];
    const nextLayerList = [bazLayer, fooLayer, barLayer];

    const currentStyle = getMockStyle(currentLayerList);
    const mockMbMap = new MockMbMap(currentStyle);

    removeOrphanedSourcesAndLayers(mockMbMap, nextLayerList);
    const removedStyle = mockMbMap.getStyle();

    const nextStyle = getMockStyle(nextLayerList);
    expect(removedStyle).toEqual(nextStyle);

  });

  test('should move bar layer in front of foo layer', async () => {

    const fooLayer = makeSingleSourceMockLayer('foo');
    const barLayer = makeSingleSourceMockLayer('bar');

    const currentLayerOrder = [fooLayer, barLayer];
    const nextLayerListOrder = [barLayer, fooLayer];

    const currentStyle = getMockStyle(currentLayerOrder);
    const mockMbMap = new MockMbMap(currentStyle);
    syncLayerOrder(mockMbMap, nextLayerListOrder);
    const orderedStyle = mockMbMap.getStyle();

    const nextStyle = getMockStyle(nextLayerListOrder);
    expect(orderedStyle).toEqual(nextStyle);

  });

  test('should move bar layer in front of foo layer, but after baz layer', async () => {


    const bazLayer = makeSingleSourceMockLayer('baz');
    const fooLayer = makeSingleSourceMockLayer('foo');
    const barLayer = makeSingleSourceMockLayer('bar');

    const currentLayerOrder = [bazLayer, fooLayer, barLayer];
    const nextLayerListOrder = [bazLayer, barLayer, fooLayer];


    const currentStyle = getMockStyle(currentLayerOrder);
    const mockMbMap = new MockMbMap(currentStyle);
    syncLayerOrder(mockMbMap, nextLayerListOrder);
    const orderedStyle = mockMbMap.getStyle();

    const nextStyle = getMockStyle(nextLayerListOrder);
    expect(orderedStyle).toEqual(nextStyle);

  });

  test('should reorder foo and bar and remove baz', async () => {


    const bazLayer = makeSingleSourceMockLayer('baz');
    const fooLayer = makeSingleSourceMockLayer('foo');
    const barLayer = makeSingleSourceMockLayer('bar');

    const currentLayerOrder = [bazLayer, fooLayer, barLayer];
    const nextLayerListOrder = [barLayer, fooLayer];


    const currentStyle = getMockStyle(currentLayerOrder);
    const mockMbMap = new MockMbMap(currentStyle);
    removeOrphanedSourcesAndLayers(mockMbMap, nextLayerListOrder);
    syncLayerOrder(mockMbMap, nextLayerListOrder);
    const orderedStyle = mockMbMap.getStyle();

    const nextStyle = getMockStyle(nextLayerListOrder);
    expect(orderedStyle).toEqual(nextStyle);

  });


});

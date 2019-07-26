/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { removeOrphanedSourcesAndLayers, syncLayerOrder } from './utils';

class MockMbMap {

  constructor(style) {
    this._style = style;
  }

  getStyle() {
    return this._style;
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
    mockLayer.getMbSourceIds((mbSourceId) => {
      console.log('add mbs', mbSourceId);
      mockStyle.sources[mbSourceId] = {};
    });
    mockLayer.getMbLayersIdsToSource(({ id, source }) => {
      console.log('add', id, source);
      mockStyle.layers.push({
        id: id,
        source: source
      });
    });
  });

  console.log(mockStyle);
  return mockStyle;


}

describe('mb/utils', () => {

  // test('should remove orphaned sources and layers', async () => {
  //   expect(true).toBe(false);
  // });

  test('should move bar layer in front of foo layer', async () => {


    const fooLayer = new MockLayer(
      'foo',
      ['foo'],
      [{ id: 'foo_fill', source: 'foo' }, { id: 'foo_line', source: 'foo' }]
    );

    const barLayer = new MockLayer(
      'bar',
      ['bar'],
      [{ id: 'bar_fill', source: 'bar' }, { id: 'bar_line', source: 'bar' }]
    );

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

    const bazLayer = new MockLayer(
      'baz',
      ['baz'],
      [{ id: 'baz_fill', source: 'bar' }, { id: 'baz_line', source: 'baz' }]
    );

    const fooLayer = new MockLayer(
      'foo',
      ['foo'],
      [{ id: 'foo_fill', source: 'foo' }, { id: 'foo_line', source: 'foo' }]
    );

    const barLayer = new MockLayer(
      'bar',
      ['bar'],
      [{ id: 'bar_fill', source: 'bar' }, { id: 'bar_line', source: 'bar' }]
    );

    const currentLayerOrder = [bazLayer, fooLayer, barLayer];
    const nextLayerListOrder = [bazLayer, barLayer, fooLayer];


    const currentStyle = getMockStyle(currentLayerOrder);
    const mockMbMap = new MockMbMap(currentStyle);

    syncLayerOrder(mockMbMap, nextLayerListOrder);

    const orderedStyle = mockMbMap.getStyle();

    const nextStyle = getMockStyle(nextLayerListOrder);

    expect(orderedStyle).toEqual(nextStyle);

  });


});

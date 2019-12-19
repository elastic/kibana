/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { removeLayer, appendLayer } from './layer_actions';

function createTestArgs(initialLayerIds: string[]) {
  const trackUiEvent = jest.fn();
  const testDatasource = (datasourceId: string) => ({
    id: datasourceId,
    clearLayer: (layerIds: unknown, layerId: string) =>
      (layerIds as string[]).map((id: string) =>
        id === layerId ? `${datasourceId}_clear_${layerId}` : id
      ),
    removeLayer: (layerIds: unknown, layerId: string) =>
      (layerIds as string[]).filter((id: string) => id !== layerId),
    insertLayer: (layerIds: unknown, layerId: string) => [...(layerIds as string[]), layerId],
  });

  const activeVisualization = {
    clearLayer: (layerIds: unknown, layerId: string) =>
      (layerIds as string[]).map((id: string) => (id === layerId ? `vis_clear_${layerId}` : id)),
    removeLayer: (layerIds: unknown, layerId: string) =>
      (layerIds as string[]).filter((id: string) => id !== layerId),
    getLayerIds: (layerIds: unknown) => layerIds as string[],
    appendLayer: (layerIds: unknown, layerId: string) => [...(layerIds as string[]), layerId],
  };

  return {
    state: {
      activeDatasourceId: 'ds1',
      datasourceStates: {
        ds1: {
          isLoading: false,
          state: initialLayerIds.slice(0, 1),
        },
        ds2: {
          isLoading: false,
          state: initialLayerIds.slice(1),
        },
      },
      title: 'foo',
      visualization: {
        activeId: 'vis1',
        state: initialLayerIds,
      },
    },
    activeVisualization,
    datasourceMap: {
      ds1: testDatasource('ds1'),
      ds2: testDatasource('ds2'),
    },
    trackUiEvent,
  };
}

describe('removeLayer', () => {
  it('should clear the layer if it is the only layer', () => {
    const { state, trackUiEvent, datasourceMap, activeVisualization } = createTestArgs(['layer1']);
    const newState = removeLayer({
      activeVisualization,
      datasourceMap,
      layerId: 'layer1',
      state,
      trackUiEvent,
    });

    expect(newState.visualization.state).toEqual(['vis_clear_layer1']);
    expect(newState.datasourceStates.ds1.state).toEqual(['ds1_clear_layer1']);
    expect(newState.datasourceStates.ds2.state).toEqual([]);
    expect(trackUiEvent).toHaveBeenCalledWith('layer_cleared');
  });

  it('should remove the layer if it is not the only layer', () => {
    const { state, trackUiEvent, datasourceMap, activeVisualization } = createTestArgs([
      'layer1',
      'layer2',
    ]);
    const newState = removeLayer({
      activeVisualization,
      datasourceMap,
      layerId: 'layer1',
      state,
      trackUiEvent,
    });

    expect(newState.visualization.state).toEqual(['layer2']);
    expect(newState.datasourceStates.ds1.state).toEqual([]);
    expect(newState.datasourceStates.ds2.state).toEqual(['layer2']);
    expect(trackUiEvent).toHaveBeenCalledWith('layer_removed');
  });
});

describe('appendLayer', () => {
  it('should add the layer to the datasource and visualization', () => {
    const { state, trackUiEvent, datasourceMap, activeVisualization } = createTestArgs([
      'layer1',
      'layer2',
    ]);
    const newState = appendLayer({
      activeDatasource: datasourceMap.ds1,
      activeVisualization,
      generateId: () => 'foo',
      state,
      trackUiEvent,
    });

    expect(newState.visualization.state).toEqual(['layer1', 'layer2', 'foo']);
    expect(newState.datasourceStates.ds1.state).toEqual(['layer1', 'foo']);
    expect(newState.datasourceStates.ds2.state).toEqual(['layer2']);
    expect(trackUiEvent).toHaveBeenCalledWith('layer_added');
  });
});

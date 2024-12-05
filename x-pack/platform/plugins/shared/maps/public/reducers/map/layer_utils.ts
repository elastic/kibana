/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LayerDescriptor } from '../../../common/descriptor_types';
import { MapState } from './types';
import { copyPersistentState, TRACKED_LAYER_DESCRIPTOR } from '../copy_persistent_state';

export function getLayerIndex(list: LayerDescriptor[], layerId: string): number {
  return list.findIndex(({ id }) => layerId === id);
}

export function findLayerById(state: MapState, layerId: string): LayerDescriptor | undefined {
  return state.layerList.find(({ id }) => layerId === id);
}

export function clearLayerProp(
  state: MapState,
  layerId: string,
  propName: keyof LayerDescriptor
): MapState {
  if (!layerId) {
    return state;
  }

  const { layerList } = state;
  const layerIdx = getLayerIndex(layerList, layerId);
  if (layerIdx === -1) {
    return state;
  }

  const updatedLayer = {
    ...layerList[layerIdx],
  };
  delete updatedLayer[propName];
  const updatedList = [
    ...layerList.slice(0, layerIdx),
    updatedLayer,
    ...layerList.slice(layerIdx + 1),
  ];
  return { ...state, layerList: updatedList };
}

export function updateLayerInList(
  state: MapState,
  layerId: string,
  attribute: keyof LayerDescriptor,
  newValue?: unknown
): MapState {
  if (!layerId) {
    return state;
  }

  const { layerList } = state;
  const layerIdx = getLayerIndex(layerList, layerId);
  if (layerIdx === -1) {
    return state;
  }

  const updatedLayer = {
    ...layerList[layerIdx],
    [attribute]: newValue,
  };
  const updatedList = [
    ...layerList.slice(0, layerIdx),
    updatedLayer,
    ...layerList.slice(layerIdx + 1),
  ];
  return { ...state, layerList: updatedList };
}

export function updateLayerSourceDescriptorProp(
  state: MapState,
  layerId: string,
  propName: string,
  value: unknown
): MapState {
  const { layerList } = state;
  const layerIdx = getLayerIndex(layerList, layerId);
  const updatedLayer = {
    ...layerList[layerIdx],
    sourceDescriptor: {
      ...layerList[layerIdx].sourceDescriptor,
      [propName]: value,
    },
  };
  const updatedList = [
    ...layerList.slice(0, layerIdx),
    updatedLayer,
    ...layerList.slice(layerIdx + 1),
  ] as LayerDescriptor[];
  return { ...state, layerList: updatedList };
}

export function trackCurrentLayerState(state: MapState, layerId: string): MapState {
  const layer = findLayerById(state, layerId);
  const layerCopy = copyPersistentState(layer);
  return updateLayerInList(state, layerId, TRACKED_LAYER_DESCRIPTOR, layerCopy);
}

export function removeTrackedLayerState(state: MapState, layerId: string): MapState {
  const layer = findLayerById(state, layerId);
  if (!layer) {
    return state;
  }

  const copyLayer = { ...layer };
  delete copyLayer[TRACKED_LAYER_DESCRIPTOR];

  return {
    ...state,
    layerList: setLayer(state.layerList, copyLayer),
  };
}

export function rollbackTrackedLayerState(state: MapState, layerId: string): MapState {
  const layer = findLayerById(state, layerId);
  if (!layer) {
    return state;
  }

  const trackedLayerDescriptor = layer[TRACKED_LAYER_DESCRIPTOR];

  // this assumes that any nested temp-state in the layer-descriptor (e.g. of styles), is not relevant and can be recovered easily (e.g. this is not the case for __dataRequests)
  // That assumption is true in the context of this app, but not generalizable.
  // consider rewriting copyPersistentState to only strip the first level of temp state.
  const rolledbackLayer = { ...layer, ...trackedLayerDescriptor };
  delete rolledbackLayer[TRACKED_LAYER_DESCRIPTOR];

  return {
    ...state,
    layerList: setLayer(state.layerList, rolledbackLayer),
  };
}

export function setLayer(
  layerList: LayerDescriptor[],
  layerDescriptor: LayerDescriptor
): LayerDescriptor[] {
  const layerIndex = getLayerIndex(layerList, layerDescriptor.id);
  if (layerIndex === -1) {
    return layerList;
  }
  const newLayerList = [...layerList];
  newLayerList[layerIndex] = layerDescriptor;
  return newLayerList;
}

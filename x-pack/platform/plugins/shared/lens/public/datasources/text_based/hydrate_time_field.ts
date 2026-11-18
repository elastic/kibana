/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  DatasourceStates,
  IndexPatternMap,
  TextBasedLayer,
  TextBasedLayerColumn,
  TextBasedPersistedState,
} from '@kbn/lens-common';
import { LENS_DATASOURCE_ID } from '@kbn/lens-common';
import { isRecord } from '../../types_guards';

function isTextBasedLayerColumn(value: unknown): value is TextBasedLayerColumn {
  return (
    isRecord(value) && typeof value.columnId === 'string' && typeof value.fieldName === 'string'
  );
}

function isTextBasedLayer(value: unknown): value is TextBasedLayer {
  if (
    !isRecord(value) ||
    !Array.isArray(value.columns) ||
    !value.columns.every(isTextBasedLayerColumn)
  ) {
    return false;
  }
  if (value.index !== undefined && typeof value.index !== 'string') {
    return false;
  }
  if (value.timeField !== undefined && typeof value.timeField !== 'string') {
    return false;
  }
  if (value.query !== undefined) {
    return isRecord(value.query) && typeof value.query.esql === 'string';
  }
  return true;
}

/** True when state is a text-based datasource with array-column ES|QL layers. */
export function isTextBasedState(state: unknown): state is TextBasedPersistedState {
  return (
    isRecord(state) && isRecord(state.layers) && Object.values(state.layers).every(isTextBasedLayer)
  );
}

/**
 * Copies each DataView `timeFieldName` onto ES|QL layers that persisted without one.
 */
export function hydrateTextBasedLayerTimeFields(
  datasourceStates: DatasourceStates,
  indexPatterns: IndexPatternMap
): DatasourceStates {
  const textBasedDatasource = datasourceStates[LENS_DATASOURCE_ID.TEXT_BASED];
  if (!textBasedDatasource || !isTextBasedState(textBasedDatasource.state)) {
    return datasourceStates;
  }

  const textBasedState = textBasedDatasource.state;

  const nextLayers: TextBasedPersistedState['layers'] = {};
  let didChange = false;

  for (const [layerId, layer] of Object.entries(textBasedState.layers)) {
    if (layer.timeField) {
      nextLayers[layerId] = layer;
      continue;
    }

    const timeField = layer.index ? indexPatterns[layer.index]?.timeFieldName : undefined;
    if (timeField) {
      nextLayers[layerId] = { ...layer, timeField };
      didChange = true;
      continue;
    }

    nextLayers[layerId] = layer;
  }

  if (!didChange) {
    return datasourceStates;
  }

  return {
    ...datasourceStates,
    [LENS_DATASOURCE_ID.TEXT_BASED]: {
      ...textBasedDatasource,
      state: {
        ...textBasedState,
        layers: nextLayers,
      },
    },
  };
}

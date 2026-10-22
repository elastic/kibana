/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DatasourceStates, MetricVisualizationState } from '@kbn/lens-common';
import { isRecord } from '../../../types_guards';

interface FormBasedLikeLayer {
  columns: Record<string, { label?: string; customLabel?: boolean }>;
}

interface TextBasedLikeLayer {
  columns: Array<{ columnId: string; label?: string; customLabel?: boolean }>;
}

interface LayersState {
  layers: Record<string, unknown>;
}

function isLayersState(state: unknown): state is LayersState {
  return isRecord(state) && isRecord(state.layers);
}

function isFormBasedLikeLayer(layer: unknown): layer is FormBasedLikeLayer {
  return isRecord(layer) && isRecord(layer.columns) && !Array.isArray(layer.columns);
}

function isTextBasedLikeLayer(layer: unknown): layer is TextBasedLikeLayer {
  return isRecord(layer) && Array.isArray(layer.columns);
}

function applyLabelToFormBasedLayer(
  layer: FormBasedLikeLayer,
  columnId: string,
  label: string
): FormBasedLikeLayer | undefined {
  const column = layer.columns[columnId];
  if (!column) {
    return;
  }

  return {
    ...layer,
    columns: {
      ...layer.columns,
      [columnId]: {
        ...column,
        label,
        customLabel: true,
      },
    },
  };
}

function applyLabelToTextBasedLayer(
  layer: TextBasedLikeLayer,
  columnId: string,
  label: string
): TextBasedLikeLayer | undefined {
  const columnIndex = layer.columns.findIndex((column) => column.columnId === columnId);
  if (columnIndex === -1) {
    return;
  }

  return {
    ...layer,
    columns: layer.columns.map((column, index) =>
      index === columnIndex
        ? {
            ...column,
            label,
            customLabel: true,
          }
        : column
    ),
  };
}

function applyLabelToLayer(layer: unknown, columnId: string, label: string): unknown {
  if (isFormBasedLikeLayer(layer)) {
    return applyLabelToFormBasedLayer(layer, columnId, label);
  }
  if (isTextBasedLikeLayer(layer)) {
    return applyLabelToTextBasedLayer(layer, columnId, label);
  }
  return undefined;
}

function applyLabelToDatasourceState(
  state: unknown,
  layerId: string,
  columnId: string,
  label: string
): unknown {
  if (!isLayersState(state)) {
    return;
  }

  // Prefer the visualization's metric layer, then scan remaining layers.
  const preferredLayer = applyLabelToLayer(state.layers[layerId], columnId, label);
  if (preferredLayer) {
    return {
      ...state,
      layers: {
        ...state.layers,
        [layerId]: preferredLayer,
      },
    };
  }

  for (const [id, layer] of Object.entries(state.layers)) {
    const updatedLayer = applyLabelToLayer(layer, columnId, label);
    if (updatedLayer) {
      return {
        ...state,
        layers: {
          ...state.layers,
          [id]: updatedLayer,
        },
      };
    }
  }

  return undefined;
}

/**
 * Editor migration: writes visualization `secondaryLabel` onto the secondary
 * metric column in datasource state, then removes it from visualization state.
 *
 * Dashboard panel rendering must not call this. `toExpression` still passes
 * visualization `secondaryLabel` to the chart; dropping it would show the
 * existing column name instead, which can differ from the legacy vis text.
 */
export function hydrateLegacySecondaryLabel(
  visualizationState: MetricVisualizationState,
  datasourceStates: DatasourceStates
): {
  visualizationState: MetricVisualizationState;
  datasourceStates: DatasourceStates;
} {
  const { secondaryLabel, secondaryMetricAccessor, layerId } = visualizationState;

  if (!secondaryLabel || !secondaryMetricAccessor) {
    return { visualizationState, datasourceStates };
  }

  let didUpdateColumn = false;
  const nextDatasourceStates: DatasourceStates = {};

  for (const [datasourceId, datasourceState] of Object.entries(datasourceStates)) {
    const nextState = applyLabelToDatasourceState(
      datasourceState.state,
      layerId,
      secondaryMetricAccessor,
      secondaryLabel
    );

    if (nextState) {
      didUpdateColumn = true;
      nextDatasourceStates[datasourceId] = {
        ...datasourceState,
        state: nextState,
      };
    } else {
      nextDatasourceStates[datasourceId] = datasourceState;
    }
  }

  // Keep visualization `secondaryLabel` if the datasource column could not be updated.
  if (!didUpdateColumn) {
    return { visualizationState, datasourceStates };
  }

  const { secondaryLabel: _removed, ...visualizationWithoutLabel } = visualizationState;

  return {
    visualizationState: visualizationWithoutLabel,
    datasourceStates: nextDatasourceStates,
  };
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DatasourceStates, MetricVisualizationState } from '@kbn/lens-common';
import { LENS_METRIC_ID } from '@kbn/lens-common';

interface FormBasedLikeLayer {
  columns: Record<string, { label?: string; customLabel?: boolean }>;
}

interface TextBasedLikeLayer {
  columns: Array<{ columnId: string; label?: string; customLabel?: boolean }>;
}

interface LayersState {
  layers: Record<string, unknown>;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isLayersState = (state: unknown): state is LayersState =>
  isRecord(state) && isRecord(state.layers);

const isFormBasedLikeLayer = (layer: unknown): layer is FormBasedLikeLayer =>
  isRecord(layer) && isRecord(layer.columns) && !Array.isArray(layer.columns);

const isTextBasedLikeLayer = (layer: unknown): layer is TextBasedLikeLayer =>
  isRecord(layer) && Array.isArray(layer.columns);

const applyLabelToFormBasedLayer = (
  layer: FormBasedLikeLayer,
  columnId: string,
  label: string
): FormBasedLikeLayer | undefined => {
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
};

const applyLabelToTextBasedLayer = (
  layer: TextBasedLikeLayer,
  columnId: string,
  label: string
): TextBasedLikeLayer | undefined => {
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
};

const applyLabelToLayer = (layer: unknown, columnId: string, label: string): unknown => {
  if (isFormBasedLikeLayer(layer)) {
    return applyLabelToFormBasedLayer(layer, columnId, label);
  }
  if (isTextBasedLikeLayer(layer)) {
    return applyLabelToTextBasedLayer(layer, columnId, label);
  }
  return undefined;
};

const applyLabelToDatasourceState = (
  state: unknown,
  layerId: string,
  columnId: string,
  label: string
): unknown => {
  if (!isLayersState(state)) {
    return;
  }

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
};

/**
 * Copies a leftover visualization `secondaryLabel` onto the secondary column Name.
 *
 * The chart already paints that vis text, so the dimension Name has to match it
 * even when the column already has a different custom label. The vis field is
 * dropped only after the column write succeeds, so dashboard view (which never
 * calls this) keeps the render fallback.
 */
export const applyLegacySecondaryLabelToColumn = (
  visualizationState: MetricVisualizationState,
  datasourceStates: DatasourceStates
): {
  visualizationState: MetricVisualizationState;
  datasourceStates: DatasourceStates;
} => {
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

  if (!didUpdateColumn) {
    return { visualizationState, datasourceStates };
  }

  const { secondaryLabel: _removed, ...visualizationWithoutLabel } = visualizationState;

  return {
    visualizationState: visualizationWithoutLabel,
    datasourceStates: nextDatasourceStates,
  };
};

export const applyLegacySecondaryLabelIfMetric = <T>(
  visualizationId: string | null | undefined,
  visualizationState: T,
  datasourceStates: DatasourceStates
): {
  visualizationState: T;
  datasourceStates: DatasourceStates;
} => {
  if (visualizationId !== LENS_METRIC_ID) {
    return { visualizationState, datasourceStates };
  }

  return applyLegacySecondaryLabelToColumn(
    visualizationState as MetricVisualizationState,
    datasourceStates
  ) as { visualizationState: T; datasourceStates: DatasourceStates };
};

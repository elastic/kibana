/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface DatasourceLayerColumns {
  [columnId: string]: { label?: string; sourceField?: string };
}

interface DatasourceLayers {
  [layerId: string]: { columns?: DatasourceLayerColumns; indexPatternId?: string; columnOrder?: string[] };
}

interface VisLayer {
  layerId?: string;
  splitAccessors?: string[];
  primaryGroups?: string[];
}

interface AttributesState {
  visualization?: { layers?: VisLayer[] };
  datasourceStates?: Record<string, { layers?: DatasourceLayers }>;
}

/** Reference name used for formBased layer index pattern (see form_based loader) */
const getLayerReferenceName = (layerId: string) =>
  `indexpattern-datasource-layer-${layerId}`;

export interface BreakdownLayerInfo {
  layerId: string;
  columnId: string;
  indexPatternId: string;
}

/**
 * Extracts the data field name of the first breakdown/split dimension from Lens attributes,
 * for use with Smart Title. Returns only the raw field name (e.g. "region"), not the full
 * breakdown label (e.g. "Top 5 values of region"). Supports XY (splitAccessors) and partition
 * (primaryGroups) charts.
 */
export function getBreakdownFieldNameFromAttributes(
  attributes: { state?: unknown } | undefined
): string | undefined {
  const state = attributes?.state as AttributesState | undefined;
  if (!state?.visualization || !state?.datasourceStates) return undefined;

  const layers = state.visualization.layers;
  if (!layers?.length) return undefined;

  let layerId: string | undefined;
  let columnId: string | undefined;

  for (const layer of layers) {
    const firstSplit = layer.splitAccessors?.[0] ?? layer.primaryGroups?.[0];
    if (firstSplit) {
      layerId = layer.layerId;
      columnId = firstSplit;
      break;
    }
  }

  if (!layerId || !columnId) return undefined;

  const dsStates = state.datasourceStates;
  const dsState = dsStates.formBased ?? dsStates.indexpattern;
  const dsLayers = dsState?.layers;
  const columns = dsLayers?.[layerId]?.columns;
  const column = columns?.[columnId];
  if (!column) return undefined;
  // Prefer the raw field name (sourceField) over the full breakdown label (e.g. "Top 5 values of X")
  return column.sourceField ?? column.label;
}

/**
 * Returns the first breakdown/split dimension layer info for formBased datasource,
 * for use when listing or changing the breakdown field (e.g. Smart Title popover).
 * Resolves indexPatternId from the layer when present, or from attributes.references
 * when the state is persisted (saved/by-reference) and layer has no indexPatternId.
 */
export function getBreakdownLayerInfo(
  attributes:
    | {
        state?: unknown;
        references?: Array<{ type?: string; id?: string; name?: string }>;
      }
    | undefined
): BreakdownLayerInfo | undefined {
  const state = attributes?.state as AttributesState | undefined;
  if (!state?.visualization || !state?.datasourceStates) return undefined;

  const layers = state.visualization.layers;
  if (!layers?.length) return undefined;

  const dsStates = state.datasourceStates;
  const dsState = dsStates.formBased ?? dsStates.indexpattern;
  const dsLayers = dsState?.layers;
  if (!dsLayers) return undefined;

  const references = attributes?.references ?? [];

  for (const layer of layers) {
    const firstSplit = layer.splitAccessors?.[0] ?? layer.primaryGroups?.[0];
    if (firstSplit) {
      const layerId = layer.layerId ?? '';
      const layerState = dsLayers[layerId];
      let indexPatternId = layerState?.indexPatternId;
      if (!indexPatternId && layerId) {
        indexPatternId = references.find(
          (ref) => ref.name === getLayerReferenceName(layerId)
        )?.id;
      }
      if (layerId && firstSplit && indexPatternId) {
        return { layerId, columnId: firstSplit, indexPatternId };
      }
      break;
    }
  }
  return undefined;
}

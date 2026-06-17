/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LensPartitionVisualizationState } from '@kbn/lens-common';
import { PARTITION_EMPTY_SIZE_RADIUS } from '@kbn/lens-common';
import type { PieConfig } from '@kbn/lens-embeddable-utils/config_builder/schema/charts/pie';
import type { VizStateAdapter } from './types';
import { flattenToDotPaths, unflattenFromDotPaths } from './dot_path_helpers';

// Maps between API donut_hole values and internal emptySizeRatio numbers
const DONUT_HOLE_TO_RATIO: Record<string, number> = {
  s: PARTITION_EMPTY_SIZE_RADIUS.SMALL,
  m: PARTITION_EMPTY_SIZE_RADIUS.MEDIUM,
  l: PARTITION_EMPTY_SIZE_RADIUS.LARGE,
};
const RATIO_TO_DONUT_HOLE = new Map(Object.entries(DONUT_HOLE_TO_RATIO).map(([k, v]) => [v, k]));

function stateToApiFormat(state: LensPartitionVisualizationState): Record<string, unknown> {
  const layer = state.layers[0];
  const result: Record<string, unknown> = {};

  // Styling — values
  if (layer.numberDisplay === 'hidden') {
    result.styling = { values: { visible: false } };
  } else {
    const values: Record<string, unknown> = { visible: true };
    if (layer.numberDisplay === 'percent') values.mode = 'percentage';
    else if (layer.numberDisplay === 'value') values.mode = 'absolute';
    if (layer.percentDecimals != null) values.percent_decimals = layer.percentDecimals;
    result.styling = { values };
  }

  // Pie-specific styling
  if (state.shape === 'pie' || state.shape === 'donut') {
    const styling = result.styling as Record<string, unknown>;
    // Labels
    if (layer.categoryDisplay === 'hide') {
      styling.labels = { visible: false };
    } else if (layer.categoryDisplay === 'inside') {
      styling.labels = { visible: true, position: 'inside' };
    } else {
      styling.labels = { visible: true, position: 'outside' };
    }
    // Donut hole
    const donutHole = RATIO_TO_DONUT_HOLE.get(layer.emptySizeRatio!);
    if (donutHole) {
      styling.donut_hole = donutHole;
    } else if (state.shape === 'pie') {
      styling.donut_hole = 'none';
    }
  }

  // Treemap labels
  if (state.shape === 'treemap') {
    const styling = result.styling as Record<string, unknown>;
    styling.labels = { visible: layer.categoryDisplay !== 'hide' };
  }

  // Legend
  const legend: Record<string, unknown> = {};
  if (layer.legendDisplay === 'default') legend.visibility = 'auto';
  else if (layer.legendDisplay === 'show') legend.visibility = 'visible';
  else if (layer.legendDisplay === 'hide') legend.visibility = 'hidden';
  if (layer.nestedLegend != null && state.shape !== 'waffle') legend.nested = layer.nestedLegend;
  if (layer.legendSize != null) legend.size = layer.legendSize;
  if (layer.truncateLegend && layer.legendMaxLines != null) {
    legend.truncate_after_lines = layer.legendMaxLines;
  }
  if (Object.keys(legend).length > 0) result.legend = legend;

  return result;
}

function apiToState(
  currentState: LensPartitionVisualizationState,
  apiConfig: Record<string, unknown>
): LensPartitionVisualizationState {
  const styling = apiConfig.styling as PieConfig['styling'];
  const legendConfig = apiConfig.legend as PieConfig['legend'];
  const layer = { ...currentState.layers[0] };

  // Values
  if (styling?.values) {
    if (styling.values.visible === false) {
      layer.numberDisplay = 'hidden';
    } else if (styling.values.mode === 'percentage') {
      layer.numberDisplay = 'percent';
    } else if (styling.values.mode === 'absolute') {
      layer.numberDisplay = 'value';
    } else {
      layer.numberDisplay = 'percent';
    }
    if (styling.values.percent_decimals != null) {
      layer.percentDecimals = styling.values.percent_decimals;
    }
  }

  // Labels (pie/treemap)
  if (styling && 'labels' in styling && styling.labels) {
    const labels = styling.labels as { visible?: boolean; position?: string };
    if (labels.visible === false) {
      layer.categoryDisplay = 'hide';
    } else if (labels.position === 'inside') {
      layer.categoryDisplay = 'inside';
    } else {
      layer.categoryDisplay = 'default';
    }
  }

  // Donut hole
  let newShape = currentState.shape;
  if (styling && 'donut_hole' in styling) {
    const donutHole = (styling as { donut_hole?: string }).donut_hole;
    if (donutHole && donutHole !== 'none') {
      layer.emptySizeRatio = DONUT_HOLE_TO_RATIO[donutHole] ?? PARTITION_EMPTY_SIZE_RADIUS.SMALL;
      newShape = 'donut';
    } else {
      layer.emptySizeRatio = undefined;
      if (currentState.shape === 'donut') newShape = 'pie';
    }
  }

  // Legend
  if (legendConfig) {
    if (legendConfig.visibility === 'auto') layer.legendDisplay = 'default';
    else if (legendConfig.visibility === 'visible') layer.legendDisplay = 'show';
    else if (legendConfig.visibility === 'hidden') layer.legendDisplay = 'hide';
    if (legendConfig.nested != null) layer.nestedLegend = legendConfig.nested;
    if (legendConfig.size != null) layer.legendSize = legendConfig.size as typeof layer.legendSize;
    if (legendConfig.truncate_after_lines != null) {
      layer.truncateLegend = true;
      layer.legendMaxLines = legendConfig.truncate_after_lines;
    }
  }

  return { ...currentState, shape: newShape, layers: [layer] };
}

export const partitionStateAdapter: VizStateAdapter<LensPartitionVisualizationState> = {
  stateToFormValues(state) {
    return flattenToDotPaths(stateToApiFormat(state));
  },

  formValuesToState(currentState, formValues) {
    const apiConfig = unflattenFromDotPaths(formValues);
    return apiToState(currentState, apiConfig);
  },
};

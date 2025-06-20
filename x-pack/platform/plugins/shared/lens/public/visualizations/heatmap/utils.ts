/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { applyPaletteParams, type PaletteRegistry } from '@kbn/coloring';
import type { Datatable } from '@kbn/expressions-plugin/common';
import {
  type HeatmapVisualizationState,
  LENS_HEATMAP_DEFAULT_PALETTE_NAME,
} from '@kbn/visualizations-plugin/common';
import { findMinMaxByColumnId } from '../../shared_components';

export function getSafePaletteParams(
  paletteService: PaletteRegistry,
  currentData: Datatable | undefined,
  accessor: string | undefined,
  activePalette?: HeatmapVisualizationState['palette']
) {
  if (currentData == null || accessor == null) {
    return { displayStops: [], activePalette };
  }
  const finalActivePalette: Palette = activePalette ?? {
    type: 'palette',
    name: LENS_HEATMAP_DEFAULT_PALETTE_NAME,
    accessor,
  };
  const minMaxByColumnId = findMinMaxByColumnId([accessor], currentData);
  const currentMinMax = minMaxByColumnId.get(accessor) ?? {
    max: Number.NEGATIVE_INFINITY,
    min: Number.POSITIVE_INFINITY,
  };

  // need to tell the helper that the colorStops are required to display
  return {
    displayStops: applyPaletteParams(paletteService, finalActivePalette, currentMinMax),
    currentMinMax,
    activePalette: finalActivePalette,
  };
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DatatableVisualizationState, RowHeightMode } from '@kbn/lens-common';
import { LENS_DATAGRID_DENSITY, LENS_ROW_HEIGHT_MODE } from '@kbn/lens-common';
import type { VizStateAdapter } from './types';
import { flattenToDotPaths, unflattenFromDotPaths } from './dot_path_helpers';

// ── Internal State → API Format ──

const buildHeightAPI = (
  type: 'value' | 'header',
  heightMode?: RowHeightMode,
  heightLines?: number
) => {
  if (!heightMode && !heightLines) return undefined;
  if (heightMode === LENS_ROW_HEIGHT_MODE.auto) return { type: LENS_ROW_HEIGHT_MODE.auto };
  const lines = heightLines ?? 1;
  return type === 'value'
    ? { type: LENS_ROW_HEIGHT_MODE.custom, lines }
    : { type: LENS_ROW_HEIGHT_MODE.custom, max_lines: lines };
};

const stateToAPIStyling = (state: DatatableVisualizationState): Record<string, unknown> => {
  const styling: Record<string, unknown> = {};

  // Density
  const { density, rowHeight, rowHeightLines, headerRowHeight, headerRowHeightLines } = state;
  if (density || rowHeight || headerRowHeight || rowHeightLines || headerRowHeightLines) {
    const densityObj: Record<string, unknown> = {};
    if (density) {
      densityObj.mode = density === LENS_DATAGRID_DENSITY.NORMAL ? 'default' : density;
    }
    const valueHeight = buildHeightAPI('value', rowHeight, rowHeightLines);
    const headerHeight = buildHeightAPI('header', headerRowHeight, headerRowHeightLines);
    if (valueHeight || headerHeight) {
      const height: Record<string, unknown> = {};
      if (valueHeight) height.value = valueHeight;
      if (headerHeight) height.header = headerHeight;
      densityObj.height = height;
    }
    styling.density = densityObj;
  }

  // Paging
  if (state.paging?.enabled) {
    const validSizes = [10, 20, 30, 50, 100];
    styling.paging = validSizes.includes(state.paging.size) ? state.paging.size : 10;
  }

  // Row numbers
  if (state.showRowNumbers != null) {
    styling.row_numbers = { visible: state.showRowNumbers };
  }

  return Object.keys(styling).length > 0 ? { styling } : {};
};

// ── API Format → Internal State ──

interface APIStyling {
  styling?: {
    density?: {
      mode?: string;
      height?: {
        header?: { type: string; max_lines?: number };
        value?: { type: string; lines?: number };
      };
    };
    paging?: number;
    row_numbers?: { visible: boolean };
    sort_by?: unknown;
  };
}

const apiToStylingState = (
  api: APIStyling
): Partial<
  Pick<
    DatatableVisualizationState,
    | 'density'
    | 'rowHeight'
    | 'rowHeightLines'
    | 'headerRowHeight'
    | 'headerRowHeightLines'
    | 'paging'
    | 'showRowNumbers'
  >
> => {
  const result: Record<string, unknown> = {};
  const s = api.styling;
  if (!s) return result;

  // Density
  if (s.density?.mode) {
    result.density = s.density.mode === 'default' ? LENS_DATAGRID_DENSITY.NORMAL : s.density.mode;
  }
  if (s.density?.height?.header?.type) {
    result.headerRowHeight = s.density.height.header.type as RowHeightMode;
    if (s.density.height.header.type === 'custom' && s.density.height.header.max_lines != null) {
      result.headerRowHeightLines = s.density.height.header.max_lines;
    }
  }
  if (s.density?.height?.value?.type) {
    result.rowHeight = s.density.height.value.type as RowHeightMode;
    if (s.density.height.value.type === 'custom' && s.density.height.value.lines != null) {
      result.rowHeightLines = s.density.height.value.lines;
    }
  }

  // Paging
  if (s.paging != null) {
    result.paging = { size: s.paging, enabled: true };
  }

  // Row numbers
  if (s.row_numbers != null) {
    result.showRowNumbers = s.row_numbers.visible;
  }

  return result;
};

export const datatableStateAdapter: VizStateAdapter<DatatableVisualizationState> = {
  stateToFormValues(state) {
    const apiFormat = stateToAPIStyling(state);
    return flattenToDotPaths(apiFormat);
  },

  formValuesToState(currentState, formValues) {
    const apiConfig = unflattenFromDotPaths(formValues) as APIStyling;
    const stylingState = apiToStylingState(apiConfig);
    return { ...currentState, ...stylingState };
  },
};

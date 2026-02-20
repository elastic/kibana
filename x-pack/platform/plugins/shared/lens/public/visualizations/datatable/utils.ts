/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ColorMapping,
  ColorStop,
  CustomPaletteParams,
  DataBounds,
  PaletteOutput,
  PaletteRegistry,
} from '@kbn/coloring';
import { DEFAULT_COLOR_MAPPING_CONFIG, getFallbackDataBounds } from '@kbn/coloring';
import { getOriginalId } from '@kbn/transpose-utils';
import type { Datatable } from '@kbn/expressions-plugin/common';
import type { DatasourcePublicAPI, DatatableVisualizationState } from '@kbn/lens-common';
import { getDatatableColumn } from '../../../common/expressions/impl/datatable/utils';
import {
  findMinMaxByColumnId,
  getAccessorType,
  getColorByValuePalette,
} from '../../shared_components';

export function getColumnAlignment<C extends { alignment?: 'left' | 'right' | 'center' }>(
  { alignment }: C,
  isNumeric = false
): 'left' | 'right' | 'center' {
  if (alignment) return alignment;
  return isNumeric ? 'right' : 'left';
}

export function detectColorConfigMismatch({
  colorByTerms,
  palette,
  colorMapping,
}: {
  colorByTerms: boolean;
  palette?: PaletteOutput<{ stops?: ColorStop[] | number[] }>;
  colorMapping?: ColorMapping.Config | string;
}) {
  const isValueBasedPalette = Boolean(palette?.params?.stops?.length);

  return {
    hasColorMappingOnNumeric: !colorByTerms && colorMapping != null,
    hasValuePaletteOnBucket: colorByTerms && isValueBasedPalette,
  };
}

/**
 * Resolves the column IDs for a given accessor
 */
function getColumnIds(
  accessor: string,
  currentData?: Datatable,
  stateColumns?: Array<{ isTransposed?: boolean }>
): string[] {
  const hasTransposedColumn = stateColumns?.some(({ isTransposed }) => isTransposed);
  if (!hasTransposedColumn) return [accessor];
  return (
    currentData?.columns.filter(({ id }) => getOriginalId(id) === accessor).map(({ id }) => id) ??
    []
  );
}

/**
 * Gets data bounds for an accessor
 */
export function getDataBoundsForAccessor(
  accessor: string,
  currentData?: Datatable,
  stateColumns?: Array<{ isTransposed?: boolean }>
): DataBounds | undefined {
  const columnsToCheck = getColumnIds(accessor, currentData, stateColumns);
  const minMaxByColumnId = findMinMaxByColumnId(columnsToCheck, currentData);
  return minMaxByColumnId.get(accessor);
}

/**
 * Resolves effective color configuration for a column by detecting mismatches
 * between the stored config type (terms vs values) and the column's actual type,
 * then applying correct defaults when needed
 */
export function resolveColorDefaults({
  colorByTerms,
  palette,
  colorMapping,
  paletteService,
  dataBounds,
}: {
  colorByTerms: boolean;
  palette?: PaletteOutput<CustomPaletteParams>;
  colorMapping?: ColorMapping.Config;
  paletteService: PaletteRegistry;
  dataBounds: DataBounds;
}): {
  palette: PaletteOutput<CustomPaletteParams> | undefined;
  colorMapping: ColorMapping.Config | undefined;
  hasMismatch: boolean;
} {
  const { hasColorMappingOnNumeric, hasValuePaletteOnBucket } = detectColorConfigMismatch({
    colorByTerms,
    palette,
    colorMapping,
  });
  const hasMismatch = hasColorMappingOnNumeric || hasValuePaletteOnBucket;
  const needsDefaults = (!palette && !colorMapping) || hasMismatch;

  if (!needsDefaults) {
    return { palette, colorMapping, hasMismatch: false };
  }

  if (colorByTerms) {
    return { palette: undefined, colorMapping: DEFAULT_COLOR_MAPPING_CONFIG, hasMismatch };
  }

  const { palette: defaultPalette } = getColorByValuePalette(paletteService, dataBounds);
  return { palette: defaultPalette, colorMapping: undefined, hasMismatch };
}

export function getFixedColorConfiguration(
  state: DatatableVisualizationState,
  datasourceLayer: DatasourcePublicAPI,
  paletteService: PaletteRegistry,
  currentData?: Datatable
) {
  if (!currentData || state.columns.length === 0) {
    return undefined;
  }

  const normalizedColumns = state.columns.map((column) => {
    const { colorMapping, palette, colorMode } = column;

    if (!colorMode || colorMode === 'none') {
      return column;
    }

    const columnMeta = getDatatableColumn(currentData, column.columnId)?.meta;
    const { isCategory: isBucketable } = getAccessorType(
      datasourceLayer,
      column.columnId,
      columnMeta?.type
    );
    const dataBounds =
      getDataBoundsForAccessor(column.columnId, currentData, state.columns) ??
      getFallbackDataBounds();

    const {
      palette: resolvedPalette,
      colorMapping: resolvedColorMapping,
      hasMismatch,
    } = resolveColorDefaults({
      colorByTerms: isBucketable,
      palette,
      colorMapping,
      paletteService,
      dataBounds,
    });

    if (hasMismatch) {
      return { ...column, palette: resolvedPalette, colorMapping: resolvedColorMapping };
    }

    return column;
  });

  const hasChanges = normalizedColumns.some(
    (col, i) =>
      col.colorMapping !== state.columns[i].colorMapping || col.palette !== state.columns[i].palette
  );

  return hasChanges ? { ...state, columns: normalizedColumns } : undefined;
}

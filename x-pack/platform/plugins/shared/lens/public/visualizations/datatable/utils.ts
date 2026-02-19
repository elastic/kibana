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
import { DEFAULT_COLOR_MAPPING_CONFIG } from '@kbn/coloring';
import { getOriginalId } from '@kbn/transpose-utils';
import type { Datatable } from '@kbn/expressions-plugin/common';
import { findMinMaxByColumnId, getColorByValuePalette } from '../../shared_components';

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

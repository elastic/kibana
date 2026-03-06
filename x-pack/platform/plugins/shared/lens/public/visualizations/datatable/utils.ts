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
import { applyPaletteParams, CUSTOM_PALETTE, DEFAULT_COLOR_MAPPING_CONFIG } from '@kbn/coloring';
import { getOriginalId } from '@kbn/transpose-utils';
import type { Datatable } from '@kbn/expressions-plugin/common';
import { defaultPaletteParams, findMinMaxByColumnId } from '../../shared_components';

export function getColumnAlignment<C extends { alignment?: 'left' | 'right' | 'center' }>(
  { alignment }: C,
  isNumeric = false
): 'left' | 'right' | 'center' {
  if (alignment) return alignment;
  return isNumeric ? 'right' : 'left';
}

export function hasIncompatibleColorConfig({
  colorByTerms,
  palette,
  colorMapping,
}: {
  colorByTerms: boolean;
  palette?: PaletteOutput<{ stops?: ColorStop[] | number[] }>;
  colorMapping?: ColorMapping.Config | string;
}): boolean {
  const isValueBasedPalette = Boolean(palette?.params?.stops?.length);
  const hasColorMappingOnNumeric = !colorByTerms && colorMapping != null;
  // To avoid warnings on current SOs with both palette and color mapping defined, we need to check if the palette is value based and if the color mapping is not defined.
  const hasValuePaletteOnBucket = colorByTerms && isValueBasedPalette && !colorMapping;
  return hasColorMappingOnNumeric || hasValuePaletteOnBucket;
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

export function getColorByValuePalette(
  paletteService: PaletteRegistry,
  dataBounds: DataBounds,
  existingPalette?: PaletteOutput<CustomPaletteParams>
): PaletteOutput<CustomPaletteParams> {
  // Use existing palette or create default
  const activePalette: PaletteOutput<CustomPaletteParams> = existingPalette
    ? {
        type: 'palette',
        name: existingPalette.name,
        params: { ...existingPalette.params },
      }
    : {
        type: 'palette',
        name: defaultPaletteParams.name,
        params: { ...defaultPaletteParams },
      };

  const computedStops = applyPaletteParams(paletteService, activePalette, dataBounds);

  // For non-custom palettes -> update the stops with computed values
  if (activePalette.name !== CUSTOM_PALETTE) {
    activePalette.params = {
      ...activePalette.params,
      stops: computedStops,
    };
  }

  return activePalette;
}

/**
 * Applies correct default color configuration
 */
export function getColorDefaults({
  colorByTerms,
  paletteService,
  dataBounds,
}: {
  colorByTerms: boolean;
  paletteService: PaletteRegistry;
  dataBounds: DataBounds;
}): {
  palette: PaletteOutput<CustomPaletteParams> | undefined;
  colorMapping: ColorMapping.Config | undefined;
} {
  if (colorByTerms) {
    return {
      palette: undefined,
      colorMapping: DEFAULT_COLOR_MAPPING_CONFIG,
    };
  }

  const palette = getColorByValuePalette(paletteService, dataBounds);
  return { palette, colorMapping: undefined };
}

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
import {
  applyPaletteParams,
  CUSTOM_PALETTE,
  DEFAULT_COLOR_MAPPING_CONFIG,
  hasPaletteStops,
} from '@kbn/coloring';
import { euiThemeVars } from '@kbn/ui-theme';
import { getOriginalId } from '@kbn/transpose-utils';
import type { Datatable } from '@kbn/expressions-plugin/common';
import type {
  ColumnCellDecorationMode,
  DecorationFillMode,
  DecorationFillConfig,
  DecorationValueRange,
} from '@kbn/lens-common';
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
  const isValueBasedPalette = hasPaletteStops(palette);
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

  // For non-custom palettes -> update the stops with computed values
  if (activePalette.name !== CUSTOM_PALETTE) {
    const computedStops = applyPaletteParams(paletteService, activePalette, dataBounds);

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

/** Default single-bar fill color: Datavis Color 2 (per elastic/kibana#250708). */
export const DEFAULT_PROGRESS_BAR_COLOR = euiThemeVars.euiColorVis2;

/**
 * Returns the default fill color a decoration should seed when none is set, or
 * `undefined` when the decoration has no opinion (falling back to the existing
 * palette/contrast defaults).
 *
 * Centralizes per-decoration defaults so each mode dictates its own default from
 * a single code path. Only `progress` seeds an explicit color today.
 */
export function getDecorationDefaultColor(colorMode: ColumnCellDecorationMode): string | undefined {
  switch (colorMode) {
    case 'progress':
      return DEFAULT_PROGRESS_BAR_COLOR;
    default:
      return undefined;
  }
}

/**
 * Seeds a fresh fill config for a decoration. Applied only when a column has no
 * existing `fillStyle`, so persisted values are never overridden.
 */
export function getDefaultFillConfig(
  colorMode: ColumnCellDecorationMode = 'progress'
): DecorationFillConfig {
  return {
    fillMode: 'single',
    color: getDecorationDefaultColor(colorMode),
    valueRange: { mode: 'auto' },
  };
}

export function isPaletteFillMode(fillMode: DecorationFillMode): boolean {
  return fillMode === 'solid' || fillMode === 'gradient';
}

/**
 * Resolves the bar domain `[min, max]` for a decorated column.
 *
 * - `auto`: uses the loaded column data bounds (baseline stays at `0`).
 * - `custom`: uses the explicit bounds. For solid/gradient the custom bounds live
 *   on `palette.params.rangeMin`/`rangeMax`; for single they live on
 *   `fillStyle.valueRange`. Either store is honored here so callers don't branch.
 *
 * Returns bounds already widened to include the `0` baseline so signed columns keep
 * a stable zero anchor.
 */
export interface DecorationColumnLike {
  fillStyle?: DecorationFillConfig;
  // Accepts either editor (`CustomPaletteParams`) or render (`CustomPaletteState`)
  // palette params; only the numeric range bounds are read here.
  palette?: { params?: { rangeMin?: number; rangeMax?: number } };
}

export function getProgressBarDomain(
  column: DecorationColumnLike,
  dataBounds: DataBounds
): { min: number; max: number } {
  const fillStyle = column.fillStyle;
  // Single fills own their custom range on `fillStyle.valueRange`; solid/gradient
  // mirror it onto the palette params. Only consult the palette for palette fills
  // so a stale `rangeMin/rangeMax` left over from a prior mode can't leak in.
  const usesPalette = fillStyle != null && isPaletteFillMode(fillStyle.fillMode);
  const paletteParams = usesPalette ? column.palette?.params : undefined;
  // Open-ended continuities store `±Infinity`; treat those as "unbounded" so they
  // don't count as an explicit custom bound and don't leak into the domain.
  const paletteRangeMin = finiteOr(paletteParams?.rangeMin, NaN);
  const paletteRangeMax = finiteOr(paletteParams?.rangeMax, NaN);
  const isCustom =
    fillStyle?.valueRange?.mode === 'custom' ||
    (usesPalette && (!Number.isNaN(paletteRangeMin) || !Number.isNaN(paletteRangeMax)));

  let min: number;
  let max: number;

  if (isCustom) {
    min = finiteOr(fillStyle?.valueRange?.min, finiteOr(paletteRangeMin, dataBounds.min));
    max = finiteOr(fillStyle?.valueRange?.max, finiteOr(paletteRangeMax, dataBounds.max));
  } else {
    min = dataBounds.min;
    max = dataBounds.max;
  }

  // Final guard against any remaining non-finite bounds from corrupt config.
  if (!Number.isFinite(min)) min = dataBounds.min;
  if (!Number.isFinite(max)) max = dataBounds.max;

  // Normalize an inverted custom range so the bar fill direction stays correct.
  if (min > max) {
    [min, max] = [max, min];
  }

  // Keep zero inside the domain so the baseline (0) stays a stable anchor.
  min = Math.min(min, 0);
  max = Math.max(max, 0);

  // Guard against a degenerate domain.
  if (min === max) {
    max = min + 1;
  }

  return { min, max };
}

/**
 * Resolves the palette color stops (domain-valued `{ color, stop }[]`) for a
 * solid/gradient progress bar.
 *
 * The serialized expression palette only carries explicit `stops` for the
 * `custom` palette; the default by-value palette serializes empty `stops`, so the
 * stops must be recomputed from the palette service against the data bounds —
 * mirroring how cell/text coloring resolves its default palette at render time.
 */
export function getProgressBarPaletteStops(
  paletteService: PaletteRegistry,
  dataBounds: DataBounds,
  colors?: string[],
  stops?: number[]
): Array<{ color: string; stop: number }> {
  if (colors?.length && stops?.length) {
    return colors.reduce<Array<{ color: string; stop: number }>>((acc, color, index) => {
      const stop = stops[index];
      if (stop != null) acc.push({ color, stop });
      return acc;
    }, []);
  }

  // No usable serialized stops (default palette): recompute domain-valued stops.
  const defaultPalette = getColorByValuePalette(paletteService, dataBounds);
  return defaultPalette.params?.stops ?? [];
}

/**
 * Returns `value` when it is a finite number, otherwise `fallback`.
 *
 * Open-ended palette continuities store `rangeMin`/`rangeMax` as
 * `±Infinity`, which are not caught by `??` (they are defined). Treating them as
 * "unbounded" and falling back to the data bounds keeps the editor's range
 * controls finite and on-grid.
 */
function finiteOr(value: number | undefined, fallback: number): number {
  return value != null && Number.isFinite(value) ? value : fallback;
}

/**
 * Custom value range bounds for the editor's dual-range control, reading from the
 * palette params (solid/gradient) or the dedicated single-fill field.
 *
 * Bounds are always returned as finite numbers: unset or open-ended (`±Infinity`)
 * palette ranges collapse to the loaded data bounds so the range slider never
 * receives a non-finite `min`/`max`/`value`.
 */
export function getDecorationCustomRange(
  column: DecorationColumnLike,
  dataBounds: DataBounds
): DecorationValueRange {
  const { fillStyle, palette } = column;
  if (!fillStyle) {
    return { mode: 'auto' };
  }

  if (isPaletteFillMode(fillStyle.fillMode)) {
    const mode = fillStyle.valueRange?.mode ?? 'auto';
    return {
      mode,
      min: finiteOr(palette?.params?.rangeMin, dataBounds.min),
      max: finiteOr(palette?.params?.rangeMax, dataBounds.max),
    };
  }

  return {
    mode: fillStyle.valueRange?.mode ?? 'auto',
    min: finiteOr(fillStyle.valueRange?.min, dataBounds.min),
    max: finiteOr(fillStyle.valueRange?.max, dataBounds.max),
  };
}

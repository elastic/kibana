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
import type { CustomPaletteState } from '@kbn/charts-plugin/common';
import { getOriginalId } from '@kbn/transpose-utils';
import type { Datatable } from '@kbn/expressions-plugin/common';
import {
  COLUMN_CELL_DECORATION_MODE,
  type CellDecorationFillConfig,
  type CellDecorationFillMode,
  type CellDecorationValueRange,
  type ColumnCellDecorationMode,
} from '@kbn/lens-common';
import { defaultPaletteParams, findMinMaxByColumnId } from '../../shared_components';
import { getCellDecorationCapabilities, isAlignmentSupported } from './cell_decoration';

type ProgressBarPaletteParams =
  | Pick<CustomPaletteParams, 'continuity' | 'rangeType' | 'steps' | 'stops'>
  | Pick<CustomPaletteState, 'continuity' | 'range' | 'colors' | 'stops'>;

type ProgressBarPalette = PaletteOutput<ProgressBarPaletteParams>;
type ProgressBarPaletteStopInput =
  | number
  | Pick<ColorStop, 'stop'>
  | Pick<ColorStop, 'color' | 'stop'>;

export function getColumnAlignment<C extends { alignment?: 'left' | 'right' | 'center' }>(
  { alignment }: C,
  isNumeric = false
): 'left' | 'right' | 'center' {
  if (alignment) return alignment;
  return isNumeric ? 'right' : 'left';
}

export function getSupportedColumnAlignment<
  C extends {
    alignment?: 'left' | 'right' | 'center';
    colorMode?: ColumnCellDecorationMode;
  }
>(column: C, isNumeric = false): 'left' | 'right' | 'center' {
  const currentAlignment = getColumnAlignment(column, isNumeric);
  const colorMode = column.colorMode ?? COLUMN_CELL_DECORATION_MODE.NONE;
  const decoration = getCellDecorationCapabilities(colorMode);

  return isAlignmentSupported(colorMode, currentAlignment)
    ? currentAlignment
    : decoration.defaultAlignment ?? currentAlignment;
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

/**
 * Progress bars default to the same palette family the user currently gets when
 * manually switching a numeric color mapping to `Status`. We seed only the
 * palette name here and let the shared coloring helpers derive the rest from
 * the live data bounds, preserving the existing default step count and stop
 * distribution for that manual path.
 */
export function getDefaultProgressPalette(): PaletteOutput<CustomPaletteParams> {
  return {
    type: 'palette',
    name: 'status',
  };
}

// Per-decoration defaults live in the cell-decoration capability registry; these
// re-exports keep the existing `../utils` import surface stable for consumers.
export { DEFAULT_PROGRESS_BAR_COLOR, getDecorationDefaultColor } from './cell_decoration';

/**
 * Seeds a fresh fill config for a decoration. Applied only when a column has no
 * existing `fillStyle`, so persisted values are never overridden.
 *
 * The fill mode and color are taken from the decoration's capabilities, so each
 * decoration dictates its own seed from a single source of truth.
 */
export function getDefaultFillConfig(
  colorMode: ColumnCellDecorationMode = COLUMN_CELL_DECORATION_MODE.PROGRESS
): CellDecorationFillConfig {
  const { defaultFillMode, defaultColor } = getCellDecorationCapabilities(colorMode);
  return {
    fillMode: defaultFillMode ?? 'single',
    color: defaultColor,
    valueRange: { mode: 'auto' },
  };
}

export function isPaletteFillMode(fillMode: CellDecorationFillMode): boolean {
  return fillMode === 'solid' || fillMode === 'gradient';
}

/**
 * Resolves the bar domain `[min, max]` for a decorated column.
 *
 * - `auto`: uses the loaded column data bounds as-is, except a flat all-positive
 *   or all-negative series anchors back to zero so a constant non-zero value does
 *   not render as an empty bar.
 * - `custom`: uses the explicit bounds. `fillStyle.valueRange` is the primary
 *   source; legacy/API columns can still fall back to palette range bounds.
 */
export interface DecorationColumnLike {
  fillStyle?: CellDecorationFillConfig;
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
  // `fillStyle.valueRange.mode` is the source of truth: an explicit `auto`
  // recomputes from the data bounds regardless of any stale `rangeMin/rangeMax`
  // left on the palette (range retention keeps the last custom bounds around).
  // Only when no explicit mode is set (legacy / as-code columns) does the mere
  // presence of a finite palette range read as custom.
  const rangeMode = fillStyle?.valueRange?.mode;
  const isCustom =
    rangeMode === 'custom' ||
    (rangeMode == null &&
      usesPalette &&
      (!Number.isNaN(paletteRangeMin) || !Number.isNaN(paletteRangeMax)));

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

  // Auto ranges anchor a flat positive/negative series back to zero so a
  // constant non-zero value still renders with visible fill.
  if (min === max) {
    if (!isCustom) {
      if (min > 0) {
        min = 0;
      } else if (max < 0) {
        max = 0;
      } else {
        max = min + 1;
      }
    } else {
      max = min + 1;
    }
  }

  return { min, max };
}

/**
 * Resolves the palette color stops (domain-valued `{ color, stop }[]`) for a
 * solid/gradient progress bar.
 *
 * The expression serializes the resolved palette `colors` for every palette, but
 * only carries explicit numeric `stops` for the `custom` palette; predefined
 * (by-name) palettes serialize empty `stops`. So the resolution order is:
 *
 * 1. `colors` + matching `stops` → convert explicit stop bounds into visible
 *    meter stop starts inside the active progress-bar domain.
 * 2. `colors` only → distribute those colors evenly across the data bounds, so
 *    the user's chosen palette is honored rather than discarded.
 * 3. named `palette` only → resolve that palette's colors from the service and
 *    spread them across the selected progress-bar bounds.
 * 4. nothing usable → fall back to the default progress palette colors.
 */
export function getProgressBarPaletteStops(
  paletteService: PaletteRegistry,
  dataBounds: DataBounds,
  palette?: ProgressBarPalette,
  colors?: string[],
  stops?: ProgressBarPaletteStopInput[]
): Array<{ color: string; stop: number }> {
  const explicitPaletteStops = resolveExplicitProgressBarPaletteStops(
    dataBounds,
    palette,
    colors,
    stops
  );
  if (explicitPaletteStops.length) {
    return explicitPaletteStops;
  }

  // Predefined palettes serialize their resolved colors but omit numeric stops.
  // Spread those colors evenly across the domain so the selected palette drives
  // the bar instead of silently falling back to the default palette.
  if (colors?.length) {
    return distributeColorsAcrossDomain(colors, dataBounds);
  }

  const resolvedPaletteColors = resolveProgressBarPaletteColors(paletteService, palette);
  if (resolvedPaletteColors?.length) {
    return distributeColorsAcrossDomain(resolvedPaletteColors, dataBounds);
  }

  const fallbackColors = resolveProgressBarPaletteColors(
    paletteService,
    getDefaultProgressPalette()
  );
  return fallbackColors ? distributeColorsAcrossDomain(fallbackColors, dataBounds) : [];
}

/**
 * Builds a stepped custom-palette state for solid progress-bar fills.
 *
 * `Meter` consumes lower-bound stop starts, but `getColorForValue` expects
 * upper bounds where each color stops applying. The first lower-bound stop
 * always anchors at the active domain start, so solid lookups drop that anchor
 * and keep the remaining stop values as the palette's upper bounds.
 */
export function getSolidProgressBarPaletteState(
  paletteService: PaletteRegistry,
  dataBounds: DataBounds,
  palette?: ProgressBarPalette,
  colors?: string[],
  stops?: ProgressBarPaletteStopInput[]
): CustomPaletteState {
  const lowerBoundStops = getProgressBarPaletteStops(
    paletteService,
    dataBounds,
    palette,
    colors,
    stops
  );

  return {
    colors: lowerBoundStops.map(({ color }) => color),
    gradient: false,
    stops: lowerBoundStops.slice(1).map(({ stop }) => stop),
    range: 'number',
    rangeMin: dataBounds.min,
    rangeMax: dataBounds.max,
    continuity: palette?.params?.continuity,
  };
}

/**
 * Spreads palette `colors` across `[min, max]` as evenly spaced lower-bound
 * stops (the first stop anchors at `min`). A single color collapses to one stop
 * at `min`, yielding a flat fill in that color.
 */
function distributeColorsAcrossDomain(
  colors: string[],
  { min, max }: DataBounds
): Array<{ color: string; stop: number }> {
  if (colors.length === 1) {
    return [{ color: colors[0], stop: min }];
  }
  const span = max - min;
  const step = span / colors.length;
  return colors.map((color, index) => ({ color, stop: min + step * index }));
}

function resolveExplicitProgressBarPaletteStops(
  domain: DataBounds,
  palette: ProgressBarPalette | undefined,
  colors: string[] | undefined,
  stops: ProgressBarPaletteStopInput[] | undefined
): Array<{ color: string; stop: number }> {
  const explicitStops = toExplicitStopPairs(colors, stops);
  if (!explicitStops.length) {
    return [];
  }

  if (explicitStops.length === 1) {
    return [{ color: explicitStops[0].color, stop: domain.min }];
  }

  const rangeType = getProgressBarPaletteRangeType(palette);
  const upperBounds = explicitStops
    .map(({ color, stop }) => ({
      color,
      stop: toDomainStop(stop, domain, rangeType),
    }))
    .filter(({ stop }) => Number.isFinite(stop))
    .sort((left, right) => left.stop - right.stop);

  if (!upperBounds.length) {
    return [];
  }

  const firstVisibleStopIndex = upperBounds.findIndex(({ stop }) => stop > domain.min);
  const visibleColorIndex =
    firstVisibleStopIndex === -1 ? upperBounds.length - 1 : firstVisibleStopIndex;
  // Carry the first visible color back to the active domain start so cropped
  // custom ranges do not render a leading gap in the progress-bar preview.
  const visibleStops = [{ color: upperBounds[visibleColorIndex].color, stop: domain.min }];

  for (let index = visibleColorIndex + 1; index < upperBounds.length; index++) {
    const stop = upperBounds[index - 1].stop;
    if (stop <= domain.min || stop >= domain.max) {
      continue;
    }
    visibleStops.push({ color: upperBounds[index].color, stop });
  }

  return visibleStops;
}

function toExplicitStopPairs(
  colors: string[] | undefined,
  stops: ProgressBarPaletteStopInput[] | undefined
): Array<{ color: string; stop: number }> {
  return (stops ?? []).reduce<Array<{ color: string; stop: number }>>((acc, rawStop, index) => {
    const stop = typeof rawStop === 'number' ? rawStop : rawStop?.stop;
    const color =
      colors?.[index] ??
      (typeof rawStop === 'number' ? undefined : 'color' in rawStop ? rawStop.color : undefined);

    if (color != null && stop != null) {
      acc.push({ color, stop });
    }

    return acc;
  }, []);
}

function toDomainStop(
  stop: number,
  { min, max }: DataBounds,
  rangeType: CustomPaletteParams['rangeType']
): number {
  if (rangeType === 'number') {
    return stop;
  }

  return min + ((max - min) * stop) / 100;
}

function resolveProgressBarPaletteColors(
  paletteService: PaletteRegistry,
  palette?: ProgressBarPalette
): string[] | undefined {
  if (!palette || palette.name === CUSTOM_PALETTE) {
    return undefined;
  }

  const paletteParams = palette.params;
  if (paletteParams && 'colors' in paletteParams) {
    return paletteParams.colors;
  }

  const colorCount =
    paletteParams?.stops?.length ?? paletteParams?.steps ?? defaultPaletteParams.steps;

  return getColorByValuePalette(
    paletteService,
    { min: 0, max: 100 },
    {
      ...palette,
      params: {
        ...paletteParams,
        steps: colorCount,
      },
    }
  ).params?.stops?.map(({ color }) => color);
}

function getProgressBarPaletteRangeType(
  palette: ProgressBarPalette | undefined
): CustomPaletteParams['rangeType'] {
  const paletteParams = palette?.params;
  if (!paletteParams) {
    return 'percent';
  }

  return 'range' in paletteParams ? paletteParams.range : paletteParams.rangeType ?? 'percent';
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
): CellDecorationValueRange {
  const { fillStyle, palette } = column;
  if (!fillStyle) {
    return { mode: 'auto' };
  }

  if (isPaletteFillMode(fillStyle.fillMode)) {
    const mode = fillStyle.valueRange?.mode ?? 'auto';
    const hasExplicitValueRange =
      Number.isFinite(fillStyle.valueRange?.min) || Number.isFinite(fillStyle.valueRange?.max);
    return {
      mode,
      min: hasExplicitValueRange
        ? finiteOr(fillStyle.valueRange?.min, dataBounds.min)
        : finiteOr(palette?.params?.rangeMin, dataBounds.min),
      max: hasExplicitValueRange
        ? finiteOr(fillStyle.valueRange?.max, dataBounds.max)
        : finiteOr(palette?.params?.rangeMax, dataBounds.max),
    };
  }

  return {
    mode: fillStyle.valueRange?.mode ?? 'auto',
    min: finiteOr(fillStyle.valueRange?.min, dataBounds.min),
    max: finiteOr(fillStyle.valueRange?.max, dataBounds.max),
  };
}

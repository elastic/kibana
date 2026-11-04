/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Cell coloring for data table previews. This follows how the Lens data table resolves cell colors
// from the Lens state the API config transforms to: `toExpression` (palette params), the
// `getCellColor` defaults in `table_basic.tsx`, `getCellColorFn` and the charts plugin's palette
// registry (`workoutColorForValue`), with Kibana's real palettes and `@kbn/coloring` helpers.

import { makeHighContrastColor } from '@elastic/eui';
import {
  CUSTOM_PALETTE,
  DEFAULT_COLOR_MAPPING_CONFIG,
  DEFAULT_COLOR_STEPS,
  applyPaletteParams,
  checkIsMaxContinuity,
  checkIsMinContinuity,
  enforceColorContrast,
  getColorFactory,
  getOverridePaletteColors,
  getSpecialString,
  getValueKey,
  type CustomPaletteParams,
  type DataBounds,
  type PaletteContinuity,
  type PaletteDefinition,
  type PaletteOutput,
  type PaletteRegistry,
  type SeriesLayer,
} from '@kbn/coloring';
import type { ColumnState } from '@kbn/lens-common';
import { euiThemeVars } from '@kbn/ui-theme';
import { getPreviewPalettes } from './preview_palettes';

/** Returns the color of one cell value, or undefined when the value gets no color. */
export type CellColorFn = (value: unknown) => string | undefined;

const TEXT_INK = euiThemeVars.euiColorTextInk;
const TEXT_GHOST = euiThemeVars.euiColorTextGhost;
const PAGE_BACKGROUND = euiThemeVars.euiPageBackgroundColor;
const LINK_COLOR = euiThemeVars.euiColorPrimaryText;
const DEFAULT_RANGE = { min: 0, max: 100 };

const NO_COLOR: CellColorFn = () => undefined;

/** The palette params a `custom` palette colors values with (`CustomPaletteState`). */
interface ValuePaletteState {
  colors: string[];
  stops: number[];
  range: 'number' | 'percent';
  continuity: PaletteContinuity;
  rangeMin: number;
  rangeMax: number;
}

// The charts plugin palette registry (`buildPalettes`) on top of Kibana's palettes: categorical
// palettes loop over their colors, gradient palettes spread their colors over the series.
const getPaletteDefinition = (name: string): PaletteDefinition => {
  const palette = getPreviewPalettes().get(name);
  const getCategoricalColor = ([{ rankAtDepth, totalSeriesAtDepth }]: SeriesLayer[]) => {
    if (palette.type === 'gradient') return palette.colors(totalSeriesAtDepth)[rankAtDepth];
    const colors = palette.colors();
    return colors[rankAtDepth % colors.length];
  };
  return {
    id: name,
    title: palette.name,
    canDynamicColoring: true,
    getCategoricalColors: (size: number) =>
      palette.type === 'gradient' ? palette.colors(size) : palette.colors().slice(0, size),
    getCategoricalColor,
    toExpression: () => ({ type: 'expression', chain: [] }),
  };
};

const paletteRegistry: PaletteRegistry = {
  get: getPaletteDefinition,
  getAll: () =>
    getPreviewPalettes()
      .getAll()
      .map(({ id }) => getPaletteDefinition(id)),
};

// A copy of the charts plugin's `workoutColorForValue`: named palettes spread their colors evenly
// over the range, custom palettes color by their stops, and continuity colors values outside it.
const findColorSegment = (value: number, colors: string[], rangeMin: number, rangeMax: number) => {
  const step = (rangeMax - rangeMin) / colors.length;
  const index = colors.findIndex((_, i) => value - (rangeMin + (1 + i) * step) <= 0);
  return (
    colors[index] ??
    (value >= rangeMin + colors.length * step ? colors[colors.length - 1] : colors[0])
  );
};

const findColorByStops = (value: number, colors: string[], stops: number[]) => {
  const index = stops.findIndex((stop) => value - stop < 0);
  return (
    colors[index] ?? (value >= stops[stops.length - 1] ? colors[colors.length - 1] : colors[0])
  );
};

const workoutColorForValue = (
  value: number,
  { colors, stops, range, continuity, rangeMin, rangeMax }: ValuePaletteState,
  bounds: DataBounds
): string | undefined => {
  const isMinContinuity = checkIsMinContinuity(continuity);
  const isMaxContinuity = checkIsMaxContinuity(continuity);
  let normalized = value;
  if (range === 'percent') {
    normalized = (100 * (value - bounds.min)) / (bounds.max - bounds.min);
    if (!Number.isFinite(normalized)) normalized = rangeMin;
  }
  const [min, max] = range === 'percent' ? [0, 100] : [bounds.min, bounds.max];
  const minRange = isMinContinuity ? -Infinity : stops.length ? rangeMin : min;
  const maxRange = isMaxContinuity ? Infinity : stops.length ? rangeMax : max;
  if (normalized < minRange) return isMinContinuity ? colors[0] : undefined;
  if (normalized > maxRange) return isMaxContinuity ? colors[colors.length - 1] : undefined;
  return stops.length
    ? findColorByStops(normalized, colors, stops)
    : findColorSegment(normalized, colors, min, max);
};

// The `palette` expression function Lens's `toExpression` builds for a value-colored column: the
// palette's colors (custom stops, or N colors of a named palette spread evenly) and its range.
const toValuePaletteState = (palette: PaletteOutput<CustomPaletteParams>): ValuePaletteState => {
  const params = palette.params ?? {};
  const colors = getOverridePaletteColors(paletteRegistry, palette) ?? [];
  // A step without an upper bound is stored as a null stop: it reaches to the end of the range.
  const stops =
    palette.name === CUSTOM_PALETTE ? (params.stops ?? []).map(({ stop }) => stop ?? Infinity) : [];
  const continuity = params.continuity ?? 'above';
  return {
    colors,
    stops,
    range: params.rangeType ?? 'percent',
    continuity,
    rangeMin: checkIsMinContinuity(continuity)
      ? -Infinity
      : params.rangeMin ?? stops[0] ?? DEFAULT_RANGE.min,
    rangeMax: checkIsMaxContinuity(continuity)
      ? Infinity
      : params.rangeMax ?? stops[stops.length - 1] ?? DEFAULT_RANGE.max,
  };
};

// Lens's default for a numeric column without a palette (`getColorByValuePalette`): the
// "positive" palette in five equal percentage bands.
const getDefaultValuePaletteState = (bounds: DataBounds): ValuePaletteState => {
  const stops = applyPaletteParams(
    paletteRegistry,
    {
      type: 'palette',
      name: 'positive',
      params: {
        name: 'positive',
        reverse: false,
        rangeType: 'percent',
        rangeMin: DEFAULT_RANGE.min,
        rangeMax: DEFAULT_RANGE.max,
        progression: 'fixed',
        stops: [],
        steps: DEFAULT_COLOR_STEPS,
        colorStops: [],
        continuity: 'above',
      },
    },
    bounds
  );
  return {
    colors: stops.map(({ color }) => color),
    stops: stops.map(({ stop }) => stop),
    range: 'percent',
    continuity: 'above',
    rangeMin: DEFAULT_RANGE.min,
    rangeMax: DEFAULT_RANGE.max,
  };
};

const isEmptyValue = (value: unknown) =>
  value == null ||
  value === '__missing__' ||
  value === '' ||
  (typeof value === 'number' && Number.isNaN(value));

/** The data bounds Lens colors numeric values against (`findMinMaxByColumnId`). */
export const getDataBounds = (values: unknown[]): DataBounds => {
  const numbers = values
    .flat()
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return numbers.length ? { min: Math.min(...numbers), max: Math.max(...numbers) } : DEFAULT_RANGE;
};

/** The categories a column colors by term, in order of first appearance (`getColorCategories`). */
const getCategories = (values: unknown[]): unknown[] => {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = getValueKey(value);
    if (value == null || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

/**
 * Builds the cell color function of one column, as Lens does from its column state: numeric
 * columns color by value with the column's palette (or five "positive" bands), other columns
 * color by term with the color mapping (or the default mapping). A config of the wrong kind
 * colors nothing, like in Lens.
 */
export const getCellColorFn = ({
  column,
  isNumeric,
  values,
}: {
  /** The Lens column state, from the API config transform. */
  column: ColumnState | undefined;
  isNumeric: boolean;
  /** Every value of the column in data order, across pivoted columns. */
  values: unknown[];
}): CellColorFn => {
  const { palette, colorMapping } = column ?? {};
  const colorByTerms = !isNumeric;
  const hasValuePalette = Boolean(palette?.params);
  if ((!colorByTerms && colorMapping) || (colorByTerms && hasValuePalette && !colorMapping)) {
    return NO_COLOR;
  }

  if (!colorByTerms) {
    const bounds = getDataBounds(values);
    const state = palette ? toValuePaletteState(palette) : getDefaultValuePaletteState(bounds);
    return (value) =>
      typeof value === 'number' && !isEmptyValue(value)
        ? workoutColorForValue(value, state, bounds)
        : undefined;
  }

  const categories = getCategories(values);
  if (palette && !colorMapping) {
    // A legacy palette (`LEGACY_PALETTE_*`) loops over the categories in order.
    const definition = paletteRegistry.get(palette.name);
    const keys = categories.map((category) => getValueKey(category));
    return (value) => {
      if (value == null) return undefined;
      const key = getValueKey(value);
      return (
        definition.getCategoricalColor(
          [
            {
              name: getSpecialString(key),
              rankAtDepth: Math.max(keys.indexOf(key), 0),
              totalSeriesAtDepth: keys.length || 1,
            },
          ],
          { maxDepth: 1, totalSeries: keys.length || 1, behindText: false, syncColors: false }
        ) ?? undefined
      );
    };
  }

  const getColor = getColorFactory(
    colorMapping ?? DEFAULT_COLOR_MAPPING_CONFIG,
    getPreviewPalettes(),
    false,
    { type: 'categories', categories }
  );
  return (value) => (value == null ? undefined : getColor(value));
};

/** Returns the text color Lens puts on a colored cell or badge (`getContrastColor`). */
export const getContrastTextColor = (background: string): string =>
  enforceColorContrast(background, PAGE_BACKGROUND) ? TEXT_GHOST : TEXT_INK;

/** Returns the link color Lens uses on a colored cell: primary text, contrasted (WCAG AA). */
export const getLinkColor = (background?: string): string =>
  background ? makeHighContrastColor(LINK_COLOR, 4.5)(background) : LINK_COLOR;

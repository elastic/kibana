/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// How a Lens data table colors a cell by value, as Kibana runs it: the datatable's `toExpression` passes a named
// palette as `custom` with its colors and no stops, and a custom palette with its stored stops, which already mark
// where each color ends; `paletteExpressionFn` settles the range and continuity; and the custom palette's
// `getColorForValue` is `workoutColorForValue` (charts plugin, `services/palettes/helpers.ts`), over the column's data
// bounds. Ported rather than imported because the charts plugin isn't a package a lowering can use.

/** A Lens column's persisted palette (`columns[].palette`). */
export interface LensPalette {
  name?: string;
  params?: {
    stops?: Array<{ stop?: number | null; color?: string }>;
    rangeType?: 'percent' | 'number';
    rangeMin?: number | null;
    rangeMax?: number | null;
    continuity?: 'above' | 'below' | 'all' | 'none';
  };
}

interface CustomPaletteState {
  colors: string[];
  /** Kibana's state carries it; value coloring steps between colors either way. */
  gradient?: boolean;
  stops: number[];
  range: 'percent' | 'number';
  continuity: 'above' | 'below' | 'all' | 'none';
  rangeMin: number;
  rangeMax: number;
}

const isMinContinuity = (continuity: string) => continuity === 'below' || continuity === 'all';
const isMaxContinuity = (continuity: string) => continuity === 'above' || continuity === 'all';

/** The palette's params as `paletteExpressionFn` hands them to `getColorForValue`. */
export const lensPaletteState = (palette: LensPalette): CustomPaletteState | undefined => {
  const params = palette.params ?? {};
  const persisted = (params.stops ?? []).filter(
    (entry): entry is { stop: number; color: string } =>
      typeof entry.color === 'string' && typeof entry.stop === 'number'
  );
  if (persisted.length === 0) {
    return undefined;
  }
  const custom = palette.name === 'custom';
  // A named palette's stored stops hold the colors Lens regenerates from it at the same step count.
  const colors = persisted.map(({ color }) => color);
  // Positions are a custom-palette concept only; named palettes distribute uniformly at render.
  const stops = custom ? persisted.map(({ stop }) => stop) : [];
  const continuity = params.continuity ?? 'above';
  const range = (
    userRange: number | null | undefined,
    stopsRange: number | undefined,
    fallback: number
  ) => userRange ?? stopsRange ?? fallback;
  return {
    colors,
    stops,
    range: params.rangeType ?? 'percent',
    continuity,
    rangeMin: isMinContinuity(continuity)
      ? Number.NEGATIVE_INFINITY
      : range(params.rangeMin, stops[0], 0),
    rangeMax: isMaxContinuity(continuity)
      ? Number.POSITIVE_INFINITY
      : range(params.rangeMax, stops[stops.length - 1], 100),
  };
};

const findColorSegment = (
  value: number,
  colors: string[],
  rangeMin: number,
  rangeMax: number
): string | undefined => {
  // Assume uniform distribution within the provided range.
  const step = (rangeMax - rangeMin) / colors.length;
  const index = colors.findIndex((_color, i) => value - (rangeMin + (1 + i) * step) <= 0);
  return (
    colors[index] ??
    (value >= rangeMin + colors.length * step ? colors[colors.length - 1] : colors[0])
  );
};

const findColorsByStops = (
  value: number,
  colors: string[],
  stops: number[]
): string | undefined => {
  const index = stops.findIndex((stop) => value - stop < 0);
  return (
    colors[index] ?? (value >= stops[stops.length - 1]! ? colors[colors.length - 1] : colors[0])
  );
};

/** `workoutColorForValue`: the color for `value`, or none outside a range without continuity. */
export const workoutColorForValue = (
  value: number | undefined,
  state: CustomPaletteState,
  minMax: { min: number; max: number }
): string | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }
  const { colors, stops, range, continuity, rangeMin, rangeMax } = state;
  const minContinuity = isMinContinuity(continuity);
  const maxContinuity = isMaxContinuity(continuity);
  let normalized = value;
  if (range === 'percent') {
    normalized = (100 * (value - minMax.min)) / (minMax.max - minMax.min);
    if (!Number.isFinite(normalized)) {
      normalized = rangeMin;
    }
  }
  const [min, max] = range === 'percent' ? [0, 100] : [minMax.min, minMax.max];
  const minRange = minContinuity ? Number.NEGATIVE_INFINITY : stops.length ? rangeMin : min;
  const maxRange = maxContinuity ? Number.POSITIVE_INFINITY : stops.length ? rangeMax : max;
  if (normalized < minRange) {
    return minContinuity ? colors[0] : undefined;
  }
  if (normalized > maxRange) {
    return maxContinuity ? colors[colors.length - 1] : undefined;
  }
  return stops.length
    ? findColorsByStops(normalized, colors, stops)
    : findColorSegment(normalized, colors, min, max);
};

/** Each value's color as Lens's data table paints it, over the column's own bounds (`findMinMaxByColumnId`). */
export const lensCellColors = (
  palette: LensPalette,
  values: ReadonlyArray<unknown>
): Array<string | null> | undefined => {
  const state = lensPaletteState(palette);
  if (!state) {
    return undefined;
  }
  const numbers = values.filter(
    (value): value is number => typeof value === 'number' && Number.isFinite(value)
  );
  if (numbers.length === 0) {
    return values.map(() => null);
  }
  const minMax = { min: Math.min(...numbers), max: Math.max(...numbers) };
  return values.map((value) => {
    const color =
      typeof value === 'number' ? workoutColorForValue(value, state, minMax) : undefined;
    return color && /^#[0-9a-f]{6}$/i.test(color) ? color.toLowerCase() : null;
  });
};

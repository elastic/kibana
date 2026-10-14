/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatValue, type ValueFormat } from '../../model/format';
import { keyOf, printedLabels } from '../../model/identity';
import {
  DEFAULT_TIME_ZONE,
  defaultGranularity,
  formatTime,
  type Granularity,
  timeValue,
} from '../../model/time';
import type { Tone } from '../../model/tone';
import { glyph } from '../../theme/glyph';

import type { HeatmapNode } from './schema';

export const DEFAULT_MIDPOINT = 0;

/** Words a band without a label prints as. */
const copy = {
  between: (from: string, to: string) => `${from}${glyph.range}${to}`,
  below: (to: string) => `${glyph.below}${to}`,
  atLeast: (from: string) => `${glyph.atLeast}${from}`,
  any: 'All values',
};

export interface HeatmapPosition {
  /** The cell `x` or `y` as authored: the selection key on its dimension. */
  key: string;
  /** As every surface prints it: the label, followed by the key where another position shares it. */
  label: string;
}

export interface HeatmapBand {
  /** Inclusive; absent on an open first band. */
  from?: number;
  /** Exclusive, except on the last band; absent on an open last band. */
  to?: number;
  label: string;
  tone?: Tone;
  /** Position on the theme’s sequential ramp, 0 to 1, for a band without a `tone`. */
  step: number;
}

export type ResolvedColorScale =
  | { type: 'sequential'; min: number; max: number }
  | { type: 'diverging'; min: number; midpoint: number; max: number }
  | { type: 'bands'; bands: readonly HeatmapBand[] };

/** A heatmap with its defaults applied and its cells laid on one ordered grid, for every surface. */
export interface ResolvedHeatmap {
  /** Columns, left to right. */
  x: readonly HeatmapPosition[];
  /** Present for a `time` x: where its times are read and how finely they print. */
  time?: { timeZone: string; granularity: Granularity };
  /** Rows, top to bottom; `undefined` for a one-row heatmap. */
  y: readonly HeatmapPosition[] | undefined;
  /** `values[row][column]`, one row when `y` is `undefined`: a number, `null` for a measured gap, `undefined` for a cell left out. */
  values: readonly (readonly (number | null | undefined)[])[];
  /** Every end is finite, and `min < max` unless every value and fixed end is equal. */
  colorScale: ResolvedColorScale;
}

interface Band {
  from?: number | undefined;
  to?: number | undefined;
}

/** The band holding `value`, or -1. */
export const bandIndex = (bands: readonly Band[], value: number): number =>
  bands.findIndex(
    ({ from, to }, index) =>
      (from === undefined || value >= from) &&
      (to === undefined || value < to || (index === bands.length - 1 && value === to))
  );

const xId = (type: HeatmapNode['x']['type'], x: string): string =>
  type === 'time' ? String(timeValue(x)) : x;

/** A cell's grid identity, comparing times as instants. */
export const cellId = (
  type: HeatmapNode['x']['type'],
  { x, y }: { x: string; y?: string | undefined }
): string => JSON.stringify([xId(type, x), y ?? null]);

const firstSeen = (
  values: readonly string[],
  id: (value: string) => unknown = (value) => value
) => {
  const seen = new Map<unknown, string>();
  for (const value of values) {
    if (!seen.has(id(value))) {
      seen.set(id(value), value);
    }
  }
  return [...seen.values()];
};

const categoryPositions = (
  declared: readonly { key?: string | undefined; label: string }[] | undefined,
  found: readonly string[]
): HeatmapPosition[] => {
  const positions = (declared ?? []).map((category) => ({
    key: keyOf(category),
    label: category.label,
  }));
  const keys = new Set(positions.map(({ key }) => key));
  const all = [
    ...positions,
    ...firstSeen(found)
      .filter((key) => !keys.has(key))
      .map((key) => ({ key, label: key })),
  ];
  const labels = printedLabels(all);
  return all.map(({ key }, index) => ({ key, label: labels[index]! }));
};

const timeOf = ({ x, cells }: HeatmapNode): ResolvedHeatmap['time'] =>
  x.type === 'time'
    ? {
        timeZone: x.timeZone ?? DEFAULT_TIME_ZONE,
        granularity: x.granularity ?? defaultGranularity(cells.map((cell) => cell.x)),
      }
    : undefined;

const xPositions = (
  { x, cells }: HeatmapNode,
  time: ResolvedHeatmap['time']
): HeatmapPosition[] => {
  const found = cells.map((cell) => cell.x);
  if (x.type === 'category') {
    return categoryPositions(x.categories, found);
  }
  return firstSeen(found, timeValue)
    .sort((a, b) => timeValue(a) - timeValue(b))
    .map((key) => ({ key, label: formatTime(key, time!) }));
};

const rangeLabel = ({ from, to }: Band, format: ValueFormat | undefined): string => {
  const print = (value: number) => formatValue(value, format);
  if (from !== undefined && to !== undefined) {
    return copy.between(print(from), print(to));
  }
  if (to !== undefined) {
    return copy.below(print(to));
  }
  return from === undefined ? copy.any : copy.atLeast(print(from));
};

const extent = (values: readonly number[]) =>
  values.length === 0 ? undefined : { low: Math.min(...values), high: Math.max(...values) };

const divergingReach = (
  midpoint: number,
  data: { low: number; high: number } | undefined
): number => (data ? Math.max(Math.abs(data.low - midpoint), Math.abs(data.high - midpoint)) : 0);

/** The diverging ends a `domain` leaves unset, `midpoint` minus and plus its distance to the farthest value. */
export const unfixedDivergingEnds = (
  midpoint: number,
  { min, max }: { min?: number | undefined; max?: number | undefined },
  values: readonly number[]
): number[] => {
  const reach = divergingReach(midpoint, extent(values));
  return [
    ...(min === undefined ? [midpoint - reach] : []),
    ...(max === undefined ? [midpoint + reach] : []),
  ];
};

const resolveScale = (
  { colorScale = { type: 'sequential' }, format }: HeatmapNode,
  values: readonly number[]
): ResolvedColorScale => {
  if (colorScale.type === 'bands') {
    const { bands } = colorScale;
    return {
      type: 'bands',
      bands: bands.map(({ from, to, tone, label }, index) => ({
        ...(from === undefined ? {} : { from }),
        ...(to === undefined ? {} : { to }),
        label: label ?? rangeLabel({ from, to }, format),
        ...(tone === undefined ? {} : { tone }),
        step: bands.length === 1 ? 1 : index / (bands.length - 1),
      })),
    };
  }
  const data = extent(values);
  const { min: fixedMin, max: fixedMax } = colorScale.domain ?? {};
  if (colorScale.type === 'diverging') {
    const { midpoint = DEFAULT_MIDPOINT } = colorScale;
    // Unfixed ends sit equally far from the midpoint, so equal distances read as equal intensity.
    const reach = divergingReach(midpoint, data);
    return {
      type: 'diverging',
      min: fixedMin ?? midpoint - reach,
      midpoint,
      max: fixedMax ?? midpoint + reach,
    };
  }
  const min = fixedMin ?? Math.min(data?.low ?? 0, fixedMax ?? Infinity);
  const max = fixedMax ?? Math.max(data?.high ?? 0, min);
  return { type: 'sequential', min, max: Math.max(max, min) };
};

export const resolveHeatmap = (node: HeatmapNode): ResolvedHeatmap => {
  const { x: xAxis, y: yAxis, cells } = node;
  const time = timeOf(node);
  const x = xPositions(node, time);
  const y = yAxis
    ? categoryPositions(
        yAxis.categories,
        cells.flatMap((cell) => (cell.y === undefined ? [] : [cell.y]))
      )
    : undefined;
  const column = new Map(x.map(({ key }, at) => [xId(xAxis.type, key), at]));
  const row = new Map((y ?? []).map(({ key }, at) => [key, at]));
  const values: (number | null | undefined)[][] = (y ?? [undefined]).map(() =>
    x.map(() => undefined)
  );
  for (const cell of cells) {
    values[cell.y === undefined ? 0 : row.get(cell.y)!]![column.get(xId(xAxis.type, cell.x))!] =
      cell.value;
  }
  return {
    x,
    ...(time === undefined ? {} : { time }),
    y,
    values,
    colorScale: resolveScale(
      node,
      cells.flatMap(({ value }) => (value === null ? [] : [value]))
    ),
  };
};

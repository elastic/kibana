/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ImpactPill } from './impact_pills';

/** Collapsed Impact shows at most this many rows; the rest hides behind `+n`. */
export const MAX_PILL_ROWS = 2;

/** Each `+n` click reveals this many more rows, so a huge Impact never opens as one wall of pills. */
export const ROWS_PER_EXPAND = 3;

/** Rows to show after `expansions` clicks on `+n`. */
export const rowsAfterExpansions = (expansions: number): number =>
  MAX_PILL_ROWS + expansions * ROWS_PER_EXPAND;

export interface VisiblePillsOptions {
  /** Row budget for the pills and their trailing controls. Defaults to the collapsed budget. */
  maxRows?: number;
  /** Reserve room for the "show fewer" control that sits beside `+n` once expanded. */
  collapseControl?: boolean;
}

/**
 * Which pills the collapsed row shows: the first `prefixCount` in order, plus
 * the selected pill appended at the end when it falls past that prefix.
 */
export interface VisiblePills {
  prefixCount: number;
  pinnedIndex: number | null;
}

/** Natural widths of every pill and the worst-case `+n` pill, plus the row they wrap in. */
export interface PillMeasurements {
  pillWidths: readonly number[];
  overflowWidth: number;
  containerWidth: number;
  gap: number;
}

export const isVisibleIndex = (
  index: number,
  { prefixCount, pinnedIndex }: VisiblePills
): boolean => index < prefixCount || index === pinnedIndex;

/**
 * Number of lines a greedy wrapping flex row needs for items of these widths:
 * an item starts a new line when the line, the gap and the item exceed the container.
 */
export const countRows = (
  widths: readonly number[],
  containerWidth: number,
  gap: number
): number => {
  let rows = 0;
  let lineWidth = 0;
  for (const width of widths) {
    if (rows === 0 || lineWidth + gap + width > containerWidth) {
      rows += 1;
      lineWidth = width;
    } else {
      lineWidth += gap + width;
    }
  }
  return rows;
};

const fitsInMaxRows = (
  measurements: PillMeasurements,
  visible: VisiblePills,
  { maxRows = MAX_PILL_ROWS, collapseControl = false }: VisiblePillsOptions
): boolean => {
  const { pillWidths, overflowWidth, containerWidth, gap } = measurements;
  // Filtering keeps index order, so a pinned pill lands last, right before `+n`.
  const shown = pillWidths.filter((_, index) => isVisibleIndex(index, visible));
  const widths = shown.length < pillWidths.length ? [...shown, overflowWidth] : [...shown];
  if (collapseControl) {
    // The icon-only "show fewer" pill has the same footprint as a short `+n` pill.
    widths.push(overflowWidth);
  }
  return countRows(widths, containerWidth, gap) <= maxRows;
};

/** Largest `prefixCount` for the given pin that fits, with `+n`, in the row budget. */
const largestFittingPrefix = (
  measurements: PillMeasurements,
  pinnedIndex: number | null,
  from: number,
  options: VisiblePillsOptions
): number => {
  for (let candidate = from; candidate > 0; candidate -= 1) {
    if (fitsInMaxRows(measurements, { prefixCount: candidate, pinnedIndex }, options)) {
      return candidate;
    }
  }
  return 0;
};

/**
 * Largest prefix of `pills` that, together with the `+n` pill, fits in
 * the row budget (`MAX_PILL_ROWS` unless `options.maxRows` says otherwise). A selected pill past that prefix is pinned at the end of
 * the row instead, shortening the prefix as needed, so the active filter
 * is always visible and clearable.
 */
export const findVisiblePills = (
  measurements: PillMeasurements,
  pills: readonly ImpactPill[],
  entityFilter: string | null,
  options: VisiblePillsOptions = {}
): VisiblePills => {
  const total = pills.length;
  if (total === 0) {
    return { prefixCount: 0, pinnedIndex: null };
  }

  const prefixCount = largestFittingPrefix(measurements, null, total, options);
  const selectedIndex = entityFilter
    ? pills.findIndex((pill) => pill.entityId === entityFilter)
    : -1;
  if (selectedIndex < 0 || selectedIndex < prefixCount) {
    return { prefixCount, pinnedIndex: null };
  }

  return {
    prefixCount: largestFittingPrefix(measurements, selectedIndex, prefixCount, options),
    pinnedIndex: selectedIndex,
  };
};

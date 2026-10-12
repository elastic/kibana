/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ImpactPill } from './impact_pills';

/** Collapsed Impact shows at most this many rows; the rest hides behind `+n`. */
export const MAX_PILL_ROWS = 2;

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

const fitsInMaxRows = (measurements: PillMeasurements, visible: VisiblePills): boolean => {
  const { pillWidths, overflowWidth, containerWidth, gap } = measurements;
  // Filtering keeps index order, so a pinned pill lands last, right before `+n`.
  const shown = pillWidths.filter((_, index) => isVisibleIndex(index, visible));
  const widths = shown.length < pillWidths.length ? [...shown, overflowWidth] : shown;
  return countRows(widths, containerWidth, gap) <= MAX_PILL_ROWS;
};

/** Largest `prefixCount` for the given pin that fits, with `+n`, in `MAX_PILL_ROWS`. */
const largestFittingPrefix = (
  measurements: PillMeasurements,
  pinnedIndex: number | null,
  from: number
): number => {
  for (let candidate = from; candidate > 0; candidate -= 1) {
    if (fitsInMaxRows(measurements, { prefixCount: candidate, pinnedIndex })) {
      return candidate;
    }
  }
  return 0;
};

/**
 * Largest prefix of `pills` that, together with the `+n` pill, fits in
 * `MAX_PILL_ROWS`. A selected pill past that prefix is pinned at the end of
 * the row instead, shortening the prefix as needed, so the active filter
 * is always visible and clearable.
 */
export const findVisiblePills = (
  measurements: PillMeasurements,
  pills: readonly ImpactPill[],
  entityFilter: string | null
): VisiblePills => {
  const total = pills.length;
  if (total === 0) {
    return { prefixCount: 0, pinnedIndex: null };
  }

  const prefixCount = largestFittingPrefix(measurements, null, total);
  const selectedIndex = entityFilter
    ? pills.findIndex((pill) => pill.entityId === entityFilter)
    : -1;
  if (selectedIndex < 0 || selectedIndex < prefixCount) {
    return { prefixCount, pinnedIndex: null };
  }

  return {
    prefixCount: largestFittingPrefix(measurements, selectedIndex, prefixCount),
    pinnedIndex: selectedIndex,
  };
};

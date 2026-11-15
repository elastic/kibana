/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** A value (status or severity) with the first and last time it was seen. */
export interface PhaseRange<T> {
  value: T;
  startMs: number;
  endMs: number;
}

/** The value that became current at a point in time. */
export interface PhaseChange<T> {
  value: T;
  atMs: number;
}

interface Boundary<T> {
  atMs: number;
  kind: 'start' | 'end';
  value: T;
}

/**
 * Turns per-value `[start, end]` ranges into the sequence of changes of the current value.
 *
 * Collapsed queries return one range per value, so a value that flaps (active, recovering,
 * active) is a single range that overlaps the others. Walking the range boundaries in time
 * order, with the open ranges kept latest start last, keeps the final change on the value
 * that was open longest instead of the value that merely started last.
 */
export const sweepPhaseRanges = <T>(
  ranges: ReadonlyArray<PhaseRange<T>>
): Array<PhaseChange<T>> => {
  const boundaries = ranges.flatMap(
    ({ value, startMs, endMs }): Array<Boundary<T>> => [
      { atMs: startMs, kind: 'start', value },
      { atMs: endMs, kind: 'end', value },
    ]
  );

  // At the same instant starts come before ends, so a single-event range opens then closes.
  boundaries.sort(
    (a, b) => a.atMs - b.atMs || (a.kind === b.kind ? 0 : a.kind === 'start' ? -1 : 1)
  );

  let open: T[] = [];
  const changes: Array<PhaseChange<T>> = [];

  for (const { atMs, kind, value } of boundaries) {
    if (kind === 'start') {
      open = [...open, value];
      changes.push({ value, atMs });
      continue;
    }

    const wasCurrent = open[open.length - 1] === value;
    open = open.filter((openValue) => openValue !== value);
    const nowCurrent = open[open.length - 1];
    if (wasCurrent && nowCurrent !== undefined) {
      changes.push({ value: nowCurrent, atMs });
    }
  }

  return changes;
};

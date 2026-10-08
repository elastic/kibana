/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ImpactPill } from './impact_pills';
import { countRows, findVisiblePills, isVisibleIndex } from './visible_pills';
import type { PillMeasurements } from './visible_pills';

const pills = (count: number): ImpactPill[] =>
  Array.from({ length: count }, (_, index) => ({ entityId: `host-${index}`, count: 1 }));

/** 100px pills, a 40px `+n` pill and a 320px row with an 8px gap: three pills per line. */
const measure = (count: number, overrides: Partial<PillMeasurements> = {}): PillMeasurements => ({
  pillWidths: Array.from({ length: count }, () => 100),
  overflowWidth: 40,
  containerWidth: 320,
  gap: 8,
  ...overrides,
});

describe('countRows', () => {
  it('needs no rows for no items', () => {
    expect(countRows([], 320, 8)).toBe(0);
  });

  it('keeps items on one row while they fit with their gaps', () => {
    expect(countRows([100, 100, 100], 320, 8)).toBe(1);
  });

  it('wraps the item that would overflow the row', () => {
    expect(countRows([100, 100, 100, 100], 320, 8)).toBe(2);
    expect(countRows([100, 100, 100, 100, 100, 100, 100], 320, 8)).toBe(3);
  });

  it('gives an item wider than the row a line of its own', () => {
    expect(countRows([400, 50], 320, 8)).toBe(2);
    expect(countRows([50, 400, 50], 320, 8)).toBe(3);
  });
});

describe('isVisibleIndex', () => {
  it('shows the prefix and the pinned index only', () => {
    const visible = { prefixCount: 2, pinnedIndex: 5 };
    expect([0, 1, 2, 4, 5, 6].map((index) => isVisibleIndex(index, visible))).toEqual([
      true,
      true,
      false,
      false,
      true,
      false,
    ]);
  });
});

describe('findVisiblePills', () => {
  it('shows nothing for no pills', () => {
    expect(findVisiblePills(measure(0), [], null)).toEqual({ prefixCount: 0, pinnedIndex: null });
  });

  it('shows every pill when they fit in two rows', () => {
    expect(findVisiblePills(measure(6), pills(6), null)).toEqual({
      prefixCount: 6,
      pinnedIndex: null,
    });
  });

  it('keeps the largest prefix that fits together with the +n pill', () => {
    // Row 1: three pills. Row 2: two pills and the 40px "+n".
    expect(findVisiblePills(measure(7), pills(7), null)).toEqual({
      prefixCount: 5,
      pinnedIndex: null,
    });
  });

  it('pins a selected pill past the cut and shrinks the prefix to make room', () => {
    expect(findVisiblePills(measure(7), pills(7), 'host-6')).toEqual({
      prefixCount: 4,
      pinnedIndex: 6,
    });
  });

  it('keeps the natural order when the selected pill is already in the prefix', () => {
    expect(findVisiblePills(measure(7), pills(7), 'host-1')).toEqual({
      prefixCount: 5,
      pinnedIndex: null,
    });
  });

  it('ignores a selected id that is not a pill', () => {
    expect(findVisiblePills(measure(7), pills(7), 'missing')).toEqual({
      prefixCount: 5,
      pinnedIndex: null,
    });
  });

  it('adapts the cut to the container width', () => {
    // 212px fits two 100px pills per row: three pills and "+n" in two rows.
    expect(findVisiblePills(measure(7, { containerWidth: 212 }), pills(7), null)).toEqual({
      prefixCount: 3,
      pinnedIndex: null,
    });
  });

  it('uses the width of each individual pill', () => {
    // A 250px first pill takes a row alone; two 100px pills and "+n" share the second.
    expect(
      findVisiblePills(measure(5, { pillWidths: [250, 100, 100, 100, 100] }), pills(5), null)
    ).toEqual({ prefixCount: 3, pinnedIndex: null });
  });
});

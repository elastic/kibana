/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getLifecycleTimelineLayout } from './get_lifecycle_timeline_layout';
import type { LifecycleTimelinePeriod } from './types';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const period = (id: string, maxAgeInDays?: number): LifecycleTimelinePeriod => ({
  id,
  label: id,
  color: '#000000',
  maxAge:
    maxAgeInDays === undefined
      ? undefined
      : { label: `${maxAgeInDays}d`, valueInMs: maxAgeInDays * DAY_IN_MS },
});

const summarize = (periods: LifecycleTimelinePeriod[], retention?: string) =>
  getLifecycleTimelineLayout(periods, retention).periods.map(
    ({ period: { id }, startLabel, endLabel, grow }) => ({ id, startLabel, endLabel, grow })
  );

describe('getLifecycleTimelineLayout', () => {
  it('chains the age ranges and ends with ∞ when no retention is passed', () => {
    expect(summarize([period('recent', 1), period('older', 7), period('oldest')])).toEqual([
      { id: 'recent', startLabel: '0', endLabel: '1d', grow: 1 / 6 },
      { id: 'older', startLabel: '1d', endLabel: '7d', grow: 1 },
      { id: 'oldest', startLabel: '7d', endLabel: '∞', grow: 1 },
    ]);
  });

  it('ends with the retention when it is passed', () => {
    const layout = summarize([period('recent', 1), period('oldest')], '30d');

    expect(layout[layout.length - 1].endLabel).toBe('30d');
  });

  it('makes the last period as wide as the one before it', () => {
    const layout = summarize([period('recent', 2), period('older', 3), period('oldest')]);

    expect(layout.map(({ grow }) => grow)).toEqual([1, 0.5, 0.5]);
  });

  it('makes a single period take the whole track', () => {
    expect(summarize([period('oldest')])).toEqual([
      { id: 'oldest', startLabel: '0', endLabel: '∞', grow: 1 },
    ]);
  });

  it('leaves out a first period with a max age of 0', () => {
    expect(summarize([period('recent', 0), period('older', 7), period('oldest')])).toEqual([
      { id: 'older', startLabel: '0', endLabel: '7d', grow: 1 },
      { id: 'oldest', startLabel: '7d', endLabel: '∞', grow: 1 },
    ]);
  });

  it.each([
    ['before', 5],
    ['at', 7],
  ])('leaves out a period ending %s the previous max age', (_, olderMaxAge) => {
    expect(
      summarize([period('recent', 7), period('older', olderMaxAge), period('oldest')])
    ).toEqual([
      { id: 'recent', startLabel: '0', endLabel: '7d', grow: 1 },
      { id: 'oldest', startLabel: '7d', endLabel: '∞', grow: 1 },
    ]);
  });

  it('leaves out a period whose max age is not a number', () => {
    expect(
      summarize([period('recent', 1), period('older', NaN), period('oldest')]).map(({ id }) => id)
    ).toEqual(['recent', 'oldest']);
  });

  it('leaves out the periods after one with no end', () => {
    expect(summarize([period('recent'), period('older', 7)]).map(({ id }) => id)).toEqual([
      'recent',
    ]);
  });

  it('returns no periods when none is passed', () => {
    expect(getLifecycleTimelineLayout([]).periods).toEqual([]);
  });

  it('builds one tick per period and the end label', () => {
    const { ticks, endLabel } = getLifecycleTimelineLayout(
      [period('recent', 1), period('oldest')],
      '30d'
    );

    expect(ticks).toEqual([
      { id: 'recent', label: '0' },
      { id: 'oldest', label: '1d' },
    ]);
    expect(endLabel).toEqual({ label: '30d' });
  });

  it('marks the end label as infinite when no retention is passed', () => {
    expect(getLifecycleTimelineLayout([period('oldest')]).endLabel).toEqual({
      label: '∞',
      isInfinite: true,
    });
  });

  it('builds proportional grid columns, equal ones for narrow containers and a minimum width', () => {
    const { grid } = getLifecycleTimelineLayout([
      period('recent', 2),
      period('older', 4),
      period('oldest'),
    ]);

    expect(grid).toEqual({
      gridTemplateColumns: 'minmax(96px, 1fr) minmax(96px, 1fr) minmax(96px, 1fr)',
      narrow: { maxWidthPx: 432, gridTemplateColumns: 'repeat(3, minmax(96px, 1fr))' },
      minWidth: '288px',
    });
  });
});

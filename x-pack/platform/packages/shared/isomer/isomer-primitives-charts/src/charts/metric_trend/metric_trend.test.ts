/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { selectionEvent } from '../../model/selection';
import { MAX_DATA_POINTS } from '../../model/text';
import { timeKindRule, timeSpellingRule } from '../../model/time';

import { examples } from './examples';
import { MAX_RELATIVE_CHANGE, resolveMetricTrend } from './model';
import { read } from './read';
import { distinctTimesRule, finiteChangeRule, type MetricTrendNode, schema } from './schema';

const base: MetricTrendNode = {
  type: 'metricTrend',
  title: 'Requests',
  value: 110,
};

const messages = (node: unknown): string[] =>
  schema.safeParse(node).error?.issues.map(({ message }) => message) ?? [];

const valid = (node: unknown) => messages(node).length === 0;

const titled = (title: string) => examples.find((node) => node.title === title)!;

const points = (...ys: (number | null)[]) => ys.map((y, index) => ({ x: `2026-10-1${index}`, y }));

describe('metricTrend schema', () => {
  it('accepts every example', () => {
    for (const node of examples) {
      expect({ title: node.title, errors: messages(node) }).toEqual({
        title: node.title,
        errors: [],
      });
    }
  });

  it('needs a title, since a bare number means nothing', () => {
    const { title: _, ...untitled } = base;
    expect(valid(base)).toBe(true);
    expect(valid(untitled)).toBe(false);
  });

  it('takes `null` as no current reading, and refuses NaN and infinities', () => {
    expect(valid({ ...base, value: null })).toBe(true);
    for (const value of [Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(valid({ ...base, value })).toBe(false);
      expect(valid({ ...base, previous: { value, label: 'yesterday' } })).toBe(false);
    }
  });

  it('needs a previous reading to be a number with a window', () => {
    expect(valid({ ...base, previous: { value: 0, label: 'yesterday' } })).toBe(true);
    expect(valid({ ...base, previous: { value: null, label: 'x' } })).toBe(false);
    expect(valid({ ...base, previous: { value: 1 } })).toBe(false);
  });

  it('needs at least two trend points and at most the pack-wide cap', () => {
    const at = (count: number) =>
      Array.from({ length: count }, (_, index) => ({
        x: new Date(Date.UTC(2026, 0, 1) + index * 60_000).toISOString(),
        y: index,
      }));
    expect(valid({ ...base, trend: { points: at(2) } })).toBe(true);
    expect(valid({ ...base, trend: { points: at(1) } })).toBe(false);
    expect(valid({ ...base, trend: { points: at(MAX_DATA_POINTS) } })).toBe(true);
    expect(valid({ ...base, trend: { points: at(MAX_DATA_POINTS + 1) } })).toBe(false);
  });

  it('needs trend times in ISO 8601', () => {
    expect(
      valid({
        ...base,
        trend: {
          points: [
            { x: 'Mon', y: 1 },
            { x: '2026-10-14', y: 2 },
          ],
        },
      })
    ).toBe(false);
  });

  it('needs trend points at distinct instants, whatever their offset', () => {
    expect(
      messages({
        ...base,
        trend: {
          points: [
            { x: '2026-10-14T08:00:00Z', y: 1 },
            { x: '2026-10-14T10:00:00+02:00', y: 2 },
          ],
        },
      })
    ).toContain(distinctTimesRule);
    expect(
      messages({
        ...base,
        trend: {
          points: [
            { x: '2026-10-14T08:00:00Z', y: 1 },
            { x: '2026-10-14T08:00:00Z', y: 2 },
          ],
        },
      })
    ).toEqual([distinctTimesRule]);
    expect(
      valid({
        ...base,
        trend: {
          points: [
            { x: '2026-10-14T08:00:00Z', y: 1 },
            { x: '2026-10-14T08:00:01Z', y: 2 },
          ],
        },
      })
    ).toBe(true);
  });

  it('says a moment spelled two ways breaks both the spelling and the distinct-instant rules', () => {
    expect(
      messages({
        ...base,
        trend: {
          points: [
            { x: '2026-10-14T08:00:00Z', y: 1 },
            { x: '2026-10-14T10:00:00+02:00', y: 2 },
          ],
        },
      })
    ).toEqual([timeSpellingRule, distinctTimesRule]);
  });

  it('needs trend times to be all dates or all date-times', () => {
    expect(
      messages({
        ...base,
        trend: {
          points: [
            { x: '2026-10-14', y: 1 },
            { x: '2026-10-14T12:00:00Z', y: 2 },
          ],
        },
      })
    ).toEqual([timeKindRule]);
    expect(
      messages({
        ...base,
        trend: {
          points: [
            { x: '2026-10-14', y: 1 },
            { x: '2026-10-15T09:00:00Z', y: 2 },
            { x: '2026-10-16', y: 3 },
          ],
        },
      })
    ).toEqual([timeKindRule]);
  });

  it('skips the trend time rules once the pack-wide count has failed', () => {
    const repeated = Array.from({ length: MAX_DATA_POINTS + 1 }, () => ({
      x: '2026-10-14',
      y: 1,
    }));
    const result = messages({ ...base, trend: { points: repeated } });
    expect(result).toHaveLength(1);
    expect(result).not.toContain(distinctTimesRule);
  });

  it('needs the change from the previous value to be finite', () => {
    const changed = (value: number, previous: number, format?: object) =>
      messages({
        ...base,
        value,
        previous: { value: previous, label: 'yesterday' },
        ...(format === undefined ? {} : { format }),
      });
    expect(changed(Number.MAX_VALUE, -Number.MAX_VALUE)).toEqual([finiteChangeRule]);
    expect(changed(Number.MAX_VALUE, 0)).toEqual([]);
    expect(changed(Number.MAX_VALUE / 2, -Number.MAX_VALUE / 2)).toEqual([]);
    expect(changed(1e307, 0, { style: 'percent' })).toEqual([finiteChangeRule]);
    expect(changed(1e305, 0, { style: 'percent' })).toEqual([]);
    expect(
      messages({
        ...base,
        value: null,
        previous: { value: -Number.MAX_VALUE, label: 'yesterday' },
      })
    ).toEqual([]);
  });

  it('refuses fields it does not define', () => {
    expect(valid({ ...base, color: '#f00' })).toBe(false);
    expect(valid({ ...base, delta: { label: '↑ 12%' } })).toBe(false);
    expect(valid({ ...base, previous: { value: 1, label: 'x', color: '#f00' } })).toBe(false);
  });
});

describe('resolveMetricTrend', () => {
  const change = (value: number | null, previous: number, format?: object) =>
    resolveMetricTrend({
      ...base,
      value,
      previous: { value: previous, label: 'yesterday' },
      ...(format === undefined ? {} : { format }),
    } as MetricTrendNode).change;

  it('derives the absolute and relative change, worded neutrally', () => {
    expect(change(110, 100)).toEqual({
      direction: 'up',
      absolute: 10,
      relative: 0.1,
      text: 'up 10%',
      detail: 'up 10 (10%)',
    });
    expect(change(75, 100)).toMatchObject({
      direction: 'down',
      text: 'down 25%',
      detail: 'down 25 (25%)',
    });
  });

  it('gives only the absolute change when the previous value is 0', () => {
    const result = change(3, 0);
    expect(result).toEqual({
      direction: 'up',
      absolute: 3,
      text: 'up 3',
      detail: 'up 3',
    });
    expect(result && 'relative' in result).toBe(false);
  });

  it('leaves the relative change out once it reaches the cap', () => {
    expect(change(MAX_RELATIVE_CHANGE, 1)).toMatchObject({
      relative: MAX_RELATIVE_CHANGE - 1,
      text: 'up 99,900%',
      detail: 'up 999 (99,900%)',
    });
    const at = change(MAX_RELATIVE_CHANGE + 1, 1);
    expect(at).toEqual({
      direction: 'up',
      absolute: MAX_RELATIVE_CHANGE,
      text: 'up 1,000',
      detail: 'up 1,000',
    });
    expect(change(1 - MAX_RELATIVE_CHANGE, 1)).toEqual({
      direction: 'down',
      absolute: -MAX_RELATIVE_CHANGE,
      text: 'down 1,000',
      detail: 'down 1,000',
    });
    expect(change(1, 1e-200)).toEqual({
      direction: 'up',
      absolute: 1,
      text: 'up 1',
      detail: 'up 1',
    });
    expect(change(1e300, -1e-10)?.relative).toBeUndefined();
  });

  it('reads direction from the signed difference when the previous value is negative', () => {
    expect(change(-5, -10)).toMatchObject({
      direction: 'up',
      relative: 0.5,
      text: 'up 50%',
    });
    expect(change(-20, -10)).toMatchObject({
      direction: 'down',
      text: 'down 100%',
    });
  });

  it('calls a change unchanged when it prints as zero', () => {
    expect(change(100, 100)).toMatchObject({
      direction: 'unchanged',
      text: 'unchanged',
      detail: 'unchanged',
    });
    expect(change(100.001, 100)?.direction).toBe('unchanged');
    expect(change(48_200.001, 48_200, { style: 'number', compact: true })?.direction).toBe(
      'unchanged'
    );
  });

  it('falls back to the absolute change when the relative one prints as zero', () => {
    expect(change(1_000_001, 1_000_000)).toMatchObject({
      direction: 'up',
      text: 'up 1',
      detail: 'up 1 (0%)',
    });
  });

  it('words a ratio’s change in percentage points', () => {
    expect(change(0.05, 0.04, { style: 'percent' })).toMatchObject({
      text: 'up 1 percentage point',
      detail: 'up 1 percentage point (25%)',
    });
    expect(change(0.052, 0.012, { style: 'percent', precision: 1 })).toMatchObject({
      text: 'up 4.0 percentage points',
    });
    expect(change(0.04, 0, { style: 'percent' })).toMatchObject({
      text: 'up 4 percentage points',
      detail: 'up 4 percentage points',
    });
  });

  it('has no change without a current value', () => {
    expect(change(null, 100)).toBeUndefined();
  });

  it('orders the trend by instant and formats every value', () => {
    const { trend, formatted, previous, tone } = resolveMetricTrend({
      ...base,
      format: { style: 'bytes' },
      value: 2048,
      previous: { value: 1024, label: 'yesterday' },
      tone: 'warning',
      trend: {
        granularity: 'hour',
        points: [
          { x: '2026-10-14T12:00:00+02:00', y: 1024 },
          { x: '2026-10-14T09:00:00Z', y: null },
        ],
      },
    });
    expect(formatted).toBe('2 KB');
    expect(previous).toEqual({
      value: 1024,
      label: 'yesterday',
      formatted: '1 KB',
    });
    expect(tone).toBe('warning');
    expect(trend.map(({ key, label, formatted: cell }) => [key, label, cell])).toEqual([
      ['2026-10-14T09:00:00Z', 'Oct 14, 09:00', '—'],
      ['2026-10-14T12:00:00+02:00', 'Oct 14, 10:00', '1 KB'],
    ]);
  });

  it('leaves tone, previous, and trend empty when not given', () => {
    const resolved = resolveMetricTrend(base);
    expect(resolved).toEqual({ value: 110, formatted: '110', trend: [] });
  });
});

describe('read', () => {
  it('summarizes the value and its change from the previous window', () => {
    expect(read(titled('Log ingest rate')).summary).toBe(
      'Log ingest rate is 48.2K events/s, up 12.1% from the previous hour.'
    );
    expect(read(titled('Checkout error rate')).summary).toBe(
      'Checkout error rate is 5.2% with danger status, up 4.0 percentage points from yesterday.'
    );
    expect(read(titled('Critical alerts open')).summary).toBe(
      'Critical alerts open is 3 with warning status, up 3 from yesterday.'
    );
    expect(read({ ...base, previous: { value: 110, label: 'yesterday' } }).summary).toBe(
      'Requests is 110, unchanged from yesterday.'
    );
  });

  it('summarizes a missing reading by the previous one, else the trend', () => {
    expect(read(titled('Heap used on es-01')).summary).toBe(
      'Heap used on es-01 has no current reading. The value from an hour ago is 6 GB.'
    );
    expect(
      read({
        ...base,
        value: null,
        trend: { granularity: 'day', points: points(1, 4) },
      }).summary
    ).toBe(
      'Requests has no current reading. From Oct 10, 2026 to Oct 11, 2026 it ranged between 1 and 4.'
    );
    expect(read({ ...base, value: null }).summary).toBe('Requests has no current reading.');
  });

  it('spans the range over the trend’s present values only', () => {
    expect(
      read({
        ...base,
        trend: { granularity: 'day', points: points(null, 1, 4, null) },
      }).summary
    ).toBe('Requests is 110. From Oct 11, 2026 to Oct 12, 2026 it ranged between 1 and 4.');
  });

  it('summarizes the value with the trend’s range when there is no previous', () => {
    expect(read(titled('Search p95 latency')).summary).toBe(
      'Search p95 latency is 212 ms. From Oct 10, 2026 to Oct 13, 2026 it ranged between 188 ms and 240 ms.'
    );
    expect(read(titled('Hosts reporting')).summary).toBe('Hosts reporting is 1,284.');
    expect(read({ ...base, trend: { points: points(null, null) } }).summary).toBe(
      'Requests is 110.'
    );
  });

  it('tables the current value, the previous value and change, then the trend by time', () => {
    expect(read(titled('Heap used on es-01')).table).toEqual({
      columns: ['Reading (UTC)', 'Heap used on es-01'],
      rows: [
        ['Current', '—'],
        ['an hour ago', '6 GB'],
        ['Oct 14, 08:45', '6 GB'],
        ['Oct 14, 09:00', '6.3 GB'],
        ['Oct 14, 09:15', '—'],
        ['Oct 14, 09:30', '—'],
      ],
    });
    expect(read(titled('Critical alerts open')).table).toEqual({
      columns: ['Reading', 'Critical alerts open'],
      rows: [
        ['Current', '3'],
        ['Status', 'Warning'],
        ['yesterday', '0'],
        ['Change', 'up 3'],
      ],
    });
    expect(read(titled('Log ingest rate')).table.rows[2]).toEqual([
      'Change',
      'up 5.2K events/s (12.1%)',
    ]);
  });

  it('names the trend’s time zone in the first column', () => {
    expect(read(titled('Search p95 latency')).table.columns[0]).toBe('Reading (Europe/Amsterdam)');
    expect(read({ ...base, trend: { points: points(1, 2) } }).table.columns[0]).toBe(
      'Reading (UTC)'
    );
  });

  it('prints a trend of dates by day unless a granularity is given', () => {
    expect(read({ ...base, trend: { points: points(1, 4) } }).summary).toBe(
      'Requests is 110. From Oct 10, 2026 to Oct 11, 2026 it ranged between 1 and 4.'
    );
    expect(read({ ...base, trend: { granularity: 'month', points: points(1, 4) } }).summary).toBe(
      'Requests is 110. From Oct 2026 to Oct 2026 it ranged between 1 and 4.'
    );
    expect(
      resolveMetricTrend({
        ...base,
        trend: {
          points: [
            { x: '2026-10-14T09:00:00Z', y: 1 },
            { x: '2026-10-14T09:05:00Z', y: 2 },
          ],
        },
      }).time
    ).toEqual({ timeZone: 'UTC', granularity: 'minute' });
  });

  it('words the author’s status in the summary and the table, and nothing without one', () => {
    const toned = { ...base, tone: 'danger' } as const;
    expect(read(toned).summary).toBe('Requests is 110 with danger status.');
    expect(read(toned).table.rows).toEqual([
      ['Current', '110'],
      ['Status', 'Danger'],
    ]);
    expect(read({ ...toned, value: null }).summary).toBe(
      'Requests has no current reading, with danger status.'
    );
    expect(read({ ...toned, trend: { points: points(1, 4) } }).summary).toBe(
      'Requests is 110 with danger status. From Oct 10, 2026 to Oct 11, 2026 it ranged between 1 and 4.'
    );
    expect(read(base).summary).toBe('Requests is 110.');
    expect(read(base).table.rows).toEqual([['Current', '110']]);
  });
});

describe('metricTrend selection', () => {
  const selectable = examples.find(({ selection }) => selection)!;

  it('raises the event for a whole-chart click with an empty target', () => {
    expect(selectionEvent(selectable.selection!, {})).toEqual({
      name: 'dashboard/open',
      context: {
        panelId: 'failed-logins',
        view: 'discover',
        target: {},
        predicates: [],
      },
    });
  });

  it('binds no dimension', () => {
    const bound = (selection: unknown) => ({ ...base, selection });
    expect(valid(bound({ name: 's' }))).toBe(true);
    expect(valid(bound({ name: 's', on: {} }))).toBe(false);
    expect(valid(bound({ name: 's', on: { x: {} } }))).toBe(false);
  });
});

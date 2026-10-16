/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { selectionEvent } from '../../model/selection';
import { MAX_DATA_POINTS, MAX_GRID_CELLS } from '../../model/text';

import { examples } from './examples';
import { resolveXy } from './model';
import { read } from './read';
import { schema, type XyChartNode } from './schema';

const base: XyChartNode = {
  type: 'xyChart',
  x: { type: 'category' },
  series: [
    {
      label: 'a',
      points: [
        { x: 'p', y: 1 },
        { x: 'q', y: 2 },
      ],
    },
  ],
};

const messages = (node: unknown): string[] =>
  schema.safeParse(node).error?.issues.map(({ message }) => message) ?? [];

const valid = (node: unknown) => messages(node).length === 0;

describe('xyChart schema', () => {
  it('accepts every example', () => {
    for (const node of examples) {
      expect({ title: node.title, errors: messages(node) }).toEqual({
        title: node.title,
        errors: [],
      });
    }
  });

  it('needs unique series keys, defaulting to labels', () => {
    const twin = { ...base.series[0]! };
    expect(valid({ ...base, series: [twin, { ...twin, key: 'b' }] })).toBe(true);
    expect(messages({ ...base, series: [twin, twin] })).toContain('series keys are unique');
  });

  it('needs unique category keys and points on declared categories', () => {
    const categories = [{ label: 'p' }, { label: 'q' }];
    expect(valid({ ...base, x: { type: 'category', categories } })).toBe(true);
    expect(
      messages({
        ...base,
        x: { type: 'category', categories: [{ label: 'p' }, { label: 'p' }] },
      })
    ).toContain('category keys are unique');
    expect(
      messages({
        ...base,
        x: { type: 'category', categories: [{ label: 'p' }] },
      })
    ).toContain('when `categories` is declared, every point’s `x` is one of their keys');
  });

  it('needs x values that match the axis type', () => {
    const rule =
      'every point’s `x` is a string for `category`, a time for `time`, and a number for `number`';
    expect(
      valid({
        ...base,
        x: { type: 'number' },
        series: [{ label: 'a', points: [{ x: 1, y: 1 }] }],
      })
    ).toBe(true);
    expect(messages({ ...base, x: { type: 'number' } })).toContain(rule);
    expect(
      valid({
        ...base,
        x: { type: 'time' },
        series: [{ label: 'a', points: [{ x: '2026-10-14', y: 1 }] }],
      })
    ).toBe(true);
    expect(messages({ ...base, x: { type: 'time' } })).toContain(rule);
    expect(messages({ ...base, series: [{ label: 'a', points: [{ x: 1, y: 1 }] }] })).toContain(
      rule
    );
  });

  it('needs each series to have one point per x, comparing times as instants', () => {
    const rule = 'no series has two points at the same `x`';
    expect(
      messages({
        ...base,
        series: [
          {
            label: 'a',
            points: [
              { x: 'p', y: 1 },
              { x: 'p', y: 2 },
            ],
          },
        ],
      })
    ).toContain(rule);
    expect(
      messages({
        ...base,
        x: { type: 'time' },
        series: [
          {
            label: 'a',
            points: [
              { x: '2026-10-14T08:00:00Z', y: 1 },
              { x: '2026-10-14T10:00:00+02:00', y: 2 },
            ],
          },
        ],
      })
    ).toContain(rule);
  });

  it('declares y2 exactly when something reads against it', () => {
    const rule = '`y2` is declared exactly when a series or threshold reads against it';
    const onY2 = { ...base, series: [{ ...base.series[0]!, axis: 'y2' }] };
    expect(valid({ ...onY2, y2: {} })).toBe(true);
    expect(messages(onY2)).toContain(rule);
    expect(messages({ ...base, y2: {} })).toContain(rule);
    expect(valid({ ...base, y2: {}, thresholds: [{ value: 1, axis: 'y2' }] })).toBe(true);
  });

  it('lays bars horizontally only on a category axis of bars', () => {
    const rule = '`horizontal` needs `category` x and every series a `bar`';
    const bars = {
      ...base,
      orientation: 'horizontal',
      series: [{ ...base.series[0]!, kind: 'bar' }],
    };
    expect(valid(bars)).toBe(true);
    expect(messages({ ...bars, series: base.series })).toContain(rule);
  });

  it('needs every value on a log axis above zero, gaps aside', () => {
    const rule =
      'a `log` axis has every value on it above zero, its `domain.min` and thresholds included';
    expect(valid({ ...base, y: { scale: 'log' } })).toBe(true);
    expect(
      valid({
        ...base,
        y: { scale: 'log' },
        series: [{ label: 'a', points: [{ x: 'p', y: null }] }],
      })
    ).toBe(true);
    expect(
      messages({
        ...base,
        y: { scale: 'log' },
        series: [{ label: 'a', points: [{ x: 'p', y: 0 }] }],
      })
    ).toContain(rule);
  });

  it('extends the log rule to the domain and thresholds on that axis', () => {
    const rule =
      'a `log` axis has every value on it above zero, its `domain.min` and thresholds included';
    expect(valid({ ...base, y: { scale: 'log', domain: { min: 1 } } })).toBe(true);
    expect(messages({ ...base, y: { scale: 'log', domain: { min: 0 } } })).toContain(rule);
    expect(valid({ ...base, y: { scale: 'log' }, thresholds: [{ value: 0.5 }] })).toBe(true);
    expect(messages({ ...base, y: { scale: 'log' }, thresholds: [{ value: 0 }] })).toContain(rule);
  });

  it('needs a fixed domain to run low to high', () => {
    const rule = '`domain.min` is below `domain.max` when both are set';
    expect(valid({ ...base, y: { domain: { min: 0, max: 1 } } })).toBe(true);
    expect(valid({ ...base, y: { domain: { min: 10 } } })).toBe(true);
    expect(messages({ ...base, y: { domain: { min: 1, max: 1 } } })).toContain(rule);
    expect(messages({ ...base, y: { domain: { min: 10, max: 0 } } })).toContain(rule);
  });

  it('refuses a date that does not exist', () => {
    expect(
      messages({
        ...base,
        x: { type: 'time' },
        series: [{ label: 'a', points: [{ x: '2026-02-30', y: 1 }] }],
      })
    ).toContain(
      'every point’s `x` is a string for `category`, a time for `time`, and a number for `number`'
    );
  });

  it('keeps a time axis to one kind of time, each moment spelled one way', () => {
    const timed = (...xs: string[]) => ({
      ...base,
      x: { type: 'time' },
      series: xs.map((x, index) => ({
        label: `s${index}`,
        points: [{ x, y: 1 }],
      })),
    });
    expect(valid(timed('2026-10-14', '2026-10-15'))).toBe(true);
    expect(messages(timed('2026-10-14', '2026-10-14T12:00:00Z'))).toContain(
      'the times on one axis are all dates or all date-times'
    );
    expect(messages(timed('2026-10-14T09:00:00Z', '2026-10-14T11:00:00+02:00'))).toContain(
      'one moment is written the same way everywhere on the axis'
    );
  });

  it('needs stacked values to sum to a finite total', () => {
    const rule = 'when series stack, their values at each `x` sum to a finite total';
    const huge = (stack: string) => ({
      ...base,
      stack,
      series: [
        { label: 'a', kind: 'bar', points: [{ x: 'p', y: 1.7e308 }] },
        { label: 'b', kind: 'bar', points: [{ x: 'p', y: 1.7e308 }] },
      ],
    });
    expect(valid(huge('none'))).toBe(true);
    expect(messages(huge('stacked'))).toContain(rule);
    expect(messages(huge('percent'))).toContain(rule);
  });

  it('holds at most the pack-wide number of points', () => {
    const points = (count: number) =>
      Array.from({ length: count }, (_, index) => ({ x: index, y: index }));
    const sized = (count: number) => ({
      ...base,
      x: { type: 'number' },
      series: [{ label: 'a', points: points(count) }],
    });
    expect(valid(sized(MAX_DATA_POINTS))).toBe(true);
    expect(messages(sized(MAX_DATA_POINTS + 1))).toContain(
      `the chart holds at most ${MAX_DATA_POINTS} points and annotations`
    );
  });

  it('binds selection only to keys the data declares', () => {
    const bound = (on: unknown) => ({ ...base, selection: { name: 's', on } });
    expect(valid(bound({ x: { p: [{ field: 'f', value: 'p' }] } }))).toBe(true);
    expect(valid(bound({ series: { a: [{ field: 'f', value: 'a' }] } }))).toBe(true);
    expect(messages(bound({ x: { z: [{ field: 'f', value: 'z' }] } }))).toContain(
      'every key in `selection.on` names a key the chart’s data declares: x.z'
    );
  });

  it('refuses NaN and infinite values', () => {
    for (const y of [Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(valid({ ...base, series: [{ label: 'a', points: [{ x: 'p', y }] }] })).toBe(false);
    }
  });

  it('refuses fields it does not define', () => {
    expect(valid({ ...base, color: '#f00' })).toBe(false);
    expect(valid({ ...base, series: [{ ...base.series[0]!, color: '#f00' }] })).toBe(false);
  });
});

describe('resolveXy', () => {
  it('orders declared categories first, then the rest as first seen, aligning sparse series', () => {
    const { positions, series } = resolveXy({
      type: 'xyChart',
      x: { type: 'category', categories: [{ key: 'z', label: 'Zed' }] },
      series: [
        {
          label: 'a',
          points: [
            { x: 'm', y: 1 },
            { x: 'z', y: 2 },
          ],
        },
        { label: 'b', points: [{ x: 'n', y: null }] },
      ],
    });
    expect(positions).toEqual([
      { key: 'z', label: 'Zed' },
      { key: 'm', label: 'm' },
      { key: 'n', label: 'n' },
    ]);
    expect(series.map(({ values }) => values)).toEqual([
      [2, 1, undefined],
      [undefined, undefined, null],
    ]);
  });

  it('orders times by instant whatever their offset or authored order', () => {
    const { positions, series } = resolveXy({
      type: 'xyChart',
      x: { type: 'time', granularity: 'hour' },
      series: [
        {
          label: 'a',
          points: [
            { x: '2026-10-14T12:00:00+02:00', y: 2 },
            { x: '2026-10-14T09:00:00Z', y: 1 },
          ],
        },
        { label: 'b', points: [{ x: '2026-10-14T10:00:00Z', y: 3 }] },
      ],
    });
    expect(positions.map(({ key }) => key)).toEqual([
      '2026-10-14T09:00:00Z',
      '2026-10-14T12:00:00+02:00',
    ]);
    expect(series.map(({ values }) => values)).toEqual([
      [1, 2],
      [undefined, 3],
    ]);
  });

  it('orders numbers ascending and applies defaults', () => {
    const resolved = resolveXy({
      type: 'xyChart',
      x: { type: 'number', format: { style: 'bytes' } },
      series: [
        {
          label: 'a',
          points: [
            { x: 2048, y: 1 },
            { x: 1024, y: 2 },
          ],
        },
      ],
    });
    expect(resolved.positions).toEqual([
      { key: '1024', label: '1 KB' },
      { key: '2048', label: '2 KB' },
    ]);
    expect(resolved).toMatchObject({
      stack: 'none',
      missing: 'gap',
      orientation: 'vertical',
    });
    expect(resolved.series[0]).toMatchObject({ kind: 'line', axis: 'y' });
  });
});

describe('read', () => {
  it('prints a point a series lacks and a measured gap alike, as missing', () => {
    const sparse = examples.find(({ title }) => title === 'Errors per hour')!;
    expect(read(sparse).table.rows.slice(2)).toEqual([
      ['Oct 14, 02:00', '2', '—'],
      ['Oct 14, 03:00', '—', '—'],
    ]);
  });

  it('names the time zone in the x column', () => {
    const latency = examples.find(({ title }) => title === 'Checkout p95 latency')!;
    expect(read(latency).table.columns[0]).toBe('Time (Europe/Amsterdam)');
  });

  it('summarizes a stack by its largest total', () => {
    expect(read(examples[0]!).summary).toBe(
      'Across 3 stacked series, the largest total is 1.61K at api-01.'
    );
  });

  it('summarizes two axes by the left one, since their units differ', () => {
    const dual = examples.find(({ title }) => title === 'Traffic and error rate')!;
    expect(read(dual).summary).toBe(
      'Requests runs from Oct 12, 2026 to Oct 14, 2026, between 182K and 204.5K.'
    );
  });

  it('counts values above each labelled threshold', () => {
    const latency = examples.find(({ title }) => title === 'Checkout p95 latency')!;
    expect(read(latency).summary).toContain('1 of 8 values are above SLO (300 ms, warning).');
  });

  it('prints an axis of dates by day and names a numeric x column', () => {
    const dual = examples.find(({ title }) => title === 'Traffic and error rate')!;
    expect(read(dual).table.rows[0]![0]).toBe('Oct 12, 2026');
    const numeric = read({
      ...base,
      x: { type: 'number' },
      series: [{ label: 'a', points: [{ x: 1, y: 1 }] }],
    });
    expect(numeric.table.columns[0]).toBe('Number');
  });

  it('tells series that share a label apart by key', () => {
    const { table } = read({
      ...base,
      series: [
        { key: 'prod', label: 'logs', points: [{ x: 'p', y: 1 }] },
        { key: 'staging', label: 'logs', points: [{ x: 'p', y: 2 }] },
      ],
    });
    expect(table.columns.slice(1)).toEqual(['logs (prod)', 'logs (staging)']);
  });

  it('summarizes a chart with no values without inventing one', () => {
    expect(read({ ...base, series: [{ label: 'a', points: [{ x: 'p', y: null }] }] }).summary).toBe(
      'No values.'
    );
  });
});

describe('xyChart selection', () => {
  const selectable = examples.find(({ selection }) => selection)!;

  it('resolves a stacked segment to its series and x predicates', () => {
    expect(
      selectionEvent(selectable.selection!, {
        x: '2026-10-14T11:00:00Z',
        series: 'sso',
      }).context?.predicates
    ).toEqual([
      {
        field: '@timestamp',
        range: { gte: '2026-10-14T11:00:00Z', lt: '2026-10-14T12:00:00Z' },
      },
      { field: 'event.provider', value: 'sso' },
    ]);
  });

  it('keeps two categories that share a label apart by key', () => {
    const repeated = examples.find(({ title }) => title === 'Heap used by node')!;
    const { positions } = resolveXy(repeated);
    expect(positions.map(({ key }) => key)).toEqual(['prod/es-01', 'prod/es-02', 'staging/es-01']);
    expect(positions.map(({ label }) => label)).toEqual([
      'es-01 (prod/es-01)',
      'es-02',
      'es-01 (staging/es-01)',
    ]);
  });

  it('binds a key a sparse series lacks, since the x domain is the union', () => {
    const sparse: XyChartNode = {
      ...base,
      series: [
        { label: 'a', points: [{ x: 'p', y: 1 }] },
        { label: 'b', points: [{ x: 'q', y: 2 }] },
      ],
      selection: { name: 's', on: { x: { q: [{ field: 'f', value: 'q' }] } } },
    };
    expect(valid(sparse)).toBe(true);
  });
});

describe('xyChart time buckets and bins', () => {
  const days = (
    x: Record<string, unknown>,
    points: readonly string[] = ['2026-10-14T00:00:00Z']
  ) => ({
    ...base,
    x: { type: 'time', ...x },
    series: [{ label: 'a', points: points.map((at) => ({ x: at, y: 1 })) }],
  });

  it('needs a queried window to run forward', () => {
    expect(
      valid(
        days({
          domain: { from: '2026-10-14T00:00:00Z', to: '2026-10-15T00:00:00Z' },
        })
      )
    ).toBe(true);
    expect(
      messages(
        days({
          domain: { from: '2026-10-14T00:00:00Z', to: '2026-10-14T00:00:00Z' },
        })
      )
    ).toEqual(['`domain.from` is before `domain.to`']);
  });

  it('keeps the window to the same kind of time as the points', () => {
    expect(
      messages(days({ domain: { from: '2026-10-13', to: '2026-10-15' } }, ['2026-10-14']))
    ).toEqual([]);
    expect(
      messages(
        days(
          {
            domain: {
              from: '2026-10-13T00:00:00Z',
              to: '2026-10-15T00:00:00Z',
            },
          },
          ['2026-10-14']
        )
      )
    ).toEqual([
      'the times on one axis are all dates or all date-times',
      'the times on one axis are all dates or all date-times',
    ]);
  });

  it('takes a whole, positive interval in a spelled-out unit', () => {
    expect(valid(days({ interval: { value: 1, unit: 'day' } }))).toBe(true);
    expect(valid(days({ interval: { value: 0, unit: 'day' } }))).toBe(false);
    expect(valid(days({ interval: { value: 1.5, unit: 'hour' } }))).toBe(false);
    expect(valid(days({ interval: { value: 1, unit: 'd' } }))).toBe(false);
  });

  it('takes a positive bin width on a number axis', () => {
    const bins = (interval: number) => ({
      ...base,
      x: { type: 'number', interval },
      series: [{ label: 'a', points: [{ x: 0, y: 1 }] }],
    });
    expect(valid(bins(0.5))).toBe(true);
    expect(valid(bins(0))).toBe(false);
  });

  it('marks the buckets the window cuts, stepping days on the zone’s wall clock', () => {
    // New York leaves daylight saving on Nov 1, 2026, so that day runs 25 hours.
    const { positions, time } = resolveXy(
      days(
        {
          timeZone: 'America/New_York',
          interval: { value: 1, unit: 'day' },
          domain: { from: '2026-11-01T10:00:00Z', to: '2026-11-04T10:00:00Z' },
        },
        [
          '2026-11-01T04:00:00Z',
          '2026-11-02T05:00:00Z',
          '2026-11-03T05:00:00Z',
          '2026-11-04T05:00:00Z',
        ]
      ) as XyChartNode
    );
    expect(positions.map(({ partial }) => partial ?? false)).toEqual([true, false, false, true]);
    expect(time).toMatchObject({
      interval: 24 * 3_600_000,
      window: {
        from: Date.parse('2026-11-01T10:00:00Z'),
        to: Date.parse('2026-11-04T10:00:00Z'),
      },
    });
  });

  it('ends a whole bucket exactly at the window without marking it', () => {
    const { positions } = resolveXy(
      days(
        {
          interval: { value: 1, unit: 'month' },
          domain: { from: '2026-01-01T00:00:00Z', to: '2026-03-01T00:00:00Z' },
        },
        ['2026-01-01T00:00:00Z', '2026-02-01T00:00:00Z']
      ) as XyChartNode
    );
    expect(positions.some(({ partial }) => partial)).toBe(false);
  });

  it('leaves buckets unmarked without both an interval and a window', () => {
    const { positions } = resolveXy(
      days({
        domain: { from: '2026-10-14T06:00:00Z', to: '2026-10-15T00:00:00Z' },
      }) as XyChartNode
    );
    expect(positions[0]!.partial).toBeUndefined();
  });

  it('prints a bin as its range and a partial bucket as partial', () => {
    const binned = resolveXy({
      ...base,
      x: { type: 'number', interval: 60 },
      series: [
        {
          label: 'a',
          points: [
            { x: 0, y: 1 },
            { x: 60, y: 2 },
          ],
        },
      ],
    });
    expect(binned.bin).toBe(60);
    expect(binned.positions.map(({ label }) => label)).toEqual(['0 – 60', '60 – 120']);
    const { summary, table } = read(
      days(
        {
          granularity: 'day',
          interval: { value: 1, unit: 'day' },
          domain: { from: '2026-10-14T06:00:00Z', to: '2026-10-16T00:00:00Z' },
        },
        ['2026-10-14T00:00:00Z', '2026-10-15T00:00:00Z']
      ) as XyChartNode
    );
    expect(table.rows.map(([label]) => label)).toEqual(['Oct 14, 2026 (partial)', 'Oct 15, 2026']);
    expect(summary).toContain('The bucket at Oct 14, 2026 is partial: the queried window cuts it.');
  });
});

describe('xyChart annotations', () => {
  const annotated = (
    annotations: readonly Record<string, unknown>[],
    x: Record<string, unknown> = { type: 'category' }
  ) => ({ ...base, x, annotations });

  it('places annotations on the axis, as its points are', () => {
    expect(valid(annotated([{ label: 'Deploy', at: 'q' }]))).toBe(true);
    expect(messages(annotated([{ label: 'Deploy', at: 'r' }]))).toEqual([
      'an annotation’s `at` and `until` are on the x axis: a category of the chart, a time, or a number, as its points are',
    ]);
    expect(
      valid(
        annotated([{ label: 'Deploy', at: 1 }], {
          type: 'category',
        })
      )
    ).toBe(false);
    const timed = (at: unknown) => ({
      ...base,
      x: { type: 'time' },
      series: [{ label: 'a', points: [{ x: '2026-10-14T09:00:00Z', y: 1 }] }],
      annotations: [{ label: 'Deploy', at }],
    });
    expect(valid(timed('2026-10-14T09:30:00Z'))).toBe(true);
    expect(valid(timed('yesterday'))).toBe(false);
    expect(valid(timed('2026-10-14'))).toBe(false);
  });

  it('needs a range to end after it starts, in axis order', () => {
    expect(valid(annotated([{ label: 'Incident', at: 'p', until: 'q' }]))).toBe(true);
    expect(messages(annotated([{ label: 'Incident', at: 'q', until: 'p' }]))).toEqual([
      'an annotation’s `until` comes after its `at`',
    ]);
    expect(valid(annotated([{ label: 'Incident', at: 'p', until: 'p' }]))).toBe(false);
  });

  it('needs unique annotation keys, defaulting to labels', () => {
    expect(
      messages(
        annotated([
          { label: 'Deploy', at: 'p' },
          { label: 'Deploy', at: 'q' },
        ])
      )
    ).toEqual(['annotation keys are unique']);
    expect(
      valid(
        annotated([
          { key: 'd1', label: 'Deploy', at: 'p' },
          { key: 'd2', label: 'Deploy', at: 'q' },
        ])
      )
    ).toBe(true);
  });

  it('counts annotations toward the pack-wide cap', () => {
    const points = Array.from({ length: MAX_DATA_POINTS }, (_, x) => ({
      x,
      y: 1,
    }));
    const capped = {
      ...base,
      x: { type: 'number' },
      series: [{ label: 'a', points }],
    };
    expect(valid(capped)).toBe(true);
    expect(valid({ ...capped, annotations: [{ label: 'Deploy', at: 1 }] })).toBe(false);
  });

  it('resolves annotations to axis positions and printed spans', () => {
    const { annotations } = resolveXy({
      ...base,
      x: { type: 'time', granularity: 'hour' },
      series: [{ label: 'a', points: [{ x: '2026-10-14T09:00:00Z', y: 1 }] }],
      annotations: [
        { label: 'Deploy', at: '2026-10-14T09:00:00Z' },
        {
          label: 'Incident',
          at: '2026-10-14T10:00:00Z',
          until: '2026-10-14T11:00:00Z',
          tone: 'danger',
        },
      ],
    });
    expect(annotations).toEqual([
      {
        key: 'Deploy',
        label: 'Deploy',
        at: Date.parse('2026-10-14T09:00:00Z'),
        span: 'Oct 14, 09:00',
      },
      {
        key: 'Incident',
        label: 'Incident',
        at: Date.parse('2026-10-14T10:00:00Z'),
        until: Date.parse('2026-10-14T11:00:00Z'),
        span: 'Oct 14, 10:00 – Oct 14, 11:00',
        tone: 'danger',
      },
    ]);
  });

  it('lists a few annotations in the summary and counts many', () => {
    expect(
      read(
        annotated([
          { label: 'Deploy', at: 'p' },
          { label: 'Incident', at: 'p', until: 'q', tone: 'danger' },
        ]) as XyChartNode
      ).summary
    ).toContain('Marked: Deploy (p); Incident (p – q, danger).');
    const many = Array.from({ length: 40 }, (_, index) => ({
      x: index,
      y: 1,
    }));
    const { summary } = read({
      ...base,
      x: { type: 'number' },
      series: [{ label: 'a', points: many }],
      annotations: many.map(({ x }) => ({
        key: `e${x}`,
        label: 'Event',
        at: 39 - x,
      })),
    });
    expect(summary).toContain('40 events are marked, from 0 to 39.');
  });
});

describe('xyChart grid', () => {
  it('bounds the distinct x positions times the series, counting declared categories', () => {
    const rule = `its distinct \`x\` positions, declared categories included, times its series are at most ${MAX_GRID_CELLS}`;
    const count = Math.ceil(Math.sqrt(MAX_GRID_CELLS)) + 1;
    const staggered = Array.from({ length: count }, (_, index) => ({
      key: `s${index}`,
      label: `s${index}`,
      points: [{ x: `p${index}`, y: index }],
    }));
    expect(messages({ ...base, series: staggered })).toEqual([rule]);
    expect(valid({ ...base, series: staggered.slice(0, 100) })).toBe(true);
    const categories = Array.from({ length: MAX_GRID_CELLS / 2 + 1 }, (_, index) => ({
      label: `c${index}`,
    }));
    expect(
      messages({
        ...base,
        x: { type: 'category', categories },
        series: [
          { label: 'a', points: [{ x: 'c0', y: 1 }] },
          { label: 'b', points: [{ x: 'c0', y: 1 }] },
        ],
      })
    ).toEqual([rule]);
  });
});

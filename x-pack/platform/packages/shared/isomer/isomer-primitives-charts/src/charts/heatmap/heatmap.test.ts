/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { selectionEvent } from '../../model/selection';
import { MAX_DATA_POINTS, MAX_GRID_CELLS } from '../../model/text';

import { examples } from './examples';
import { bandIndex, resolveHeatmap } from './model';
import { read } from './read';
import { type HeatmapNode, schema } from './schema';

const base: HeatmapNode = {
  type: 'heatmap',
  x: { type: 'category' },
  y: { type: 'category' },
  cells: [
    { x: 'p', y: 'a', value: 1 },
    { x: 'q', y: 'a', value: 2 },
  ],
};

const strip: HeatmapNode = {
  type: 'heatmap',
  x: { type: 'category' },
  cells: [
    { x: 'p', value: 1 },
    { x: 'q', value: 2 },
  ],
};

const messages = (node: unknown): string[] =>
  schema.safeParse(node).error?.issues.map(({ message }) => message) ?? [];

const valid = (node: unknown) => messages(node).length === 0;

const titled = (title: string) => examples.find((example) => example.title === title)!;

const bands = (list: unknown[]) => ({
  ...strip,
  colorScale: { type: 'bands', bands: list },
});

describe('heatmap schema', () => {
  it('accepts every example', () => {
    for (const node of examples) {
      expect({ title: node.title, errors: messages(node) }).toEqual({
        title: node.title,
        errors: [],
      });
    }
  });

  it('needs unique category keys on both axes, defaulting to labels', () => {
    const rule = 'category keys are unique';
    const twins = [{ label: 'p' }, { label: 'p' }];
    expect(
      valid({
        ...base,
        x: { type: 'category', categories: [{ label: 'p' }, { label: 'q' }] },
      })
    ).toBe(true);
    expect(
      valid({
        ...base,
        x: {
          type: 'category',
          categories: [{ label: 'p' }, { key: 'q', label: 'p' }],
        },
      })
    ).toBe(true);
    expect(messages({ ...base, x: { type: 'category', categories: twins } })).toContain(rule);
    expect(
      messages({
        ...base,
        y: { type: 'category', categories: [{ label: 'a' }, { label: 'a' }] },
      })
    ).toContain(rule);
  });

  it('needs cells on declared categories', () => {
    expect(
      valid({
        ...base,
        x: { type: 'category', categories: [{ label: 'p' }, { label: 'q' }] },
        y: { type: 'category', categories: [{ label: 'a' }] },
      })
    ).toBe(true);
    expect(
      messages({
        ...base,
        x: { type: 'category', categories: [{ label: 'p' }] },
      })
    ).toContain('when `x.categories` is declared, every cell’s `x` is one of their keys');
    expect(
      messages({
        ...base,
        y: { type: 'category', categories: [{ label: 'b' }] },
      })
    ).toContain('when `y.categories` is declared, every cell’s `y` is one of their keys');
  });

  it('needs real times on a time axis', () => {
    const rule = 'on a `time` axis every cell’s `x` is a time';
    const timed = (...xs: string[]) => ({
      ...strip,
      x: { type: 'time' },
      cells: xs.map((x, index) => ({ x, value: index })),
    });
    expect(valid(timed('2026-10-14', '2026-02-28'))).toBe(true);
    expect(messages(timed('Mon'))).toContain(rule);
    expect(messages(timed('2026-02-30'))).toEqual([rule]);
  });

  it('keeps one time axis to dates or date-times', () => {
    const rule = 'the times on one axis are all dates or all date-times';
    const timed = (...xs: string[]) => ({
      ...strip,
      x: { type: 'time' },
      cells: xs.map((x, index) => ({ x, value: index })),
    });
    expect(valid(timed('2026-10-14T08:00:00Z', '2026-10-14T09:00:00Z'))).toBe(true);
    expect(messages(timed('2026-10-14', '2026-10-14T09:00:00Z'))).toEqual([rule]);
  });

  it('spells one moment one way across rows', () => {
    const rule = 'one moment is written the same way everywhere on the axis';
    const timed = (...xs: string[]) => ({
      ...base,
      x: { type: 'time' },
      cells: xs.map((x, index) => ({ x, y: String(index), value: index })),
    });
    expect(valid(timed('2026-10-14T08:00:00Z', '2026-10-14T08:00:00Z'))).toBe(true);
    expect(messages(timed('2026-10-14T08:00:00Z', '2026-10-14T10:00:00+02:00'))).toEqual([rule]);
  });

  it('gives a cell `y` exactly when the chart declares `y`', () => {
    const rule = 'a cell has `y` exactly when the chart declares `y`';
    expect(valid(strip)).toBe(true);
    expect(messages({ ...strip, cells: [{ x: 'p', y: 'a', value: 1 }] })).toContain(rule);
    expect(messages({ ...base, cells: [{ x: 'p', value: 1 }] })).toContain(rule);
  });

  it('refuses two cells at the same `x` and `y`, comparing times as instants', () => {
    const rule = 'no two cells share an `x` and `y`';
    expect(
      valid({
        ...base,
        cells: [
          { x: 'p', y: 'a', value: 1 },
          { x: 'p', y: 'b', value: 1 },
        ],
      })
    ).toBe(true);
    expect(
      messages({
        ...base,
        cells: [
          { x: 'p', y: 'a', value: 1 },
          { x: 'p', y: 'a', value: null },
        ],
      })
    ).toContain(rule);
    expect(
      messages({
        ...strip,
        x: { type: 'time' },
        cells: [
          { x: '2026-10-14T08:00:00Z', value: 1 },
          { x: '2026-10-14T10:00:00+02:00', value: 2 },
        ],
      })
    ).toContain(rule);
  });

  it('holds at most the pack-wide number of cells', () => {
    const sized = (count: number) => ({
      ...strip,
      cells: Array.from({ length: count }, (_, index) => ({
        x: String(index),
        value: index,
      })),
    });
    expect(valid(sized(MAX_DATA_POINTS))).toBe(true);
    expect(messages(sized(MAX_DATA_POINTS + 1))).toContain(
      `the chart holds at most ${MAX_DATA_POINTS} cells`
    );
  });

  it('stops checking cells once there are too many', () => {
    const over = Array.from({ length: MAX_DATA_POINTS + 1 }, () => ({
      x: 'not a time',
      value: Number.MAX_VALUE,
    }));
    expect(
      messages({
        ...strip,
        x: { type: 'time' },
        cells: over,
        colorScale: { type: 'diverging', midpoint: -Number.MAX_VALUE },
        selection: {
          name: 's',
          on: { x: { p: [{ field: 'f', value: 'v' }] } },
        },
      })
    ).toEqual([`the chart holds at most ${MAX_DATA_POINTS} cells`]);
  });

  it('needs a domain whose min is below its max', () => {
    const rule = '`domain.min` is below `domain.max`';
    const scaled = (type: string, domain: unknown) => ({
      ...strip,
      colorScale: { type, domain },
    });
    expect(valid(scaled('sequential', { min: 0, max: 1 }))).toBe(true);
    expect(valid(scaled('sequential', { min: 1 }))).toBe(true);
    expect(messages(scaled('sequential', { min: 1, max: 1 }))).toContain(rule);
    expect(messages(scaled('diverging', { min: 2, max: -1 }))).toContain(rule);
  });

  it('keeps the midpoint, 0 by default, strictly inside the domain', () => {
    const rule =
      '`midpoint`, 0 when left out, lies strictly between the `domain` ends that are set';
    const diverging = (colorScale: unknown) => ({
      ...strip,
      colorScale: { type: 'diverging', ...(colorScale as object) },
    });
    expect(valid(diverging({ domain: { min: -1, max: 1 } }))).toBe(true);
    expect(valid(diverging({ midpoint: 5, domain: { min: 4 } }))).toBe(true);
    expect(messages(diverging({ domain: { min: 5 } }))).toContain(rule);
    expect(messages(diverging({ domain: { max: 0 } }))).toContain(rule);
    expect(messages(diverging({ midpoint: 10, domain: { min: 0, max: 10 } }))).toContain(rule);
  });

  it('keeps the unset diverging ends finite', () => {
    const rule =
      'each end `domain` leaves unset, `midpoint` minus or plus its distance to the farthest cell value, is finite';
    const diverging = (midpoint: number, value: number, domain?: object) => ({
      ...strip,
      cells: [{ x: 'p', value }],
      colorScale: { type: 'diverging', midpoint, domain },
    });
    expect(valid(diverging(0, -Number.MAX_VALUE))).toBe(true);
    expect(messages(diverging(1.7e308, -1.7e308, { max: Number.MAX_VALUE }))).toContain(rule);
    expect(messages(diverging(1.7e308, -1.7e308))).toContain(rule);
    expect(
      valid(
        diverging(-Number.MAX_VALUE / 2, Number.MAX_VALUE / 2, {
          min: -Number.MAX_VALUE,
        })
      )
    ).toBe(true);
    expect(messages(diverging(-Number.MAX_VALUE / 2, Number.MAX_VALUE / 2))).toContain(rule);
  });

  it('leaves only the outer band ends open', () => {
    const rule = 'only the first band leaves out `from` and only the last leaves out `to`';
    expect(valid(bands([{ to: 1.5 }, { from: 1.5 }]))).toBe(true);
    expect(valid(bands([{}]))).toBe(true);
    expect(messages(bands([{ to: 1.5 }, {}, { from: 3 }]))).toContain(rule);
    expect(messages(bands([{ to: 1.5 }, { to: 3 }]))).toContain(rule);
  });

  it('orders bands low to high without overlapping', () => {
    const rule = 'each band’s `from` is below its `to` and at or above the previous band’s `to`';
    expect(valid(bands([{ to: 1.5 }, { from: 1.5, to: 1.8 }, { from: 1.9 }]))).toBe(true);
    expect(messages(bands([{ from: 2, to: 1 }]))).toContain(rule);
    expect(messages(bands([{ to: 1.5 }, { from: 1.4 }]))).toContain(rule);
  });

  it('takes a value outside every band, which falls in no band', () => {
    expect(valid(bands([{ from: 1, to: 1.5 }]))).toBe(true);
    expect(valid(bands([{ to: 1.2 }, { from: 2.5 }]))).toBe(true);
    expect(bandIndex([{ from: 1, to: 1.5 }], 2)).toBe(-1);
    expect(bandIndex([{ from: 1, to: 1.5 }], 1.5)).toBe(0);
  });

  it('binds selection only to keys the data declares', () => {
    const bound = (node: HeatmapNode, on: unknown) => ({
      ...node,
      selection: { name: 's', on },
    });
    const term = [{ field: 'f', value: 'v' }];
    expect(valid(bound(base, { x: { q: term }, y: { a: term } }))).toBe(true);
    expect(messages(bound(base, { y: { b: term } }))).toContain(
      'every key in `selection.on` names a key the chart’s data declares: y.b'
    );
    expect(valid(bound(strip, { x: { p: term } }))).toBe(true);
    expect(messages(bound(strip, { y: { p: term } }))).toContain(
      'every key in `selection.on` names a key the chart’s data declares: y.p'
    );
  });

  it('refuses NaN and infinite values, colors, and fields it does not define', () => {
    for (const value of [Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(valid({ ...strip, cells: [{ x: 'p', value }] })).toBe(false);
    }
    expect(valid({ ...base, color: '#f00' })).toBe(false);
    expect(valid(bands([{ color: '#f00' }]))).toBe(false);
    expect(valid({ ...strip, colorScale: { type: 'sequential', colors: ['#f00'] } })).toBe(false);
  });
});

describe('resolveHeatmap', () => {
  it('orders declared categories first, then the rest as first seen, on a row-major grid', () => {
    const { x, y, values } = resolveHeatmap({
      ...base,
      x: { type: 'category', categories: [{ key: 'z', label: 'Zed' }] },
      cells: [
        { x: 'm', y: 'b', value: 1 },
        { x: 'z', y: 'a', value: 2 },
        { x: 'n', y: 'b', value: null },
      ],
    });
    expect(x).toEqual([
      { key: 'z', label: 'Zed' },
      { key: 'm', label: 'm' },
      { key: 'n', label: 'n' },
    ]);
    expect(y).toEqual([
      { key: 'b', label: 'b' },
      { key: 'a', label: 'a' },
    ]);
    expect(values).toEqual([
      [undefined, 1, null],
      [2, undefined, undefined],
    ]);
  });

  it('gives one row and no `y` for a strip', () => {
    const { y, values } = resolveHeatmap(strip);
    expect(y).toBeUndefined();
    expect(values).toEqual([[1, 2]]);
  });

  it('orders times by instant whatever their offset or authored order', () => {
    const { x, values } = resolveHeatmap({
      ...strip,
      x: { type: 'time', granularity: 'hour' },
      cells: [
        { x: '2026-10-14T12:00:00+02:00', value: 2 },
        { x: '2026-10-14T09:00:00Z', value: 1 },
      ],
    });
    expect(x).toEqual([
      { key: '2026-10-14T09:00:00Z', label: 'Oct 14, 09:00' },
      { key: '2026-10-14T12:00:00+02:00', label: 'Oct 14, 10:00' },
    ]);
    expect(values).toEqual([[1, 2]]);
  });

  it('reads times in UTC by the day for dates, else by the minute, unless set', () => {
    const timed = (x: object, at: string) =>
      resolveHeatmap({
        ...strip,
        x: { type: 'time', ...x },
        cells: [{ x: at, value: 1 }],
      });
    expect(timed({}, '2026-10-14')).toMatchObject({
      time: { timeZone: 'UTC', granularity: 'day' },
      x: [{ label: 'Oct 14, 2026' }],
    });
    expect(timed({}, '2026-10-14T09:30:00Z')).toMatchObject({
      time: { timeZone: 'UTC', granularity: 'minute' },
      x: [{ label: 'Oct 14, 09:30' }],
    });
    expect(
      timed({ timeZone: 'Europe/Amsterdam', granularity: 'hour' }, '2026-10-14T09:30:00Z').time
    ).toEqual({ timeZone: 'Europe/Amsterdam', granularity: 'hour' });
    expect(resolveHeatmap(strip).time).toBeUndefined();
  });

  it('prints the key after a category label another position shares', () => {
    const { x } = resolveHeatmap({
      ...strip,
      x: {
        type: 'category',
        categories: [
          { key: 'p', label: 'Same' },
          { key: 'q', label: 'Same' },
          { key: 'r', label: 'Other' },
        ],
      },
    });
    expect(x.map(({ label }) => label)).toEqual(['Same (p)', 'Same (q)', 'Other']);
  });

  it('defaults to a sequential scale over the data', () => {
    expect(resolveHeatmap(strip).colorScale).toEqual({
      type: 'sequential',
      min: 1,
      max: 2,
    });
  });

  it('fixes the ends a domain sets', () => {
    const scaled = (domain: object) =>
      resolveHeatmap({ ...strip, colorScale: { type: 'sequential', domain } }).colorScale;
    expect(scaled({ min: 0, max: 10 })).toEqual({
      type: 'sequential',
      min: 0,
      max: 10,
    });
    expect(scaled({ min: 0 })).toEqual({ type: 'sequential', min: 0, max: 2 });
    expect(scaled({ min: 5 })).toEqual({ type: 'sequential', min: 5, max: 5 });
    expect(scaled({ max: 0.5 })).toEqual({
      type: 'sequential',
      min: 0.5,
      max: 0.5,
    });
  });

  it('resolves finite ends with no values or one value', () => {
    expect(resolveHeatmap({ ...strip, cells: [{ x: 'p', value: null }] }).colorScale).toEqual({
      type: 'sequential',
      min: 0,
      max: 0,
    });
    expect(resolveHeatmap({ ...strip, cells: [{ x: 'p', value: 3 }] }).colorScale).toEqual({
      type: 'sequential',
      min: 3,
      max: 3,
    });
    expect(
      resolveHeatmap({ ...strip, cells: [], colorScale: { type: 'diverging' } }).colorScale
    ).toEqual({ type: 'diverging', min: 0, midpoint: 0, max: 0 });
  });

  it('spreads unfixed diverging ends equally about the midpoint', () => {
    const diverging = (colorScale: object) =>
      resolveHeatmap({
        ...strip,
        cells: [
          { x: 'p', value: -2 },
          { x: 'q', value: 8 },
        ],
        colorScale: { type: 'diverging', ...colorScale },
      }).colorScale;
    expect(diverging({})).toEqual({
      type: 'diverging',
      min: -8,
      midpoint: 0,
      max: 8,
    });
    expect(diverging({ midpoint: 2, domain: { max: 20 } })).toEqual({
      type: 'diverging',
      min: -4,
      midpoint: 2,
      max: 20,
    });
  });

  it('resolves bands with labels from their range, tones, and ramp steps', () => {
    const { colorScale } = resolveHeatmap({
      ...bands([{ to: 1.5, tone: 'success' }, { from: 1.5, to: 3, label: 'Mid' }, { from: 3 }]),
      format: { style: 'number', unit: 'ms' },
    } as HeatmapNode);
    expect(colorScale).toEqual({
      type: 'bands',
      bands: [
        { to: 1.5, label: '< 1.5 ms', tone: 'success', step: 0 },
        { from: 1.5, to: 3, label: 'Mid', step: 0.5 },
        { from: 3, label: '≥ 3 ms', step: 1 },
      ],
    });
    expect(resolveHeatmap(bands([{ from: 1, to: 2 }]) as HeatmapNode).colorScale).toEqual({
      type: 'bands',
      bands: [{ from: 1, to: 2, label: '1 – 2', step: 1 }],
    });
    expect(resolveHeatmap(bands([{}]) as HeatmapNode).colorScale).toEqual({
      type: 'bands',
      bands: [{ label: 'All values', step: 1 }],
    });
  });
});

describe('bandIndex', () => {
  const edges = [{ to: 1 }, { from: 1, to: 2 }, { from: 3, to: 4 }];

  it('puts a value on a shared edge in the upper band, and the last band’s `to` in the last band', () => {
    expect(bandIndex(edges, 0.5)).toBe(0);
    expect(bandIndex(edges, 1)).toBe(1);
    expect(bandIndex(edges, 4)).toBe(2);
  });

  it('finds no band for a value in a gap or past a closed end', () => {
    expect(bandIndex(edges, 2)).toBe(-1);
    expect(bandIndex(edges, 4.5)).toBe(-1);
  });
});

describe('read', () => {
  it('runs the longer dimension down the rows, with a corner naming both axes and the time zone', () => {
    const { table } = read(titled('Events ingested by host and hour'));
    expect(table.columns).toEqual(['Time (UTC) / Host', 'api-01', 'batch-01']);
    expect(table.rows).toEqual([
      ['Oct 14, 08:00', '52K', '—'],
      ['Oct 14, 09:00', '61K', '—'],
      ['Oct 14, 10:00', '—', '210K'],
      ['Oct 14, 11:00', '58K', '190K'],
    ]);
  });

  it('keeps rows as rows when there are at least as many as columns', () => {
    const { table } = read(titled('Disk used by node and tier'));
    expect(table.columns).toEqual(['Node / Tier', 'hot', 'warm', 'cold']);
    expect(table.rows).toHaveLength(3);
  });

  it('keeps a 24-hour grid within Slack’s 20 table columns', () => {
    const hours = Array.from(
      { length: 24 },
      (_, hour) => `2026-10-14T${String(hour).padStart(2, '0')}:00:00Z`
    );
    const { table } = read({
      type: 'heatmap',
      x: { type: 'time' },
      y: { type: 'category' },
      cells: ['a', 'b', 'c'].flatMap((row) => hours.map((x) => ({ x, y: row, value: 1 }))),
    });
    expect(table.columns).toHaveLength(4);
    expect(table.rows).toHaveLength(24);
  });

  it('names one row with a copy word, not the chart title', () => {
    const { table } = read(titled('CPU on es-data-03'));
    expect(table.columns).toEqual(['Time (Europe/Amsterdam)', 'Value']);
    expect(table.rows.map(([, value]) => value)).toEqual(['42%', '71%', '93%', '97%', '64%']);
    expect(read(strip).table).toEqual({
      columns: ['Column', 'Value'],
      rows: [
        ['p', '1'],
        ['q', '2'],
      ],
    });
  });

  it('uses axis titles in the corner when given', () => {
    expect(read(titled('Disk used by node and tier')).table.columns[0]).toBe('Node / Tier');
    expect(read(base).table.columns[0]).toBe('Column / Row');
  });

  it('prints the key after a row label another row shares', () => {
    expect(read(titled('Disk used by node and tier')).table.rows.map(([row]) => row)).toEqual([
      'es-01 (prod/es-01)',
      'es-02',
      'es-01 (staging/es-01)',
    ]);
  });

  it('summarizes the highest cell and where it is', () => {
    expect(read(examples[0]!).summary).toBe(
      'web-02 at Oct 14, 10:00 has the highest value: 1.83K.'
    );
    expect(read(titled('Failed logins by weekday')).summary).toBe(
      'Wed has the highest value: 240.'
    );
  });

  it('adds the lowest cell on a diverging scale', () => {
    expect(read(titled('p95 latency change, week over week')).summary).toBe(
      'checkout at us-east-1 has the highest value: 18%. search at us-east-1 has the lowest: -12%.'
    );
  });

  it('counts the cells in the top band', () => {
    expect(read(titled('CPU on es-data-03')).summary).toBe(
      'Oct 14, 11:15 has the highest value: 97%. 2 of 5 cells fall in the top band, Saturated.'
    );
    expect(read(bands([{ from: 0, to: 5 }]) as HeatmapNode).summary).toBe(
      'q has the highest value: 2.'
    );
  });

  it('counts a value on the top band’s `to` in it', () => {
    expect(read(bands([{ to: 1 }, { from: 1, to: 2 }]) as HeatmapNode).summary).toBe(
      'q has the highest value: 2. 2 of 2 cells fall in the top band, 1 – 2.'
    );
  });

  it('summarizes a chart with no values without inventing one', () => {
    expect(read({ ...strip, cells: [{ x: 'p', value: null }] }).summary).toBe('No values.');
    expect(read({ ...strip, cells: [] }).table.rows).toEqual([['Value']]);
  });
});

describe('heatmap selection', () => {
  const selectable = examples.find(({ selection }) => selection)!;

  it('resolves a cell to its x and y predicates', () => {
    expect(
      selectionEvent(selectable.selection!, {
        x: '2026-10-14T11:00:00Z',
        y: 'priv-esc',
      }).context?.predicates
    ).toEqual([
      {
        field: '@timestamp',
        range: { gte: '2026-10-14T11:00:00Z', lt: '2026-10-14T12:00:00Z' },
      },
      { field: 'kibana.alert.rule.uuid', value: 'r-207' },
    ]);
  });

  it('keeps two rows that share a label apart by key', () => {
    const { y } = resolveHeatmap(titled('Disk used by node and tier'));
    expect(y?.map(({ key }) => key)).toEqual(['prod/es-01', 'prod/es-02', 'staging/es-01']);
    expect(new Set(y?.map(({ label }) => label)).size).toBe(3);
  });

  it('binds a declared category no cell uses', () => {
    expect(
      valid({
        ...base,
        y: { type: 'category', categories: [{ label: 'a' }, { label: 'b' }] },
        selection: {
          name: 's',
          on: { y: { b: [{ field: 'f', value: 'b' }] } },
        },
      })
    ).toBe(true);
  });
});

describe('heatmap grid', () => {
  const rule = `its columns times its rows, declared categories included, are at most ${MAX_GRID_CELLS}`;
  const side = Math.ceil(Math.sqrt(MAX_GRID_CELLS)) + 1;

  it('bounds the columns times the rows, counting sparse cells and declared categories', () => {
    const diagonal = Array.from({ length: side }, (_, index) => ({
      x: `x${index}`,
      y: `y${index}`,
      value: index,
    }));
    expect(messages({ ...base, cells: diagonal })).toEqual([rule]);
    expect(valid({ ...base, cells: diagonal.slice(0, 100) })).toBe(true);
    const categories = Array.from({ length: side }, (_, index) => ({ label: `c${index}` }));
    expect(
      messages({
        ...base,
        x: { type: 'category', categories },
        y: { type: 'category', categories },
        cells: [{ x: 'c0', y: 'c0', value: 1 }],
      })
    ).toEqual([rule]);
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { selectionEvent } from '../../model/selection';
import { MAX_DATA_POINTS } from '../../model/text';

import { examples } from './examples';
import { resolveDonut } from './model';
import { read } from './read';
import { type DonutNode, schema } from './schema';

const base: DonutNode = {
  type: 'donut',
  parts: [
    { label: 'a', value: 1 },
    { label: 'b', value: 3 },
  ],
};

const messages = (node: unknown): string[] =>
  schema.safeParse(node).error?.issues.map(({ message }) => message) ?? [];

const valid = (node: unknown) => messages(node).length === 0;

const withValues = (...values: number[]): DonutNode => ({
  type: 'donut',
  parts: values.map((value, index) => ({ label: `p${index}`, value })),
});

const shares = (node: DonutNode) => resolveDonut(node).parts.map(({ share }) => share);

const byTitle = (title: string) => examples.find((node) => node.title === title)!;

describe('donut schema', () => {
  it('accepts every example', () => {
    for (const node of examples) {
      expect({ title: node.title, errors: messages(node) }).toEqual({
        title: node.title,
        errors: [],
      });
    }
  });

  it('needs at least two parts, and caps them only at the pack-wide limit', () => {
    expect(valid(base)).toBe(true);
    expect(valid({ ...base, parts: [base.parts[0]] })).toBe(false);
    expect(valid(withValues(...Array.from({ length: 12 }, () => 1)))).toBe(true);
    expect(valid(withValues(...Array.from({ length: MAX_DATA_POINTS }, () => 1)))).toBe(true);
    expect(valid(withValues(...Array.from({ length: MAX_DATA_POINTS + 1 }, () => 1)))).toBe(false);
  });

  it('skips the rules that loop over parts once there are too many', () => {
    const parts = Array.from({ length: MAX_DATA_POINTS + 1 }, () => ({
      label: 'same',
      value: Number.MAX_VALUE,
    }));
    const reported = messages({
      type: 'donut',
      parts,
      selection: {
        name: 's',
        on: { slice: { other: [{ field: 'f', value: 1 }] } },
      },
    });
    expect(reported).toHaveLength(1);
    expect(reported).not.toContain('part keys are unique');
    expect(reported).not.toContain('the values sum to a finite total');
  });

  it('needs values of zero or more', () => {
    expect(valid(withValues(0, 0))).toBe(true);
    expect(valid(withValues(1, -1))).toBe(false);
  });

  it('needs values that sum to a finite total', () => {
    expect(valid(withValues(1e308, 1e307))).toBe(true);
    expect(messages(withValues(1e308, 1e308))).toContain('the values sum to a finite total');
    expect(valid(withValues(Number.MAX_VALUE, 0))).toBe(true);
  });

  it('needs unique part keys, defaulting to labels', () => {
    const [part] = base.parts;
    expect(valid({ ...base, parts: [part, { ...part, key: 'other' }] })).toBe(true);
    expect(messages({ ...base, parts: [part, part] })).toContain('part keys are unique');
  });

  it('refuses a free-text centre value, a shape, and a color', () => {
    expect(valid({ ...base, valueLabel: '42' })).toBe(false);
    expect(valid({ ...base, shape: 'pie' })).toBe(false);
    expect(
      valid({
        ...base,
        parts: [{ ...base.parts[0], color: 'red' }, base.parts[1]],
      })
    ).toBe(false);
  });

  it('binds selection keys only to declared part keys', () => {
    const rule = 'every key in `selection.on` names a key the chart’s data declares';
    const on = (key: string) => ({
      name: 's',
      on: { slice: { [key]: [{ field: 'f', value: key }] } },
    });
    expect(valid({ ...base, selection: on('a') })).toBe(true);
    expect(messages({ ...base, selection: on('c') })).toContain(`${rule}: slice.c`);
    expect(
      valid({
        ...base,
        selection: { name: 's', on: { x: { a: [{ field: 'f', value: 1 }] } } },
      })
    ).toBe(false);
  });

  it('reports every broken rule on unreadable input without throwing', () => {
    expect(valid({ type: 'donut', parts: 'nope' })).toBe(false);
    expect(valid({ type: 'donut', parts: [null, null] })).toBe(false);
  });
});

describe('resolveDonut', () => {
  it('resolves keys, keeps authored order, and totals the values', () => {
    expect(resolveDonut(byTitle('Documents by index'))).toEqual({
      parts: [
        {
          key: 'prod/logs',
          label: 'logs (prod/logs)',
          value: 182_000_000,
          share: 62.8,
        },
        {
          key: 'prod/metrics',
          label: 'metrics',
          value: 96_000_000,
          share: 33.1,
        },
        {
          key: 'staging/logs',
          label: 'logs (staging/logs)',
          value: 12_000_000,
          share: 4.1,
        },
      ],
      total: 290_000_000,
    });
  });

  it('rounds shares to tenths by largest remainder, summing to exactly 100', () => {
    expect(shares(byTitle('Storage by data tier'))).toEqual([11.4, 25.7, 57.2, 5.7]);
    for (const values of [
      [1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1],
      [2, 3, 5, 7, 11, 13],
      [0.1, 0.2, 0.3],
      [1e-9, 1, 1e12],
    ]) {
      const tenths = resolveDonut(withValues(...values)).parts.map(({ share }) =>
        Math.round(share! * 10)
      );
      expect({
        values,
        total: tenths.reduce((sum, tenth) => sum + tenth, 0),
      }).toEqual({ values, total: 1000 });
    }
  });

  it('gives a tied remainder to the earlier part', () => {
    expect(shares(withValues(1, 1, 1))).toEqual([33.4, 33.3, 33.3]);
  });

  it('gives a zero part a zero share', () => {
    expect(shares(withValues(0, 1))).toEqual([0, 100]);
  });

  it('derives no shares from a zero total', () => {
    expect(resolveDonut(withValues(0, 0))).toMatchObject({
      total: 0,
      parts: [{ share: null }, { share: null }],
    });
  });
});

describe('read', () => {
  it('tabulates part, value, and share per part in authored order', () => {
    expect(read(byTitle('Cloud spend by provider')).table).toEqual({
      columns: ['Part', 'Value', 'Share'],
      rows: [
        ['AWS', '$48.2K', '70.9%'],
        ['GCP', '$19.75K', '29.1%'],
        ['Azure', '$0', '0%'],
      ],
    });
  });

  it('prints a shared label with its key in the table and summary', () => {
    const reading = read(byTitle('Documents by index'));
    expect(reading.table.rows.map(([label]) => label)).toEqual([
      'logs (prod/logs)',
      'metrics',
      'logs (staging/logs)',
    ]);
    expect(reading.summary).toBe(
      'logs (prod/logs) is the largest part at 182M, 62.8% of the 290M total.'
    );
    expect(
      read({
        type: 'donut',
        parts: [
          { key: 'a', label: 'x', value: 5 },
          { key: 'b', label: 'x', value: 5 },
          { label: 'y', value: 1 },
        ],
      }).summary
    ).toBe('x (a) and x (b) tie as the largest parts at 5 each, of the 11 total.');
  });

  it('prints a negative-zero part as 0 at 0%', () => {
    expect(read(withValues(-0, 4)).table.rows).toEqual([
      ['p0', '0', '0%'],
      ['p1', '4', '100%'],
    ]);
  });

  it('names the largest part and its share of the total', () => {
    expect(read(byTitle('Storage by data tier')).summary).toBe(
      'cold is the largest part at 20 TB, 57.2% of the 35 TB total.'
    );
  });

  it('names every part tied for largest by value', () => {
    expect(read(withValues(5, 5, 1)).summary).toBe(
      'p0 and p1 tie as the largest parts at 5 each, of the 11 total.'
    );
    expect(read(withValues(1, 1, 1)).summary).toBe(
      'p0, p1, and p2 tie as the largest parts at 1 each, of the 3 total.'
    );
  });

  it('says there is nothing to split when the total is zero, and prints shares as missing', () => {
    const reading = read(byTitle('Failed snapshots by reason'));
    expect(reading.summary).toBe('Every part is zero, so there is nothing to split.');
    expect(reading.table.rows.map(([, value, share]) => [value, share])).toEqual([
      ['0', '—'],
      ['0', '—'],
      ['0', '—'],
    ]);
  });
});

describe('donut selection', () => {
  it('resolves a slice to its predicates', () => {
    const selectable = examples.find(({ selection }) => selection)!;
    expect(selectionEvent(selectable.selection!, { slice: 'high' }).context).toEqual({
      panelId: 'alerts-by-severity',
      target: { slice: 'high' },
      predicates: [{ field: 'kibana.alert.severity', value: 'high' }],
    });
  });
});

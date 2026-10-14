/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { selectionEvent } from '../../model/selection';
import { MAX_DATA_POINTS } from '../../model/text';

import { examples } from './examples';
import { resolveGauge } from './model';
import { read } from './read';
import { type GaugeNode, schema } from './schema';

const base: GaugeNode = {
  type: 'gauge',
  title: 'CPU',
  value: 40,
  domain: { min: 0, max: 100 },
};

const banded: GaugeNode = {
  ...base,
  bands: [
    { to: 50, tone: 'success', label: 'Healthy' },
    { to: 80, tone: 'warning' },
    { to: 100, tone: 'danger', label: 'Critical' },
  ],
};

const messages = (node: unknown): string[] =>
  schema.safeParse(node).error?.issues.map(({ message }) => message) ?? [];

const valid = (node: unknown) => messages(node).length === 0;

const byTitle = (title: string) => examples.find((node) => node.title === title)!;

describe('gauge schema', () => {
  it('accepts every example', () => {
    for (const node of examples) {
      expect(messages(node)).toEqual([]);
    }
  });

  it('needs `min` below `max`', () => {
    const rule = '`min` is below `max`';
    expect(valid({ ...base, domain: { min: 0, max: 0.001 } })).toBe(true);
    expect(messages({ ...base, domain: { min: 1, max: 1 } })).toContain(rule);
    expect(messages({ ...base, domain: { min: 2, max: 1 } })).toContain(rule);
  });

  it('needs a title', () => {
    const { title: _title, ...untitled } = base;
    expect(valid(untitled)).toBe(false);
    expect(valid({ ...base, title: '' })).toBe(false);
  });

  it('needs a finite span from `min` to `max`', () => {
    const rule = '`max - min` is finite';
    const max = Number.MAX_VALUE;
    expect(valid({ ...base, value: 0, domain: { min: 0, max } })).toBe(true);
    expect(valid({ ...base, value: 0, domain: { min: -max / 2, max: max / 2 } })).toBe(true);
    expect(messages({ ...base, domain: { min: -1.7e308, max: 1.7e308 } })).toContain(rule);
    expect(messages({ ...base, domain: { min: -max, max } })).toContain(rule);
  });

  it('needs a finite distance from the value to the target', () => {
    const rule = '`value - target` is finite';
    const max = Number.MAX_VALUE;
    const wide = { ...base, domain: { min: -max, max: 0 } };
    expect(valid({ ...wide, value: 0, target: -max })).toBe(true);
    expect(valid({ ...wide, value: max, target: 0 })).toBe(true);
    expect(valid({ ...wide, value: null, target: -max })).toBe(true);
    expect(messages({ ...wide, value: max, target: -max })).toContain(rule);
    expect(messages({ ...wide, value: -max, target: max })).toContain(rule);
  });

  it('takes a value outside the domain, and `null`', () => {
    expect(valid({ ...base, value: 140 })).toBe(true);
    expect(valid({ ...base, value: -5 })).toBe(true);
    expect(valid({ ...base, value: null })).toBe(true);
    expect(valid({ ...base, value: undefined })).toBe(false);
  });

  it('needs a target within the domain, ends included', () => {
    const rule = '`target` lies within `domain`, ends included';
    expect(valid({ ...base, target: 0 })).toBe(true);
    expect(valid({ ...base, target: 100 })).toBe(true);
    expect(messages({ ...base, target: 100.5 })).toContain(rule);
    expect(messages({ ...base, target: -1 })).toContain(rule);
  });

  it('needs band ends to ascend from `domain.min`', () => {
    const rule =
      'each band’s `to` is above the previous band’s, and the first band’s above `domain.min`';
    expect(valid({ ...base, bands: [{ to: 0.5, tone: 'success' }] })).toBe(true);
    expect(messages({ ...base, bands: [{ to: 0, tone: 'success' }] })).toContain(rule);
    expect(
      messages({
        ...base,
        bands: [
          { to: 50, tone: 'success' },
          { to: 50, tone: 'danger' },
        ],
      })
    ).toContain(rule);
    expect(
      messages({
        ...base,
        bands: [
          { to: 60, tone: 'success' },
          { to: 40, tone: 'danger' },
        ],
      })
    ).toContain(rule);
  });

  it('leaves an over-long band list to the count rule', () => {
    const descending = Array.from({ length: MAX_DATA_POINTS + 1 }, () => ({
      to: 50,
      tone: 'neutral',
    }));
    const found = messages({ ...base, bands: descending });
    expect(found.length).toBeGreaterThan(0);
    expect(found).not.toContain(
      'each band’s `to` is above the previous band’s, and the first band’s above `domain.min`'
    );
  });

  it('needs the last band to end at most at `domain.max`', () => {
    const rule = 'the last band’s `to` is at most `domain.max`';
    expect(valid({ ...base, bands: [{ to: 100, tone: 'success' }] })).toBe(true);
    expect(valid({ ...base, bands: [{ to: 60, tone: 'success' }] })).toBe(true);
    expect(messages({ ...base, bands: [{ to: 100.1, tone: 'success' }] })).toContain(rule);
  });

  it('needs a tone on every band, at least one band, and no color', () => {
    expect(valid({ ...base, bands: [{ to: 50 }] })).toBe(false);
    expect(valid({ ...base, bands: [] })).toBe(false);
    expect(valid({ ...base, bands: [{ to: 50, tone: 'success', color: '#0f0' }] })).toBe(false);
    expect(valid({ ...base, bands: [{ from: 0, to: 50, tone: 'success' }] })).toBe(false);
  });

  it('holds at most the pack-wide number of bands', () => {
    const sized = (count: number) => ({
      ...base,
      domain: { min: 0, max: count },
      bands: Array.from({ length: count }, (_, index) => ({
        to: index + 1,
        tone: 'neutral',
      })),
    });
    expect(valid(sized(MAX_DATA_POINTS))).toBe(true);
    expect(valid(sized(MAX_DATA_POINTS + 1))).toBe(false);
  });

  it('takes only `arc` and `bar` shapes', () => {
    expect(valid({ ...base, shape: 'bar' })).toBe(true);
    expect(valid({ ...base, shape: 'bullet' })).toBe(false);
  });

  it('refuses NaN and infinite values, and fields it does not define', () => {
    expect(valid({ ...base, value: Number.NaN })).toBe(false);
    expect(valid({ ...base, value: Number.POSITIVE_INFINITY })).toBe(false);
    expect(valid({ ...base, color: '#f00' })).toBe(false);
    expect(valid({ ...base, band: 'Healthy' })).toBe(false);
  });

  it('reports a bad domain without throwing in the band and target checks', () => {
    expect(valid({ ...banded, target: 10, domain: { min: 'a', max: 100 } })).toBe(false);
    expect(valid({ ...banded, domain: undefined })).toBe(false);
  });
});

describe('resolveGauge', () => {
  it('defaults to an arc and resolves each band from where the previous ends', () => {
    const resolved = resolveGauge(banded);
    expect(resolved.shape).toBe('arc');
    expect(resolved.bands).toEqual([
      { from: 0, to: 50, tone: 'success', label: 'Healthy' },
      { from: 50, to: 80, tone: 'warning' },
      { from: 80, to: 100, tone: 'danger', label: 'Critical' },
    ]);
    expect(resolveGauge({ ...base, shape: 'bar' }).shape).toBe('bar');
  });

  it('places a value within the domain as authored', () => {
    expect(resolveGauge({ ...base, target: 75 })).toMatchObject({
      value: 40,
      position: 40,
      fraction: 0.4,
      range: 'within',
      targetFraction: 0.75,
    });
  });

  it('clamps a value outside the domain and says which side', () => {
    expect(resolveGauge({ ...banded, value: 140 })).toMatchObject({
      value: 140,
      position: 100,
      fraction: 1,
      range: 'above',
      band: undefined,
    });
    expect(resolveGauge({ ...banded, value: -5 })).toMatchObject({
      position: 0,
      fraction: 0,
      range: 'below',
      band: undefined,
    });
  });

  it('puts a boundary value in the band that starts there, and the last band’s end in it', () => {
    expect(resolveGauge({ ...banded, value: 0 }).band?.label).toBe('Healthy');
    expect(resolveGauge({ ...banded, value: 50 }).band?.tone).toBe('warning');
    expect(resolveGauge({ ...banded, value: 100 }).band?.label).toBe('Critical');
  });

  it('finds no band past the last one, or for no value', () => {
    const short: GaugeNode = { ...base, bands: [{ to: 50, tone: 'success' }] };
    expect(resolveGauge({ ...short, value: 50 }).band?.tone).toBe('success');
    expect(resolveGauge({ ...short, value: 70 }).band).toBeUndefined();
    expect(resolveGauge({ ...banded, value: null })).toMatchObject({
      position: null,
      fraction: null,
      range: null,
      band: undefined,
      targetFraction: undefined,
    });
  });

  it('measures fractions from a domain that does not start at zero', () => {
    const { fraction, targetFraction } = resolveGauge(byTitle('Checkout availability'));
    expect(fraction).toBeCloseTo(0.71);
    expect(targetFraction).toBeCloseTo(0.9);
  });
});

describe('read', () => {
  it('summarizes the canonical example in its band', () => {
    expect(read(examples[0]!).summary).toBe(
      'Disk used on es-data-01 is 87% of 100%, in Low watermark.'
    );
  });

  it('names the tone when the band has no label', () => {
    expect(read({ ...banded, value: 60 }).summary).toBe('CPU is 60 of 100, in the warning band.');
    expect(read({ ...banded, value: 60 }).table.rows[0]).toContain('Warning');
  });

  it('says the value is above or below the range rather than in a band', () => {
    expect(read(byTitle('Daily ingest')).summary).toBe(
      'Daily ingest is 590 GB of 500 GB, above the range.'
    );
    expect(read({ ...banded, value: -5 }).summary).toBe('CPU is -5 of 100, below the range.');
  });

  it('gives the distance from target, either side or on it', () => {
    expect(read(byTitle('Checkout p95 latency')).summary).toBe(
      'Checkout p95 latency is 412 ms of 1 s, in Slow, 112 ms over target.'
    );
    expect(read({ ...base, target: 50 }).summary).toBe('CPU is 40 of 100, 10 under target.');
    expect(read({ ...base, target: 40 }).summary).toBe('CPU is 40 of 100, on target.');
  });

  it('reads a negative zero as zero and on a zero target', () => {
    expect(read({ ...base, value: -0, target: 0 }).summary).toBe('CPU is 0 of 100, on target.');
    expect(read({ ...base, value: 0, target: -0 }).summary).toBe('CPU is 0 of 100, on target.');
    expect(
      read({ ...base, value: -0, target: 0, domain: { min: -0, max: 100 } }).table.rows[0]
    ).toEqual(['0', '0', '0 – 100']);
  });

  it('prints the extremes of a finite span without overflow', () => {
    const max = Number.MAX_VALUE;
    const { fraction } = resolveGauge({
      ...base,
      value: max,
      domain: { min: 0, max },
    });
    expect(fraction).toBe(1);
  });

  it('names both ends of a range that does not start at zero', () => {
    expect(read(byTitle('Checkout availability')).summary).toBe(
      'Checkout availability is 99.71% on a scale of 99.00% to 100.00%, in At risk, 0.19% under target.'
    );
  });

  it('says there is no value rather than inventing one', () => {
    const noData = byTitle('Fleet agents healthy');
    expect(read(noData).summary).toBe('Fleet agents healthy has no value.');
    expect(read(noData).table).toEqual({
      columns: ['Value', 'Range'],
      rows: [['—', '0% – 100%']],
    });
  });

  it('reads as one row of value, target, range, and band', () => {
    expect(read(byTitle('Checkout p95 latency')).table).toEqual({
      columns: ['Value', 'Target', 'Range', 'Band'],
      rows: [['412 ms', '300 ms', '0 ms – 1 s', 'Slow']],
    });
    expect(read(byTitle('Daily ingest')).table.rows[0]).toEqual([
      '590 GB',
      '0 B – 500 GB',
      'Above the range',
    ]);
    expect(read({ ...banded, value: -5 }).table.rows[0]![2]).toBe('Below the range');
  });

  it('prints the band cell as missing past the last band', () => {
    expect(
      read({ ...base, value: 70, bands: [{ to: 50, tone: 'success' }] }).table.rows[0]
    ).toEqual(['70', '0 – 100', '—']);
  });
});

describe('gauge selection', () => {
  const selectable = examples.find(({ selection }) => selection)!;

  it('raises the event for a whole-chart click with an empty target', () => {
    expect(selectionEvent(selectable.selection!, {})).toEqual({
      name: 'dashboard/select',
      context: { panelId: 'anomaly-score', target: {}, predicates: [] },
    });
  });

  it('is selectable only as a whole, with no predicates to bind', () => {
    expect(valid({ ...base, selection: { name: 's' } })).toBe(true);
    expect(valid({ ...base, selection: { name: 's', on: {} } })).toBe(false);
  });
});

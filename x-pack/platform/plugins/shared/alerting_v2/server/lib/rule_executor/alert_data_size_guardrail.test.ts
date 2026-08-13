/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { enforceAlertDataSize, exceedsJsonSizeBudget } from './alert_data_size_guardrail';

describe('exceedsJsonSizeBudget', () => {
  it.each([
    [null, 4],
    ['abc', 5],
    [42, 2],
    [-1.5, 4],
    [true, 4],
    [false, 5],
    [[], 2],
    [{}, 2],
    [['a', 'b'], 9],
    [{ a: 1 }, 7],
    [{ a: 1, b: 'x' }, 15],
    [{ nested: { list: [1, 2, 3] } }, 27],
  ])('estimates %j as %i bytes (matching JSON.stringify)', (value, expected) => {
    expect(JSON.stringify(value)).toHaveLength(expected);
    expect(exceedsJsonSizeBudget(value, expected)).toBe(false);
    expect(exceedsJsonSizeBudget(value, expected - 1)).toBe(true);
  });

  it('counts multi-byte characters by UTF-8 byte length', () => {
    // '€' is 3 bytes in UTF-8, plus 2 quotes.
    expect(exceedsJsonSizeBudget('€', 5)).toBe(false);
    expect(exceedsJsonSizeBudget('€', 4)).toBe(true);
  });

  it('skips undefined object entries like JSON.stringify does', () => {
    expect(exceedsJsonSizeBudget({ a: undefined, b: 1 }, JSON.stringify({ b: 1 }).length)).toBe(
      false
    );
  });

  it('bails out early on values far larger than the budget', () => {
    const huge = { message: 'x'.repeat(10_000_000) };
    // The estimator short-circuits as soon as the budget is exhausted — it
    // reads at most a few bytes of the string rather than serialising the full
    // value, so this must return true without OOMing.
    expect(exceedsJsonSizeBudget(huge, 1000)).toBe(true);
  });
});

describe('enforceAlertDataSize', () => {
  it('passes rows within the budget through untouched', () => {
    const rowDoc = { 'host.name': 'host-a', count: 3 };

    const result = enforceAlertDataSize({
      rowDoc,
      groupingFields: ['host.name'],
      maxBytes: 5000,
    });

    expect(result.truncated).toBe(false);
    expect(result.data).toBe(rowDoc);
  });

  it('replaces an oversized row with a payload of only the grouping fields', () => {
    const result = enforceAlertDataSize({
      rowDoc: { 'host.name': 'host-a', region: 'us-east', message: 'x'.repeat(1000) },
      groupingFields: ['host.name', 'region'],
      maxBytes: 200,
    });

    expect(result.truncated).toBe(true);
    expect(result.data).toEqual({
      'host.name': 'host-a',
      region: 'us-east',
    });
  });

  it('produces an empty payload when the rule has no grouping fields', () => {
    const result = enforceAlertDataSize({
      rowDoc: { message: 'x'.repeat(1000) },
      groupingFields: [],
      maxBytes: 200,
    });

    expect(result.truncated).toBe(true);
    expect(result.data).toEqual({});
  });

  it('clips oversized string grouping values to fit the budget', () => {
    const result = enforceAlertDataSize({
      rowDoc: { 'host.name': 'h'.repeat(1000) },
      groupingFields: ['host.name'],
      maxBytes: 200,
    });

    expect(result.truncated).toBe(true);
    const clipped = result.data['host.name'] as string;
    expect(clipped).toMatch(/^h+$/);
    expect(clipped.length).toBeGreaterThan(0);
    expect(JSON.stringify(result.data).length).toBeLessThanOrEqual(200);
  });

  it('does not split a multi-byte character when clipping', () => {
    const result = enforceAlertDataSize({
      rowDoc: { 'host.name': '€'.repeat(1000) },
      groupingFields: ['host.name'],
      maxBytes: 200,
    });

    const clipped = result.data['host.name'] as string;
    expect(clipped).toMatch(/^€+$/);
    expect(Buffer.byteLength(JSON.stringify(result.data), 'utf8')).toBeLessThanOrEqual(200);
  });

  it('splits the budget across multiple grouping fields', () => {
    const result = enforceAlertDataSize({
      rowDoc: { first: 'a'.repeat(1000), second: 'b'.repeat(1000) },
      groupingFields: ['first', 'second'],
      maxBytes: 200,
    });

    expect(result.truncated).toBe(true);
    expect((result.data.first as string).length).toBeGreaterThan(0);
    expect((result.data.second as string).length).toBeGreaterThan(0);
    expect(JSON.stringify(result.data).length).toBeLessThanOrEqual(200);
  });

  it('rolls unused budget over to the next grouping field', () => {
    const result = enforceAlertDataSize({
      rowDoc: { tiny: 'a', big: 'b'.repeat(1000), filler: 'x'.repeat(1000) },
      groupingFields: ['tiny', 'big'],
      maxBytes: 200,
    });

    expect(result.data.tiny).toBe('a');
    // `big` gets more than half of the budget because `tiny` barely used its share.
    expect((result.data.big as string).length).toBeGreaterThan(100);
    expect(JSON.stringify(result.data).length).toBeLessThanOrEqual(200);
  });

  it('keeps non-string grouping values that fit whole and drops ones that do not', () => {
    const result = enforceAlertDataSize({
      rowDoc: {
        count: 42,
        values: Array.from({ length: 500 }, (_, i) => i),
        filler: 'x'.repeat(1000),
      },
      groupingFields: ['count', 'values'],
      maxBytes: 200,
    });

    expect(result.truncated).toBe(true);
    expect(result.data.count).toBe(42);
    expect(result.data.values).toBeUndefined();
  });

  it('skips grouping fields missing from the row', () => {
    const result = enforceAlertDataSize({
      rowDoc: { present: 'a', filler: 'x'.repeat(1000) },
      groupingFields: ['missing', 'present'],
      maxBytes: 200,
    });

    expect(result.data).toEqual({ present: 'a' });
  });
});

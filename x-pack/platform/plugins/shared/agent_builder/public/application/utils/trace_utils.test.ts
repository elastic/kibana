/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { normalizeTraceId, parseTraceSpansFromFile } from './trace_utils';

describe('normalizeTraceId', () => {
  it('returns undefined for null', () => {
    expect(normalizeTraceId(null)).toBeUndefined();
  });

  it('returns undefined for undefined', () => {
    expect(normalizeTraceId(undefined)).toBeUndefined();
  });

  it('returns the string as-is for a scalar string', () => {
    expect(normalizeTraceId('abc-123')).toBe('abc-123');
  });

  it('returns the first element for a single-item array', () => {
    expect(normalizeTraceId(['abc-123'])).toBe('abc-123');
  });

  it('returns the first element for a multi-item array', () => {
    expect(normalizeTraceId(['first', 'second'])).toBe('first');
  });
});

const makeFile = (content: string): File =>
  new File([content], 'trace.json', { type: 'application/json' });

describe('parseTraceSpansFromFile', () => {
  it('accepts a bare TraceSpan array', async () => {
    const spans = [{ span_id: 'a' }, { span_id: 'b' }];
    const result = await parseTraceSpansFromFile(makeFile(JSON.stringify(spans)));
    expect(result).toEqual(spans);
  });

  it('accepts the { spans } envelope format', async () => {
    const spans = [{ span_id: 'a' }];
    const result = await parseTraceSpansFromFile(makeFile(JSON.stringify({ spans })));
    expect(result).toEqual(spans);
  });

  it('accepts an empty array', async () => {
    const result = await parseTraceSpansFromFile(makeFile(JSON.stringify([])));
    expect(result).toEqual([]);
  });

  it('rejects an array where any element lacks span_id', async () => {
    const result = await parseTraceSpansFromFile(
      makeFile(JSON.stringify([{ span_id: 'a' }, { name: 'no-id' }]))
    );
    expect(result).toBeNull();
  });

  it('rejects an array containing null', async () => {
    const result = await parseTraceSpansFromFile(
      makeFile(JSON.stringify([{ span_id: 'a' }, null]))
    );
    expect(result).toBeNull();
  });

  it('rejects a plain object without a spans key', async () => {
    const result = await parseTraceSpansFromFile(makeFile(JSON.stringify({ foo: 'bar' })));
    expect(result).toBeNull();
  });

  it('rejects invalid JSON', async () => {
    await expect(parseTraceSpansFromFile(makeFile('not json'))).rejects.toThrow();
  });
});

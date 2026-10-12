/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mergeObjectElements, mergeSamples } from './merge_samples';

describe('mergeSamples', () => {
  it('returns empty object for empty input', () => {
    expect(mergeSamples([])).toEqual({});
  });

  it('returns the doc itself for a single doc', () => {
    const doc = { foo: 'bar', count: 42 };
    expect(mergeSamples([doc])).toEqual({ foo: 'bar', count: 42 });
  });

  it('merges multiple docs with distinct keys', () => {
    const docs = [{ a: 1 }, { b: 'hello' }, { c: true }];
    expect(mergeSamples(docs)).toEqual({ a: 1, b: 'hello', c: true });
  });

  it('deep-merges nested objects', () => {
    const docs = [
      { server: { ip: '1.2.3.4' } },
      { server: { port: 443, hostname: 'example.com' } },
    ];
    const result = mergeSamples(docs);
    expect(result).toEqual({
      server: { ip: '1.2.3.4', port: 443, hostname: 'example.com' },
    });
  });

  it('keeps the first non-empty value when keys overlap', () => {
    const docs = [{ status: 'ok' }, { status: 'error' }];
    const result = mergeSamples(docs);
    expect(result.status).toBe('ok');
  });

  it('fills empty values from later docs', () => {
    const docs = [{ status: null }, { status: 'active' }];
    const result = mergeSamples(docs);
    expect(result.status).toBe('active');
  });

  it('prefers objects over scalars', () => {
    expect(mergeSamples([{ value: 'x' }, { value: { a: 1 } }])).toEqual({ value: { a: 1 } });
    expect(mergeSamples([{ value: { a: 1 } }, { value: 'x' }])).toEqual({ value: { a: 1 } });
  });

  it('concatenates arrays across docs', () => {
    const docs = [{ tags: ['web', 'prod'] }, { tags: ['staging'] }];
    const result = mergeSamples(docs);
    expect(result.tags).toEqual(['web', 'prod', 'staging']);
  });

  it('replaces a scalar with a later array', () => {
    const docs = [{ tags: 'web' }, { tags: ['staging'] }];
    const result = mergeSamples(docs);
    expect(result.tags).toEqual(['staging']);
  });

  it('skips unsafe property names', () => {
    const docs = [{ __proto__: { polluted: true }, safe_field: 'ok' }];
    const result = mergeSamples(docs);
    expect(result.safe_field).toBe('ok');
    expect((result as Record<string, unknown>).__proto__).toBeUndefined();
  });
});

describe('mergeObjectElements', () => {
  it('merges the object elements of an array', () => {
    expect(mergeObjectElements([{ name: 'a', id: 1 }, 'ignored', { zone: 'dmz' }])).toEqual({
      name: 'a',
      id: 1,
      zone: 'dmz',
    });
  });

  it('returns undefined when the array has no object elements', () => {
    expect(mergeObjectElements([])).toBeUndefined();
    expect(mergeObjectElements(['a', 1, null, [{ nested: true }]])).toBeUndefined();
  });
});

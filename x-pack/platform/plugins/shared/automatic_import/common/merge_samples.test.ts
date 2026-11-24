/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mergeObjectElements, mergeSamples, mergeValueTypes } from './merge_samples';

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

  it('keeps every value when keys overlap, in order', () => {
    expect(mergeSamples([{ status: 'ok' }, { status: 'error' }])).toEqual({
      status: ['ok', 'error'],
    });
    expect(mergeSamples([{ f: 'a' }, { f: 'b' }, { f: 1 }, { f: 'c' }])).toEqual({
      f: ['a', 'b', 1, 'c'],
    });
  });

  it('keeps each repeated value once', () => {
    expect(mergeSamples([{ status: 'ok' }, { status: 'ok' }])).toEqual({ status: 'ok' });
    expect(
      mergeSamples([{ f: 'a' }, { f: 1 }, { f: 'a' }, { f: '1' }, { f: ['b', 1, 'b'] }])
    ).toEqual({ f: ['a', 1, '1', 'b'] });
    expect(mergeSamples([{ tags: ['web', 'web'] }, { tags: 'web' }])).toEqual({ tags: ['web'] });
    expect(mergeObjectElements([{ score: 1 }, { score: 1 }, { score: 0.5 }])).toEqual({
      score: [1, 0.5],
    });
  });

  it('keeps whole and decimal numbers together in an array', () => {
    expect(mergeSamples([{ score: 3 }, { score: 3.14 }])).toEqual({ score: [3, 3.14] });
    expect(mergeSamples([{ score: 3.14 }, { score: 3 }])).toEqual({ score: [3.14, 3] });
  });

  it('keeps values of different types together in an array', () => {
    expect(mergeSamples([{ port: 443 }, { port: 'tcp' }])).toEqual({ port: [443, 'tcp'] });
    expect(mergeSamples([{ port: 'tcp' }, { port: 443 }])).toEqual({ port: ['tcp', 443] });
    expect(mergeSamples([{ flag: 1 }, { flag: true }, { flag: 2 }])).toEqual({
      flag: [1, true, 2],
    });
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

  it('combines a plain value and an array under the same key, in either order', () => {
    expect(mergeSamples([{ tags: 'web' }, { tags: ['staging'] }])).toEqual({
      tags: ['web', 'staging'],
    });
    expect(mergeSamples([{ tags: ['staging'] }, { tags: 'web' }])).toEqual({
      tags: ['staging', 'web'],
    });
  });

  it('keeps a value when a later doc has an empty array', () => {
    expect(mergeSamples([{ owner: { name: 'a' } }, { owner: [] }])).toEqual({
      owner: { name: 'a' },
    });
    expect(mergeSamples([{ tags: ['web'] }, { tags: [] }])).toEqual({ tags: ['web'] });
    expect(mergeSamples([{ owner: [] }, { owner: { name: 'a' } }])).toEqual({
      owner: { name: 'a' },
    });
  });

  it('merges an object with an array of objects under the same key', () => {
    expect(mergeSamples([{ owner: { name: 'a' } }, { owner: [{ team: 'x' }, 'ignored'] }])).toEqual(
      { owner: { name: 'a', team: 'x' } }
    );
    expect(mergeSamples([{ owner: [{ team: 'x' }] }, { owner: { name: 'a' } }])).toEqual({
      owner: { team: 'x', name: 'a' },
    });
  });

  it('does not change the docs it merges', () => {
    const docs = [
      { tags: ['web'], server: { ip: '1.2.3.4' } },
      { tags: ['prod'], server: [{ port: 443 }] },
    ];
    const copy = JSON.parse(JSON.stringify(docs));

    mergeSamples(docs);

    expect(docs).toEqual(copy);
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

  it('keeps differently typed values from every element without changing them', () => {
    expect(mergeObjectElements([{ score: 1 }, { score: 0.5 }])).toEqual({ score: [1, 0.5] });
    expect(mergeObjectElements([{ flag: true }, { flag: 1 }, { flag: [false] }])).toEqual({
      flag: [true, 1, false],
    });
  });

  it('returns undefined when the array has no object elements', () => {
    expect(mergeObjectElements([])).toBeUndefined();
    expect(mergeObjectElements(['a', 1, null, [{ nested: true }]])).toBeUndefined();
  });
});

describe('mergeValueTypes', () => {
  it('returns the type all values share', () => {
    expect(mergeValueTypes(['long', 'long'], 'keyword')).toBe('long');
  });

  it('returns double for whole and decimal numbers', () => {
    expect(mergeValueTypes(['long', 'double', 'long'], 'keyword')).toBe('double');
  });

  it('returns the fallback type for other mixes or no values', () => {
    expect(mergeValueTypes(['long', 'keyword'], 'keyword')).toBe('keyword');
    expect(mergeValueTypes(['long', 'boolean'], 'string')).toBe('string');
    expect(mergeValueTypes([], 'keyword')).toBe('keyword');
  });
});

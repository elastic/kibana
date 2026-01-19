/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mergeAndChunkSamples } from './chunk';

describe('test chunks', () => {
  it('mergeAndChunkSamples()', async () => {
    const objects = ['{"a": 1, "b": 2, "c": {"d": 3}}', '{"a": 2, "b": 3, "e": 4}'];
    const chunkSize = 2;
    const result = mergeAndChunkSamples(objects, chunkSize);
    expect(result).toStrictEqual([
      JSON.stringify({ a: 1, b: 2 }, null, 2),
      JSON.stringify({ c: { d: 3 }, e: 4 }, null, 2),
    ]);
  });
  it('handles empty objects', () => {
    const objects = ['{}', '{}'];
    const chunkSize = 2;
    const result = mergeAndChunkSamples(objects, chunkSize);
    expect(result).toStrictEqual([]);
  });

  it('handles large objects with custom chunk size', () => {
    const objects = ['{"a": 1, "b": 2, "c": 3, "d": 4}', '{"e": 5, "f": 6, "g": 7, "h": 8}'];
    const chunkSize = 3;
    const result = mergeAndChunkSamples(objects, chunkSize);
    expect(result).toStrictEqual([
      JSON.stringify({ a: 1, b: 2, c: 3 }, null, 2),
      JSON.stringify({ d: 4, e: 5, f: 6 }, null, 2),
      JSON.stringify({ g: 7, h: 8 }, null, 2),
    ]);
  });

  it('safely handles prototype pollution attempts', () => {
    const objects = [
      '{"a": 1, "__proto__": {"polluted": true}, "constructor": {"ignored": true}}',
      '{"b": 2, "prototype": {"unsafe": true}, "constructor": {"bad": true}}',
    ];
    const chunkSize = 2;
    const result = mergeAndChunkSamples(objects, chunkSize);
    expect(result).toStrictEqual([JSON.stringify({ a: 1, b: 2 }, null, 2)]);
  });
});

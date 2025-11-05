/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getMedianStringLength } from './get_median_string_length';

const strings: string[] = [
  'foo',
  'foofoofoofoofoo',
  'foofoofoo',
  'f',
  'f',
  'foofoofoofoofoofoofoo',
];
const noStrings: string[] = [];

describe('getMedianStringLength', () => {
  test('test median for string array', () => {
    const result = getMedianStringLength(strings);
    expect(result).toBe(9);
  });

  test('test median for no strings', () => {
    const result = getMedianStringLength(noStrings);
    expect(result).toBe(0);
  });
});

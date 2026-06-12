/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getCsvFromData } from '.';

describe('getCsvFromData', () => {
  it('returns the expected csv', () => {
    const data: Record<string, string[]> = {
      a: ['1', '2', '3'],
      b: ['4', '5', '6'],
      c: ['7', '8', '9'],
    };

    const result = getCsvFromData(data);

    expect(result).toBe('a,1,2,3\nb,4,5,6\nc,7,8,9');
  });

  it('returns an empty string for empty data', () => {
    const data: Record<string, string[]> = {};

    const result = getCsvFromData(data);

    expect(result).toBe('');
  });

  it('sorts the keys alphabetically', () => {
    const data: Record<string, string[]> = {
      b: ['1', '2', '3'],
      a: ['4', '5', '6'],
      c: ['7', '8', '9'],
    };

    const result = getCsvFromData(data);

    expect(result).toBe('a,4,5,6\nb,1,2,3\nc,7,8,9');
  });

  it('correctly handles single-element arrays', () => {
    const data: Record<string, string[]> = {
      a: ['1'],
      b: ['2'],
      c: ['3'],
    };

    const result = getCsvFromData(data);

    expect(result).toBe('a,1\nb,2\nc,3');
  });
});

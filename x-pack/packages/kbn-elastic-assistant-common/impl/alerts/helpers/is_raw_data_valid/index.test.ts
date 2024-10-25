/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isRawDataValid } from '.';

describe('isRawDataValid', () => {
  it('returns true for valid raw data', () => {
    const rawData = {
      field1: [1, 2, 3], // the Fields API may return a number array
      field2: ['a', 'b', 'c'], // the Fields API may return a string array
    };

    expect(isRawDataValid(rawData)).toBe(true);
  });

  it('returns true when a field array is empty', () => {
    const rawData = {
      field1: [1, 2, 3], // the Fields API may return a number array
      field2: ['a', 'b', 'c'], // the Fields API may return a string array
      field3: [], // the Fields API may return an empty array
    };

    expect(isRawDataValid(rawData)).toBe(true);
  });

  it('returns false when a field does not have an array of values', () => {
    const rawData = {
      field1: [1, 2, 3],
      field2: 'invalid',
    };

    expect(isRawDataValid(rawData)).toBe(false);
  });

  it('returns true for empty raw data', () => {
    const rawData = {};

    expect(isRawDataValid(rawData)).toBe(true);
  });

  it('returns false when raw data is an unexpected type', () => {
    const rawData = 1234;

    // @ts-expect-error
    expect(isRawDataValid(rawData)).toBe(false);
  });
});

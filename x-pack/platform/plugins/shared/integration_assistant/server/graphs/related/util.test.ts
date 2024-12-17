/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deepCopySkipArrays } from './util';

describe('deepCopySkipArrays', () => {
  it('should skip arrays and deeply copy objects', () => {
    const input = {
      field: ['a', 'b'],
      another: { field: 'c' },
    };

    const expectedOutput = {
      another: { field: 'c' },
    };

    expect(deepCopySkipArrays(input)).toEqual(expectedOutput);
  });

  it('should return primitive types as is', () => {
    expect(deepCopySkipArrays(42)).toBe(42);
    expect(deepCopySkipArrays('string')).toBe('string');
    expect(deepCopySkipArrays(true)).toBe(true);
  });

  it('should handle nested objects and skip nested arrays', () => {
    const input = {
      level1: {
        level2: {
          array: [1, 2, 3],
          value: 'test',
        },
      },
    };

    const expectedOutput = {
      level1: {
        level2: {
          value: 'test',
        },
      },
    };

    expect(deepCopySkipArrays(input)).toEqual(expectedOutput);
  });

  it('should return undefined for arrays', () => {
    expect(deepCopySkipArrays([1, 2, 3])).toBeUndefined();
  });

  it('should handle null and undefined values', () => {
    expect(deepCopySkipArrays(null)).toBeNull();
    expect(deepCopySkipArrays(undefined)).toBeUndefined();
  });

  it('should handle empty objects', () => {
    expect(deepCopySkipArrays({})).toEqual({});
  });

  it('should handle objects with mixed types', () => {
    const input = {
      number: 1,
      string: 'test',
      boolean: true,
      object: { key: 'value' },
      array: [1, 2, 3],
    };

    const expectedOutput = {
      number: 1,
      string: 'test',
      boolean: true,
      object: { key: 'value' },
    };

    expect(deepCopySkipArrays(input)).toEqual(expectedOutput);
  });

  // Test case
  it('should skip arrays and deeply copy objects with nested arrays', () => {
    const input = {
      field: ['a', 'b'],
      another: { field: 'c' },
    };

    const expectedOutput = {
      another: { field: 'c' },
    };

    expect(deepCopySkipArrays(input)).toEqual(expectedOutput);
  });

  it('should handle objects with nested empty arrays', () => {
    const input = {
      field: [],
      another: { field: 'c' },
    };

    const expectedOutput = {
      another: { field: 'c' },
    };

    expect(deepCopySkipArrays(input)).toEqual(expectedOutput);
  });

  it('should handle objects with nested arrays containing objects', () => {
    const input = {
      field: [{ key: 'value' }],
      another: { field: 'c' },
    };

    const expectedOutput = {
      another: { field: 'c' },
    };

    expect(deepCopySkipArrays(input)).toEqual(expectedOutput);
  });

  it('should handle objects with nested arrays containing mixed types', () => {
    const input = {
      field: [1, 'string', true, { key: 'value' }],
      another: { field: 'c' },
    };

    const expectedOutput = {
      another: { field: 'c' },
    };

    expect(deepCopySkipArrays(input)).toEqual(expectedOutput);
  });
});

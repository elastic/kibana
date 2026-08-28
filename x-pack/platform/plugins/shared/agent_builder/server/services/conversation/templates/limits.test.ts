/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  assertMetadataValueWithinLimits,
  MAX_OBJECT_DEPTH,
  MAX_STRING_VALUE,
  MAX_OBJECT_ARRAY_ITEMS,
} from './limits';

describe('assertMetadataValueWithinLimits', () => {
  it('does not throw for a simple string within limits', () => {
    expect(() => assertMetadataValueWithinLimits('key', 'hello')).not.toThrow();
  });

  it('throws when a string exceeds MAX_STRING_VALUE', () => {
    const long = 'a'.repeat(MAX_STRING_VALUE + 1);
    expect(() => assertMetadataValueWithinLimits('key', long)).toThrow(
      /exceeds the maximum length/
    );
  });

  it('does not throw for a number or boolean', () => {
    expect(() => assertMetadataValueWithinLimits('n', 42)).not.toThrow();
    expect(() => assertMetadataValueWithinLimits('b', true)).not.toThrow();
  });

  it('does not throw for a shallow object', () => {
    expect(() => assertMetadataValueWithinLimits('obj', { a: 'x', b: 1 })).not.toThrow();
  });

  it('throws when an array exceeds MAX_OBJECT_ARRAY_ITEMS', () => {
    const big = Array.from({ length: MAX_OBJECT_ARRAY_ITEMS + 1 }, (_, i) => ({ i }));
    expect(() => assertMetadataValueWithinLimits('arr', big)).toThrow(/maximum is/);
  });

  it('throws when nesting exceeds MAX_OBJECT_DEPTH', () => {
    // Build an object nested deeper than MAX_OBJECT_DEPTH.
    let obj: Record<string, unknown> = { leaf: 'value' };
    for (let i = 0; i < MAX_OBJECT_DEPTH + 2; i++) {
      obj = { nested: obj };
    }
    expect(() => assertMetadataValueWithinLimits('deep', obj)).toThrow(
      /nesting exceeds the maximum depth/
    );
  });

  it('does not throw for an object at exactly MAX_OBJECT_DEPTH levels', () => {
    let obj: Record<string, unknown> = { leaf: 'value' };
    for (let i = 0; i < MAX_OBJECT_DEPTH - 1; i++) {
      obj = { nested: obj };
    }
    expect(() => assertMetadataValueWithinLimits('ok', obj)).not.toThrow();
  });

  it('recursively checks nested object values', () => {
    const long = 'a'.repeat(MAX_STRING_VALUE + 1);
    const obj = { level1: { level2: long } };
    expect(() => assertMetadataValueWithinLimits('deep', obj)).toThrow(
      /exceeds the maximum length/
    );
  });

  it('includes the field path in the error message', () => {
    const big = Array.from({ length: MAX_OBJECT_ARRAY_ITEMS + 1 }, () => 'x');
    expect(() => assertMetadataValueWithinLimits('myField', big)).toThrow(/myField/);
  });
});

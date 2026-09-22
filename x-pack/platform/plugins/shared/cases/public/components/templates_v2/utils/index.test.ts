/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stringToInteger, stringToIntegerWithDefault } from '.';

describe('stringToInteger', () => {
  it('converts string number to integer', () => {
    expect(stringToInteger('42')).toBe(42);
  });

  it('converts number to integer', () => {
    expect(stringToInteger(42)).toBe(42);
  });

  it('returns undefined for non-numeric string', () => {
    expect(stringToInteger('not-a-number')).toBeUndefined();
  });

  it('returns undefined for undefined input', () => {
    expect(stringToInteger(undefined)).toBeUndefined();
  });

  it('handles zero', () => {
    expect(stringToInteger('0')).toBe(0);
    expect(stringToInteger(0)).toBe(0);
  });

  it('handles negative numbers', () => {
    expect(stringToInteger('-5')).toBe(-5);
  });

  it('handles decimal strings by converting to number', () => {
    expect(stringToInteger('3.14')).toBe(3.14);
  });
});

describe('stringToIntegerWithDefault', () => {
  it('converts valid string number', () => {
    expect(stringToIntegerWithDefault('42', 10)).toBe(42);
  });

  it('converts valid number', () => {
    expect(stringToIntegerWithDefault(42, 10)).toBe(42);
  });

  it('returns default for non-numeric string', () => {
    expect(stringToIntegerWithDefault('not-a-number', 10)).toBe(10);
  });

  it('returns default for zero', () => {
    expect(stringToIntegerWithDefault('0', 10)).toBe(10);
  });

  it('returns default for negative numbers', () => {
    expect(stringToIntegerWithDefault('-5', 10)).toBe(10);
  });

  it('returns value for positive numbers', () => {
    expect(stringToIntegerWithDefault('1', 10)).toBe(1);
  });
});

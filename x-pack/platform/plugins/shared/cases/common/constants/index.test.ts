/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getMaximumOpenCases, MAX_OPEN_CASES } from '.';

describe('getMaximumOpenCases', () => {
  it('returns MAX_OPEN_CASES for null', () => {
    expect(getMaximumOpenCases(null)).toBe(MAX_OPEN_CASES);
  });

  it('returns MAX_OPEN_CASES for undefined', () => {
    expect(getMaximumOpenCases(undefined)).toBe(MAX_OPEN_CASES);
  });

  it('returns MAX_OPEN_CASES for NaN', () => {
    expect(getMaximumOpenCases(NaN)).toBe(MAX_OPEN_CASES);
  });

  it('clips to 1 for negative values', () => {
    expect(getMaximumOpenCases(-5)).toBe(1);
  });

  it('clips to 1 for zero', () => {
    expect(getMaximumOpenCases(0)).toBe(1);
  });

  it('floors fractional values', () => {
    expect(getMaximumOpenCases(5.9)).toBe(5);
  });

  it('returns the value for valid inputs within bounds', () => {
    expect(getMaximumOpenCases(10)).toBe(10);
  });

  it('clips to MAX_OPEN_CASES for values above the ceiling', () => {
    expect(getMaximumOpenCases(99999)).toBe(MAX_OPEN_CASES);
  });

  it('returns MAX_OPEN_CASES exactly when given MAX_OPEN_CASES', () => {
    expect(getMaximumOpenCases(MAX_OPEN_CASES)).toBe(MAX_OPEN_CASES);
  });
});

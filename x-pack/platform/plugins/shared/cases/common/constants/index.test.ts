/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getMaximumOpenCases, MAX_OPEN_CASES_DEFAULT_MAXIMUM, ABSOLUTE_MAX_CASES_PER_RUN } from '.';

describe('getMaximumOpenCases', () => {
  it('returns MAX_OPEN_CASES_DEFAULT_MAXIMUM for null', () => {
    expect(getMaximumOpenCases(null)).toBe(MAX_OPEN_CASES_DEFAULT_MAXIMUM);
  });

  it('returns MAX_OPEN_CASES_DEFAULT_MAXIMUM for undefined', () => {
    expect(getMaximumOpenCases(undefined)).toBe(MAX_OPEN_CASES_DEFAULT_MAXIMUM);
  });

  it('returns MAX_OPEN_CASES_DEFAULT_MAXIMUM for NaN', () => {
    expect(getMaximumOpenCases(NaN)).toBe(MAX_OPEN_CASES_DEFAULT_MAXIMUM);
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

  it('accepts values above MAX_OPEN_CASES_DEFAULT_MAXIMUM up to ABSOLUTE_MAX_CASES_PER_RUN', () => {
    expect(getMaximumOpenCases(ABSOLUTE_MAX_CASES_PER_RUN)).toBe(ABSOLUTE_MAX_CASES_PER_RUN);
  });

  it('clips to ABSOLUTE_MAX_CASES_PER_RUN for values above the absolute ceiling', () => {
    expect(getMaximumOpenCases(ABSOLUTE_MAX_CASES_PER_RUN + 1)).toBe(ABSOLUTE_MAX_CASES_PER_RUN);
  });

  it('returns MAX_OPEN_CASES_DEFAULT_MAXIMUM exactly when given MAX_OPEN_CASES_DEFAULT_MAXIMUM', () => {
    expect(getMaximumOpenCases(MAX_OPEN_CASES_DEFAULT_MAXIMUM)).toBe(
      MAX_OPEN_CASES_DEFAULT_MAXIMUM
    );
  });
});

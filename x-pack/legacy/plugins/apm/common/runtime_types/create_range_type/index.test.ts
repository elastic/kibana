/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { createRangeType } from './index';

describe('createRangeType', () => {
  it('checks whether input is a number', () => {
    expect(
      createRangeType(0, 1)
        .decode('')
        .isRight()
    ).toBe(false);

    expect(
      createRangeType(0, 1)
        .decode(0.5)
        .isRight()
    ).toBe(true);
  });

  it('checks if the number falls within a range', () => {
    expect(
      createRangeType(-5, 10)
        .decode(-5)
        .isRight()
    ).toBe(true);

    expect(
      createRangeType(-5, 10)
        .decode(-10)
        .isRight()
    ).toBe(false);

    expect(
      createRangeType(-5, 10)
        .decode(10)
        .isRight()
    ).toBe(true);

    expect(
      createRangeType(-5, 10)
        .decode(12)
        .isRight()
    ).toBe(false);

    expect(
      createRangeType(-5, 10)
        .decode(NaN)
        .isRight()
    ).toBe(false);
  });

  it('outputs the input if precision is not given', () => {
    expect(createRangeType(0, 1).decode(0.1).value).toBe(0.1);
  });

  it('outputs a number with the given precision', () => {
    expect(createRangeType(0, 1, 0).decode(0.1).value).toBe(0);
    expect(createRangeType(0, 1, 3).decode(0.0024).value).toBe(0.002);
  });
});

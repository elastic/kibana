/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as utils from './utils';

describe('utils', () => {
  it('zeros creates array of zeros', () => {
    const result = utils.zeros(5);
    expect(result).toEqual([0, 0, 0, 0, 0]);
  });

  it('ones creates array of ones', () => {
    const result = utils.ones(3);
    expect(result).toEqual([1, 1, 1]);
  });

  it('filled creates array with given value', () => {
    const result = utils.filled(4, 7);
    expect(result).toEqual([7, 7, 7, 7]);
  });

  it('range creates sequential array', () => {
    const result = utils.range(5);
    expect(result).toEqual([0, 1, 2, 3, 4]);
  });

  it('linear creates evenly spaced array', () => {
    const result = utils.linear(0, 1, 5);
    expect(result).toEqual([0, 0.25, 0.5, 0.75, 1.0]);
  });

  it('sum computes sum', () => {
    expect(utils.sum([1, 2, 3, 4])).toBe(10);
  });

  it('mean computes mean', () => {
    expect(utils.mean([2, 4, 6])).toBe(4);
  });

  it('max finds maximum', () => {
    expect(utils.max([3, 1, 4, 1, 5])).toBe(5);
  });

  it('max2d finds maximum in 2D array', () => {
    expect(
      utils.max2d([
        [1, 2],
        [3, 0],
      ])
    ).toBe(3);
  });

  it('reshape2d reshapes correctly', () => {
    const result = utils.reshape2d([1, 2, 3, 4, 5, 6], 2, 3);
    expect(result).toEqual([
      [1, 2, 3],
      [4, 5, 6],
    ]);
  });

  it('reshape2d throws on dimension mismatch', () => {
    expect(() => utils.reshape2d([1, 2, 3], 2, 2)).toThrow();
  });

  it('tauRandInt returns integer in range', () => {
    const random = () => 0.5;
    expect(utils.tauRandInt(10, random)).toBe(5);
  });

  it('norm computes L2 norm', () => {
    expect(utils.norm([3, 4])).toBe(5);
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { transactionSampleRateRt } from './index';
import { isRight } from 'fp-ts/lib/Either';

describe('transactionSampleRateRt', () => {
  it('does not accept empty values', () => {
    expect(isRight(transactionSampleRateRt.decode(undefined))).toBe(false);
    expect(isRight(transactionSampleRateRt.decode(null))).toBe(false);
    expect(isRight(transactionSampleRateRt.decode(''))).toBe(false);
  });

  it('accepts both strings and numbers as values', () => {
    expect(isRight(transactionSampleRateRt.decode('0.5'))).toBe(true);
    expect(isRight(transactionSampleRateRt.decode(0.5))).toBe(true);
  });

  it('checks if the number falls within 0, 1', () => {
    expect(isRight(transactionSampleRateRt.decode(0))).toBe(true);

    expect(isRight(transactionSampleRateRt.decode(0.5))).toBe(true);

    expect(isRight(transactionSampleRateRt.decode(-0.1))).toBe(false);
    expect(isRight(transactionSampleRateRt.decode(1.1))).toBe(false);

    expect(isRight(transactionSampleRateRt.decode(NaN))).toBe(false);
  });

  it('checks whether the number of decimals is 3', () => {
    expect(isRight(transactionSampleRateRt.decode(1))).toBe(true);
    expect(isRight(transactionSampleRateRt.decode(0.99))).toBe(true);
    expect(isRight(transactionSampleRateRt.decode(0.999))).toBe(true);
    expect(isRight(transactionSampleRateRt.decode(0.998))).toBe(true);
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { transactionSampleRateRt } from './index';

describe('transactionSampleRateRt', () => {
  it('accepts both strings and numbers as values', () => {
    expect(transactionSampleRateRt.decode('0.5').isRight()).toBe(true);
    expect(transactionSampleRateRt.decode(0.5).isRight()).toBe(true);
  });

  it('checks if the number falls within 0, 1', () => {
    expect(transactionSampleRateRt.decode(0).isRight()).toBe(true);

    expect(transactionSampleRateRt.decode(0.5).isRight()).toBe(true);

    expect(transactionSampleRateRt.decode(-0.1).isRight()).toBe(false);
    expect(transactionSampleRateRt.decode(1.1).isRight()).toBe(false);

    expect(transactionSampleRateRt.decode(NaN).isRight()).toBe(false);
  });

  it('checks whether the number of decimals is 3', () => {
    expect(transactionSampleRateRt.decode(1).isRight()).toBe(true);
    expect(transactionSampleRateRt.decode(0.99).isRight()).toBe(true);
    expect(transactionSampleRateRt.decode(0.999).isRight()).toBe(true);
    expect(transactionSampleRateRt.decode(0.998).isRight()).toBe(true);
  });
});

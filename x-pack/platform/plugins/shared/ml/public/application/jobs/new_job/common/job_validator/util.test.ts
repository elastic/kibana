/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isFrequencyMultipleOfInterval } from './util';

describe('isFrequencyMultipleOfInterval', () => {
  it('accepts a frequency that is a whole multiple of the interval', () => {
    expect(isFrequencyMultipleOfInterval('15m', '15m')).toBe(true);
    expect(isFrequencyMultipleOfInterval('1h', '15m')).toBe(true);
    expect(isFrequencyMultipleOfInterval('120s', '1m')).toBe(true);
  });

  it('rejects a frequency that is not a whole multiple of the interval', () => {
    expect(isFrequencyMultipleOfInterval('90s', '1m')).toBe(false);
    expect(isFrequencyMultipleOfInterval('10m', '15m')).toBe(false);
    expect(isFrequencyMultipleOfInterval('450s', '15m')).toBe(false);
  });

  it('leaves values that cannot be parsed to the time interval format checks', () => {
    expect(isFrequencyMultipleOfInterval('abc', '15m')).toBe(true);
    expect(isFrequencyMultipleOfInterval('10m', '')).toBe(true);
  });
});

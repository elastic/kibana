/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAbbreviatedNumber } from './get_abbreviated_number';

describe('getAbbreviatedNumber', () => {
  it('should return the same value if it is less than 1000', () => {
    expect(getAbbreviatedNumber(0)).toBe(0);
    expect(getAbbreviatedNumber(1)).toBe(1);
    expect(getAbbreviatedNumber(500)).toBe(500);
    expect(getAbbreviatedNumber(999)).toBe(999);
  });

  it('should use numeral to format the value if it is greater than or equal to 1000', () => {
    expect(getAbbreviatedNumber(1000)).toBe('1.0k');

    expect(getAbbreviatedNumber(1200)).toBe('1.2k');

    expect(getAbbreviatedNumber(3500000)).toBe('3.5m');

    expect(getAbbreviatedNumber(2800000000)).toBe('2.8b');

    expect(getAbbreviatedNumber(5900000000000)).toBe('5.9t');

    expect(getAbbreviatedNumber(59000000000000000)).toBe('59000.0t');
  });

  it('should return 0 if the value is NaN', () => {
    expect(getAbbreviatedNumber(NaN)).toBe(0);
  });
});

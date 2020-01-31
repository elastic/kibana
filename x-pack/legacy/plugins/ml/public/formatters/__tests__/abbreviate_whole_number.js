/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { abbreviateWholeNumber } from '../abbreviate_whole_number';

describe('ML - abbreviateWholeNumber formatter', () => {
  it('returns the correct format using default max digits', () => {
    expect(abbreviateWholeNumber(1)).to.be(1);
    expect(abbreviateWholeNumber(12)).to.be(12);
    expect(abbreviateWholeNumber(123)).to.be(123);
    expect(abbreviateWholeNumber(1234)).to.be('1k');
    expect(abbreviateWholeNumber(12345)).to.be('12k');
    expect(abbreviateWholeNumber(123456)).to.be('123k');
    expect(abbreviateWholeNumber(1234567)).to.be('1m');
    expect(abbreviateWholeNumber(12345678)).to.be('12m');
    expect(abbreviateWholeNumber(123456789)).to.be('123m');
    expect(abbreviateWholeNumber(1234567890)).to.be('1b');
    expect(abbreviateWholeNumber(5555555555555.55)).to.be('6t');
  });

  it('returns the correct format using custom max digits', () => {
    expect(abbreviateWholeNumber(1, 4)).to.be(1);
    expect(abbreviateWholeNumber(12, 4)).to.be(12);
    expect(abbreviateWholeNumber(123, 4)).to.be(123);
    expect(abbreviateWholeNumber(1234, 4)).to.be(1234);
    expect(abbreviateWholeNumber(12345, 4)).to.be('12k');
    expect(abbreviateWholeNumber(123456, 6)).to.be(123456);
    expect(abbreviateWholeNumber(1234567, 4)).to.be('1m');
    expect(abbreviateWholeNumber(12345678, 3)).to.be('12m');
    expect(abbreviateWholeNumber(123456789, 9)).to.be(123456789);
    expect(abbreviateWholeNumber(1234567890, 3)).to.be('1b');
    expect(abbreviateWholeNumber(5555555555555.55, 5)).to.be('6t');
  });
});

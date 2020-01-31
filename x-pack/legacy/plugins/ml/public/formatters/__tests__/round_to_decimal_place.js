/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { roundToDecimalPlace } from '../round_to_decimal_place';

describe('ML - roundToDecimalPlace formatter', () => {
  it('returns the correct format using default decimal place', () => {
    expect(roundToDecimalPlace(12)).to.be(12);
    expect(roundToDecimalPlace(12.3)).to.be(12.3);
    expect(roundToDecimalPlace(12.34)).to.be(12.34);
    expect(roundToDecimalPlace(12.345)).to.be(12.35);
    expect(roundToDecimalPlace(12.045)).to.be(12.05);
    expect(roundToDecimalPlace(12.005)).to.be(12.01);
    expect(roundToDecimalPlace(12.0005)).to.be(12);
    expect(roundToDecimalPlace(0.05)).to.be(0.05);
    expect(roundToDecimalPlace(0.005)).to.be('5.00e-3');
    expect(roundToDecimalPlace(0.0005)).to.be('5.00e-4');
    expect(roundToDecimalPlace(-0.0005)).to.be('-5.00e-4');
    expect(roundToDecimalPlace(-12.045)).to.be(-12.04);
  });

  it('returns the correct format using specified decimal place', () => {
    expect(roundToDecimalPlace(12), 4).to.be(12);
    expect(roundToDecimalPlace(12.3, 4)).to.be(12.3);
    expect(roundToDecimalPlace(12.3456, 4)).to.be(12.3456);
    expect(roundToDecimalPlace(12.345678, 4)).to.be(12.3457);
    expect(roundToDecimalPlace(0.05, 4)).to.be(0.05);
    expect(roundToDecimalPlace(0.0005, 4)).to.be(0.0005);
    expect(roundToDecimalPlace(0.00005, 4)).to.be('5.00e-5');
    expect(roundToDecimalPlace(-0.00005, 4)).to.be('-5.00e-5');
  });
});

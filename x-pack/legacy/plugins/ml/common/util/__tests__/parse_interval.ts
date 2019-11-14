/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { parseInterval } from '../parse_interval';

describe('ML parse interval util', function() {
  it('correctly parses an interval containing unit and value', function() {
    expect(parseInterval('1d')!.as('d')).to.be(1);
    expect(parseInterval('2y')!.as('y')).to.be(2);
    expect(parseInterval('5M')!.as('M')).to.be(5);
    expect(parseInterval('5m')!.as('m')).to.be(5);
    expect(parseInterval('250ms')!.as('ms')).to.be(250);
    expect(parseInterval('100s')!.as('s')).to.be(100);
    expect(parseInterval('23d')!.as('d')).to.be(23);
    expect(parseInterval('52w')!.as('w')).to.be(52);
    expect(parseInterval('0s')!.as('s')).to.be(0);
    expect(parseInterval('0s')!.as('h')).to.be(0);
  });

  it('correctly handles zero value intervals', function() {
    expect(parseInterval('0h')!.as('h')).to.be(0);
    expect(parseInterval('0d')).to.not.be.ok();
  });

  it('returns null for an invalid interval', function() {
    expect(parseInterval('')).to.not.be.ok();
    expect(parseInterval('234asdf')).to.not.be.ok();
    expect(parseInterval('m')).to.not.be.ok();
    expect(parseInterval('1.5h')).to.not.be.ok();
  });
});

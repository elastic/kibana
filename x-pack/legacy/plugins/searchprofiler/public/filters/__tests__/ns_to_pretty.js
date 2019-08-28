/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { nsToPretty } from '../ns_to_pretty.js';

describe('nsToPretty', function () {
  it('returns correct time for ns', function () {
    const result = nsToPretty(500, 1);
    expect(result).to.eql('500.0ns');
  });

  it('returns correct time for µs', function () {
    const result = nsToPretty(5000, 1);
    expect(result).to.eql('5.0µs');
  });

  it('returns correct time for ms', function () {
    const result = nsToPretty(5000000, 1);
    expect(result).to.eql('5.0ms');
  });

  it('returns correct time for s', function () {
    const result = nsToPretty(5000000000, 1);
    expect(result).to.eql('5.0s');
  });

  it('returns correct time for min', function () {
    const result = nsToPretty(5000000000 * 60, 1);
    expect(result).to.eql('5.0min');
  });

  it('returns correct time for hr', function () {
    const result = nsToPretty(3.6e+12 * 5, 1);
    expect(result).to.eql('5.0hr');
  });

  it('returns correct time for day', function () {
    const result = nsToPretty(3.6e+12 * 24 * 5, 1);
    expect(result).to.eql('5.0d');
  });

  it('returns correct time for precision', function () {
    const result = nsToPretty(500, 5);
    expect(result).to.eql('500.00000ns');
  });
});

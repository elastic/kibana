/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import *  as util from '../util.js';
import { normalized, breakdown } from './fixtures/breakdown.js';
import { inputTimes, normalizedTimes } from './fixtures/normalize_times.js';
import { inputIndices, normalizedIndices } from './fixtures/normalize_indices.js';
import { flatTimes } from './fixtures/flatten_times.js';

describe('normalizeBreakdown', function () {
  it('returns correct breakdown', function () {
    const result = util.normalizeBreakdown(breakdown);
    expect(result).to.eql(normalized);
  });
});

describe('normalizeTimes', function () {
  it('returns correct normalization', function () {
    const totalTime = 0.447365;

    // Deep clone the object to preserve the original
    const input = JSON.parse(JSON.stringify(inputTimes));
    util.normalizeTimes(input, totalTime, 0);

    // Modifies in place, so inputTimes will change
    expect(input).to.eql(normalizedTimes);
  });
});

describe('flattenResults', function () {
  it('returns correct flattening', function () {
    // Deep clone the object to preserve the original
    const input = JSON.parse(JSON.stringify(normalizedTimes));
    const flat = [];
    util.flattenResults(input, flat, 0, []);
    expect(JSON.parse(JSON.stringify(flat))).to.eql(flatTimes);
  });
});

describe('normalizeIndices', function () {
  it('returns correct ordering', function () {
    // Deep clone the object to preserve the original
    const input = JSON.parse(JSON.stringify(inputIndices));
    const result = util.normalizeIndices(input, [], 'searches');
    expect(result).to.eql(normalizedIndices);
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import * as util from '../unsafe_utils';
// @ts-ignore
import { normalized, breakdown } from './fixtures/breakdown.js';
// @ts-ignore
import { inputTimes, normalizedTimes } from './fixtures/normalize_times.js';
// @ts-ignore
import { inputIndices, normalizedIndices } from './fixtures/normalize_indices.js';

describe('normalizeBreakdown', function() {
  it('returns correct breakdown', function() {
    const result = util.normalizeBreakdown(breakdown);
    expect(result).to.eql(normalized);
  });
});

describe('normalizeTimes', function() {
  it('returns correct normalization', function() {
    const totalTime = 0.447365;

    // Deep clone the object to preserve the original
    const input = JSON.parse(JSON.stringify(inputTimes));
    util.normalizeTimes(input, totalTime, 0);

    // Modifies in place, so inputTimes will change
    expect(input).to.eql(normalizedTimes);
  });
});

// TODO: Revive this test
xdescribe('initTree', function() {
  it('returns initialised shards tree', function() {
    // Deep clone the object to preserve the original
    const input = JSON.parse(JSON.stringify(normalizedTimes));
    const flat: any = [];
    util.initTree(input, 0);
    expect(JSON.parse(JSON.stringify(flat))).to.eql(null);
  });
});

describe('normalizeIndices', function() {
  it('returns correct ordering', function() {
    // Deep clone the object to preserve the original
    const input = JSON.parse(JSON.stringify(inputIndices));
    util.normalizeIndices(input, 'searches');
    const result = util.sortIndices(input);
    expect(result).to.eql(normalizedIndices);
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import * as util from '../unsafe_utils';
import { normalized, breakdown } from './fixtures/breakdown';
import { inputTimes, normalizedTimes } from './fixtures/normalize_times';
import { inputIndices, normalizedIndices } from './fixtures/normalize_indices';

describe('normalizeBreakdown', function() {
  it('returns correct breakdown', function() {
    const result = util.normalizeBreakdown(breakdown);
    expect(result).to.eql(normalized);
  });
});

describe('normalizeTime', function() {
  it('returns correct normalization', function() {
    const totalTime = 0.447365;

    // Deep clone the object to preserve the original
    const input = JSON.parse(JSON.stringify(inputTimes));

    // Simulate recursive application to the tree.
    input.forEach((i: any) => util.normalizeTime(i, totalTime));
    input[0].children.forEach((i: any) => util.normalizeTime(i, totalTime));

    // Modifies in place, so inputTimes will change
    expect(input).to.eql(normalizedTimes);
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

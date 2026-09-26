/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  compareSpecVersions,
  isSameMajor,
  majorOf,
  newestMajorTarget,
} from './spec_version_compare';

describe('spec version compare', () => {
  it('picks the accepted latest of the newest major', () => {
    expect(newestMajorTarget({ '1': '1.1', '2': '2.0' })).toBe('2.0');
    expect(newestMajorTarget({ '1': '1.4' })).toBe('1.4');
    expect(newestMajorTarget(undefined)).toBeUndefined();
  });

  it('compares MAJOR.MINOR and same-major', () => {
    expect(compareSpecVersions('1.1', '1.0')).toBeGreaterThan(0);
    expect(compareSpecVersions('1.0', '2.0')).toBeLessThan(0);
    expect(isSameMajor('1.0', '1.4')).toBe(true);
    expect(isSameMajor('1.0', '2.0')).toBe(false);
    expect(majorOf('2.3')).toBe(2);
  });
});

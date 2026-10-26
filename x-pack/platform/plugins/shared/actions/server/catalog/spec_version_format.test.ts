/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { compareSpecVersions, parseSpecVersion, SPEC_VERSION_REGEX } from './spec_version_format';

describe('spec version format', () => {
  it('accepts MAJOR.MINOR', () => {
    expect(SPEC_VERSION_REGEX.test('1.0')).toBe(true);
    expect(SPEC_VERSION_REGEX.test('10.2')).toBe(true);
    expect(parseSpecVersion('10.2')).toEqual({ major: 10, minor: 2 });
  });

  it('rejects semver, padded, and major-only values', () => {
    expect(SPEC_VERSION_REGEX.test('1.0.0')).toBe(false);
    expect(SPEC_VERSION_REGEX.test('01.0')).toBe(false);
    expect(SPEC_VERSION_REGEX.test('1')).toBe(false);
    expect(() => parseSpecVersion('1.0.0')).toThrow(/MAJOR\.MINOR/);
  });

  it('orders by major then minor', () => {
    expect(compareSpecVersions('1.0', '1.1')).toBeLessThan(0);
    expect(compareSpecVersions('1.9', '2.0')).toBeLessThan(0);
    expect(compareSpecVersions('10.2', '10.2')).toBe(0);
    expect(compareSpecVersions('2.0', '1.9')).toBeGreaterThan(0);
  });
});

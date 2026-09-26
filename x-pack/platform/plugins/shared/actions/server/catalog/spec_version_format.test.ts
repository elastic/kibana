/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  compareSpecVersions,
  isExactVersion,
  isMajorRequest,
  majorOf,
  parseSpecVersion,
  SPEC_VERSION_MAX_LENGTH,
  validateExactSpecVersion,
  validateSpecVersionRequest,
} from './spec_version_format';

describe('parseSpecVersion', () => {
  it('parses MAJOR.MINOR', () => {
    expect(parseSpecVersion('1.0')).toEqual({ major: 1, minor: 0 });
    expect(parseSpecVersion('2.11')).toEqual({ major: 2, minor: 11 });
  });

  it('rejects MAJOR.MINOR.PATCH and other forms', () => {
    expect(() => parseSpecVersion('1.0.0')).toThrow(/MAJOR\.MINOR/);
    expect(() => parseSpecVersion('1')).toThrow(/MAJOR\.MINOR/);
    expect(() => parseSpecVersion('01.0')).toThrow(/MAJOR\.MINOR/);
    expect(() => parseSpecVersion('')).toThrow(/MAJOR\.MINOR/);
  });
});

describe('compareSpecVersions', () => {
  it('orders by major then minor', () => {
    expect(compareSpecVersions('1.0', '1.1')).toBeLessThan(0);
    expect(compareSpecVersions('1.1', '1.0')).toBeGreaterThan(0);
    expect(compareSpecVersions('1.1', '1.1')).toBe(0);
    expect(compareSpecVersions('2.0', '1.9')).toBeGreaterThan(0);
  });
});

describe('request classification', () => {
  it('recognizes a major-only request', () => {
    expect(isMajorRequest('1')).toBe(true);
    expect(isMajorRequest('12')).toBe(true);
    expect(isMajorRequest('1.0')).toBe(false);
    expect(isMajorRequest('01')).toBe(false);
  });

  it('recognizes an exact version', () => {
    expect(isExactVersion('1.0')).toBe(true);
    expect(isExactVersion('1.0.0')).toBe(false);
    expect(isExactVersion('1')).toBe(false);
  });

  it('returns the major of an exact version', () => {
    expect(majorOf('1.0')).toBe(1);
    expect(majorOf('12.3')).toBe(12);
  });
});

describe('config-schema validators', () => {
  it('accepts omitted-style request values up to the max length', () => {
    expect(SPEC_VERSION_MAX_LENGTH).toBe(16);
    expect(validateSpecVersionRequest('1')).toBeUndefined();
    expect(validateSpecVersionRequest('1.0')).toBeUndefined();
    expect(validateSpecVersionRequest('1.0.0')).toBe('spec version must be N or N.M');
  });

  it('accepts only exact versions for the spec route', () => {
    expect(validateExactSpecVersion('1.0')).toBeUndefined();
    expect(validateExactSpecVersion('1')).toBe('spec version must use the MAJOR.MINOR form');
    expect(validateExactSpecVersion('1.0.0')).toBe('spec version must use the MAJOR.MINOR form');
  });
});

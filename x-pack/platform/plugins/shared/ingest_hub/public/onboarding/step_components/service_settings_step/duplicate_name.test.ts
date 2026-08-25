/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildDuplicateName, isDuplicateNameTaken } from './duplicate_name';

describe('buildDuplicateName', () => {
  it('returns baseName [Duplicate] when no collision', () => {
    expect(buildDuplicateName('AWS CloudTrail', [])).toBe('AWS CloudTrail [Duplicate]');
  });

  it('appends index 2 when [Duplicate] is already taken', () => {
    expect(buildDuplicateName('AWS CloudTrail', ['AWS CloudTrail [Duplicate]'])).toBe(
      'AWS CloudTrail [Duplicate 2]'
    );
  });

  it('increments until a free slot is found', () => {
    const existing = [
      'AWS CloudTrail [Duplicate]',
      'AWS CloudTrail [Duplicate 2]',
      'AWS CloudTrail [Duplicate 3]',
    ];
    expect(buildDuplicateName('AWS CloudTrail', existing)).toBe('AWS CloudTrail [Duplicate 4]');
  });

  it('does not collide with unrelated existing names', () => {
    expect(buildDuplicateName('AWS S3', ['AWS CloudTrail [Duplicate]'])).toBe('AWS S3 [Duplicate]');
  });
});

describe('isDuplicateNameTaken', () => {
  it('returns false when name is unique', () => {
    expect(isDuplicateNameTaken('New Name', ['AWS CloudTrail', 'AWS S3'])).toBe(false);
  });

  it('returns true for an exact match', () => {
    expect(isDuplicateNameTaken('AWS CloudTrail', ['AWS CloudTrail', 'AWS S3'])).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isDuplicateNameTaken('aws cloudtrail', ['AWS CloudTrail'])).toBe(true);
  });

  it('trims whitespace before comparing', () => {
    expect(isDuplicateNameTaken('  AWS CloudTrail  ', ['AWS CloudTrail'])).toBe(true);
  });
});

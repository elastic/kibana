/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MAX_INDEX_PATTERN_LENGTH,
  MAX_NAME_LENGTH,
  isValidPriority,
  validateIndexPattern,
  validateName,
} from './validation';

describe('validateName', () => {
  it.each(['catalog', 'catalog-fast', 'logs_2026', '7d-retention', 'a'])('accepts %p', (name) => {
    expect(validateName(name)).toBeUndefined();
  });

  it.each(['', '   '])('requires a name, rejecting %p', (name) => {
    expect(validateName(name)).toEqual({ code: 'required', message: 'Enter a name.' });
  });

  it('accepts up to the maximum length and rejects longer names', () => {
    expect(validateName('a'.repeat(MAX_NAME_LENGTH))).toBeUndefined();
    expect(validateName('a'.repeat(MAX_NAME_LENGTH + 1))).toEqual({
      code: 'tooLong',
      message: 'Use 255 characters or fewer.',
    });
  });

  it.each([
    ['uppercase letters', 'Catalog'],
    ['a leading hyphen', '-catalog'],
    ['a leading underscore', '_catalog'],
    ['spaces', 'my catalog'],
    ['other characters', 'catalog.fast'],
    ['a wildcard', 'catalog*'],
  ])('rejects %s', (_description, name) => {
    expect(validateName(name)).toEqual({
      code: 'invalidFormat',
      message:
        'Use lowercase letters, numbers, hyphens, and underscores, starting with a letter or number.',
    });
  });
});

describe('validateIndexPattern', () => {
  it.each(['products', 'logs-*', '*', '.internal-*', 'logs-oracle-xyz-*'])(
    'accepts %p',
    (pattern) => {
      expect(validateIndexPattern(pattern)).toBeUndefined();
    }
  );

  it.each(['', '   '])('requires a pattern, rejecting %p', (pattern) => {
    expect(validateIndexPattern(pattern)).toEqual({
      code: 'required',
      message: 'Enter a pattern or name.',
    });
  });

  it('accepts up to the maximum length and rejects longer patterns', () => {
    expect(validateIndexPattern('a'.repeat(MAX_INDEX_PATTERN_LENGTH))).toBeUndefined();
    expect(validateIndexPattern('a'.repeat(MAX_INDEX_PATTERN_LENGTH + 1))).toEqual({
      code: 'tooLong',
      message: 'Use 255 characters or fewer.',
    });
  });

  it.each(['logs-*,metrics-*', 'logs-* metrics-*', ' logs-*', 'logs-*\t'])(
    'rejects more than one target in %p',
    (pattern) => {
      expect(validateIndexPattern(pattern)).toEqual({
        code: 'notSingleTarget',
        message: 'Enter one pattern or name, without commas or spaces.',
      });
    }
  );
});

describe('isValidPriority', () => {
  it.each([0, 1, 10, Number.MAX_SAFE_INTEGER])('accepts %p', (priority) => {
    expect(isValidPriority(priority)).toBe(true);
  });

  it.each([-1, 1.5, Number.NaN, Number.MAX_SAFE_INTEGER + 1])('rejects %p', (priority) => {
    expect(isValidPriority(priority)).toBe(false);
  });
});

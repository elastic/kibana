/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_NAME_LENGTH, validateName } from './validation';

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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { validateRegExpString } from './utils';

describe('validRegExpString', () => {
  it('correctly returns false for invalid strings', () => {
    expect(validateRegExpString('?asd')).toContain(`Invalid regular expression`);
    expect(validateRegExpString('*asd')).toContain(`Invalid regular expression`);
    expect(validateRegExpString('(')).toContain(`Invalid regular expression`);
  });

  it('correctly returns true for valid strings', () => {
    expect(validateRegExpString('asd')).toBe('');
    expect(validateRegExpString('.*asd')).toBe('');
    expect(validateRegExpString('')).toBe('');
  });
});

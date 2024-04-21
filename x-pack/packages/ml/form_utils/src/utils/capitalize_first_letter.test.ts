/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { capitalizeFirstLetter } from './capitalize_first_letter';

describe('capitalizeFirstLetter', () => {
  it('should make the first character upper case', () => {
    expect(capitalizeFirstLetter('the-string')).toBe('The-string');
  });

  it('should not break on an empty string', () => {
    expect(capitalizeFirstLetter('')).toBe('');
  });
});

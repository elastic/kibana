/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stringValidator } from './string_validator';

describe('Transform: stringValidator()', () => {
  it('should allow an empty string for optional fields', () => {
    expect(stringValidator('')).toEqual([]);
  });

  it('should not allow an empty string for required fields', () => {
    expect(stringValidator('', false)).toEqual(['Required field.']);
  });
});

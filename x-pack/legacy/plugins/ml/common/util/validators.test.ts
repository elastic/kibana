/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { maxLengthValidator } from './validators';

describe('maxLengthValidator', () => {
  test('should allow a valid input', () => {
    expect(maxLengthValidator(2)('xx')).toBe(null);
  });

  test('should describe an invalid input', () => {
    expect(maxLengthValidator(3)('example')).toEqual({
      maxLength: {
        requiredLength: 3,
        actualLength: 7,
      },
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { maxLengthValidator, memoryInputValidator } from './validators';

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

describe('memoryInputValidator', () => {
  test('should detect missing units', () => {
    expect(memoryInputValidator()('10')).toEqual({
      invalidUnits: {
        allowedUnits: 'B, KB, MB, GB, TB, PB',
      },
    });
  });

  test('should accept valid input', () => {
    expect(memoryInputValidator()('100PB')).toEqual(null);
  });

  test('should accept valid input with custom allowed units', () => {
    expect(memoryInputValidator(['B', 'KB'])('100KB')).toEqual(null);
  });

  test('should detect not allowed units', () => {
    expect(memoryInputValidator(['B', 'KB'])('100MB')).toEqual({
      invalidUnits: {
        allowedUnits: 'B, KB',
      },
    });
  });
});

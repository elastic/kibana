/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SimplifiedVarsSchema } from './package_policy_schema';

describe('SimplifiedVarsSchema', () => {
  it('should validate a string "true" as a string and not coerce it to boolean', () => {
    const result = SimplifiedVarsSchema.validate({ myVar: 'true' });
    expect(result.myVar).toBe('true');
    expect(typeof result.myVar).toBe('string');
  });

  it('should validate a string "false" as a string and not coerce it to boolean', () => {
    const result = SimplifiedVarsSchema.validate({ myVar: 'false' });
    expect(result.myVar).toBe('false');
    expect(typeof result.myVar).toBe('string');
  });

  it('should validate an actual boolean value correctly', () => {
    const result = SimplifiedVarsSchema.validate({ myVar: true });
    expect(result.myVar).toBe(true);
    expect(typeof result.myVar).toBe('boolean');
  });

  it('should accept string values longer than 10,000 characters', () => {
    const value = 'a'.repeat(26500);
    expect(SimplifiedVarsSchema.validate({ myVar: value }).myVar).toBe(value);
  });

  it('should accept string values longer than 10,000 characters inside arrays', () => {
    const value = 'a'.repeat(26500);
    expect(SimplifiedVarsSchema.validate({ myVar: [value] }).myVar).toEqual([value]);
  });

  it('should still reject oversized variable names', () => {
    expect(() => SimplifiedVarsSchema.validate({ ['a'.repeat(1025)]: 'value' })).toThrow();
  });

  it('should still reject oversized secret reference ids', () => {
    expect(() =>
      SimplifiedVarsSchema.validate({ myVar: { id: 'a'.repeat(256), isSecretRef: true } })
    ).toThrow();
  });
});

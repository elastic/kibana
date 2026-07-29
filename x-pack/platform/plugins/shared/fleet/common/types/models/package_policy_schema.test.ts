/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SimplifiedPackagePolicyBaseSchema, SimplifiedVarsSchema } from './package_policy_schema';

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

  it('should reject oversized string values', () => {
    expect(() => SimplifiedVarsSchema.validate({ myVar: 'a'.repeat(10001) })).toThrow();
  });

  it('should reject oversized string values inside arrays', () => {
    expect(() => SimplifiedVarsSchema.validate({ myVar: ['a'.repeat(10001)] })).toThrow();
  });
});

describe('SimplifiedPackagePolicyBaseSchema', () => {
  it('accepts profiles-* as an additional datastreams permission', () => {
    expect(() =>
      SimplifiedPackagePolicyBaseSchema.validate({
        name: 'test-policy',
        additional_datastreams_permissions: ['profiles-generic.otel-default'],
      })
    ).not.toThrow();
  });

  it('rejects profiling-* as an additional datastreams permission', () => {
    expect(() =>
      SimplifiedPackagePolicyBaseSchema.validate({
        name: 'test-policy',
        additional_datastreams_permissions: ['profiling-events-default'],
      })
    ).toThrow(/profiling-events-default/);
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  NewPackagePolicySchema,
  SimplifiedPackagePolicyBaseSchema,
  SimplifiedVarsSchema,
} from './package_policy_schema';

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

describe('NewPackagePolicySchema — IaC transient fields', () => {
  const basePolicy = {
    name: 'test-policy',
    enabled: true,
    policy_ids: ['agent-policy-1'],
    inputs: [],
  };

  it('rejects an empty cloud_connector_iac_key', () => {
    expect(() =>
      NewPackagePolicySchema.validate({ ...basePolicy, cloud_connector_iac_key: '' })
    ).toThrow();
  });

  it('accepts a non-empty cloud_connector_iac_key', () => {
    expect(() =>
      NewPackagePolicySchema.validate({ ...basePolicy, cloud_connector_iac_key: 'sha256:abc' })
    ).not.toThrow();
  });

  it('rejects an empty cloud_connector_iac_deployment_id', () => {
    expect(() =>
      NewPackagePolicySchema.validate({ ...basePolicy, cloud_connector_iac_deployment_id: '' })
    ).toThrow();
  });

  it('accepts a non-empty cloud_connector_iac_deployment_id', () => {
    expect(() =>
      NewPackagePolicySchema.validate({
        ...basePolicy,
        cloud_connector_iac_deployment_id: 'arn:aws:cloudformation:us-east-1:1:stack/s/u',
      })
    ).not.toThrow();
  });
});

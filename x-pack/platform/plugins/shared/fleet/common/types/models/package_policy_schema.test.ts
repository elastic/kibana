/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CreatePackagePolicyRequestBodySchema,
  SimplifiedPackagePolicyBaseSchema,
  SimplifiedVarsSchema,
  UpdatePackagePolicyRequestBodySchema,
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

describe('package policy REST request bodies in reporting mode', () => {
  // These fields use the string helpers' warn() mode: overlong input is recorded in the
  // kibana.schema.string_length_violation.length histogram instead of being rejected.
  const overlong = {
    name: 'a'.repeat(1000),
    description: 'a'.repeat(5000),
    policy_ids: ['a'.repeat(1000)],
    output_id: 'a'.repeat(1000),
    global_data_tags: [{ name: 'a'.repeat(1000), value: 'value' }],
    inputs: [],
  };

  it('accepts overlong strings on create', () => {
    expect(() =>
      CreatePackagePolicyRequestBodySchema.validate({ ...overlong, id: 'a'.repeat(1000) })
    ).not.toThrow();
  });

  it('accepts overlong input and stream IDs', () => {
    const inputs = [
      {
        id: 'a'.repeat(1000),
        type: 'logfile',
        enabled: true,
        streams: [
          {
            id: 'b'.repeat(1000),
            enabled: true,
            data_stream: { type: 'logs', dataset: 'system.syslog' },
          },
        ],
      },
    ];
    expect(() =>
      CreatePackagePolicyRequestBodySchema.validate({ name: 'policy', inputs })
    ).not.toThrow();
    expect(() => UpdatePackagePolicyRequestBodySchema.validate({ inputs })).not.toThrow();
  });

  it('accepts overlong strings on update', () => {
    expect(() => UpdatePackagePolicyRequestBodySchema.validate(overlong)).not.toThrow();
  });

  it('still accepts null for nullable IDs', () => {
    expect(() =>
      CreatePackagePolicyRequestBodySchema.validate({
        name: 'policy',
        inputs: [],
        policy_id: null,
        output_id: null,
        cloud_connector_id: null,
      })
    ).not.toThrow();
  });
});

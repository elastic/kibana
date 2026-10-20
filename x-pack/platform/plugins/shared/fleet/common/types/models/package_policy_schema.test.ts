/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CreatePackagePolicyRequestBodySchema,
  NewPackagePolicySchema,
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

// The create/update request bodies use REST-only copies of the config-record, stream and
// input schemas (RestConfigRecordSchema / RestPackagePolicyStreamsSchema /
// RestPackagePolicyInputsSchema). The originals stay unbounded so the bounds do not reach
// the frozen SO model-version schemas, which means these limits are only exercised here.
describe('package policy REST request body bounds', () => {
  const stream = (overrides: Record<string, unknown> = {}) => ({
    enabled: true,
    data_stream: { dataset: 'test.logs', type: 'logs' },
    ...overrides,
  });

  const input = (overrides: Record<string, unknown> = {}) => ({
    type: 'logfile',
    enabled: true,
    streams: [stream()],
    ...overrides,
  });

  const body = (overrides: Record<string, unknown> = {}) => ({
    name: 'my-package-policy',
    inputs: [input()],
    ...overrides,
  });

  it('accepts a fully populated nested payload', () => {
    expect(() =>
      CreatePackagePolicyRequestBodySchema.validate(
        body({
          description: 'a description',
          namespace: 'default',
          policy_ids: ['agent-policy-1'],
          package: { name: 'nginx', version: '1.0.0', title: 'Nginx' },
          inputs: [
            input({
              id: 'logfile-nginx-1',
              name: 'nginx logs',
              policy_template: 'nginx',
              vars: { paths: { type: 'text', value: ['/var/log/nginx/access.log'] } },
              config: { tags: { type: 'text', value: 'web' } },
              streams: [
                stream({
                  id: 'logfile-nginx.access-1',
                  vars: { preserve_original_event: { type: 'bool', value: false } },
                  data_stream: {
                    dataset: 'nginx.access',
                    type: 'logs',
                    elasticsearch: {
                      privileges: { indices: ['auto_configure', 'create_doc'] },
                      dynamic_dataset: true,
                    },
                  },
                }),
              ],
            }),
          ],
        })
      )
    ).not.toThrow();
  });

  // [field path, limit, builder]
  const bounds: Array<[string, number, (value: string) => Record<string, unknown>]> = [
    ['name', 255, (v) => ({ name: v })],
    ['description', 2048, (v) => ({ description: v })],
    ['policy_ids item', 255, (v) => ({ policy_ids: [v] })],
    ['inputs[].id', 255, (v) => ({ inputs: [input({ id: v })] })],
    ['inputs[].name', 255, (v) => ({ inputs: [input({ name: v })] })],
    ['inputs[].type', 100, (v) => ({ inputs: [input({ type: v })] })],
    ['inputs[].policy_template', 255, (v) => ({ inputs: [input({ policy_template: v })] })],
    ['inputs[].migrate_from', 1024, (v) => ({ inputs: [input({ migrate_from: v })] })],
    [
      'inputs[].vars key',
      1024,
      (v) => ({ inputs: [input({ vars: { [v]: { type: 'text', value: 'x' } } })] }),
    ],
    [
      'inputs[].vars type',
      100,
      (v) => ({ inputs: [input({ vars: { paths: { type: v, value: 'x' } } })] }),
    ],
    ['streams[].id', 255, (v) => ({ inputs: [input({ streams: [stream({ id: v })] })] })],
    [
      'streams[].data_stream.dataset',
      1024,
      (v) => ({
        inputs: [input({ streams: [stream({ data_stream: { dataset: v, type: 'logs' } })] })],
      }),
    ],
    [
      'streams[].data_stream.type',
      100,
      (v) => ({
        inputs: [input({ streams: [stream({ data_stream: { dataset: 'test.logs', type: v } })] })],
      }),
    ],
    [
      'streams[].data_stream.elasticsearch privileges indices item',
      1024,
      (v) => ({
        inputs: [
          input({
            streams: [
              stream({
                data_stream: {
                  dataset: 'test.logs',
                  type: 'logs',
                  elasticsearch: { privileges: { indices: [v] } },
                },
              }),
            ],
          }),
        ],
      }),
    ],
    [
      'streams[].migrate_from',
      1024,
      (v) => ({ inputs: [input({ streams: [stream({ migrate_from: v })] })] }),
    ],
    [
      'streams[].vars key',
      1024,
      (v) => ({
        inputs: [input({ streams: [stream({ vars: { [v]: { type: 'text', value: 'x' } } })] })],
      }),
    ],
  ];

  describe.each([
    ['CreatePackagePolicyRequestBodySchema', CreatePackagePolicyRequestBodySchema],
    ['UpdatePackagePolicyRequestBodySchema', UpdatePackagePolicyRequestBodySchema],
  ])('%s', (_schemaName, requestSchema) => {
    it.each(bounds)('accepts %s at exactly %i characters', (_field, max, build) => {
      expect(() => requestSchema.validate(body(build('a'.repeat(max))))).not.toThrow();
    });

    it.each(bounds)('rejects %s over %i characters', (_field, max, build) => {
      expect(() => requestSchema.validate(body(build('a'.repeat(max + 1))))).toThrow();
    });
  });

  // Guards the reason the REST copies exist at all: PackagePolicyBaseSchema and its
  // nested schemas feed the frozen SO model versions (V22-V25), so they must stay
  // unbounded. If a bound ever leaks into them, this fails.
  it('does not apply the REST bounds to the saved object schema', () => {
    const overLimit = {
      name: 'a'.repeat(256),
      inputs: [
        input({
          type: 'a'.repeat(101),
          streams: [stream({ data_stream: { dataset: 'a'.repeat(1025), type: 'logs' } })],
        }),
      ],
    };

    expect(() => CreatePackagePolicyRequestBodySchema.validate(overLimit)).toThrow();
    // `enabled` is required by the SO schema but not by the create request body.
    expect(() => NewPackagePolicySchema.validate({ ...overLimit, enabled: true })).not.toThrow();
  });
});

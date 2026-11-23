/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  validateNoTraversalInIdOverrides,
  validateNoTraversalInCompiledIds,
} from './validate_no_traversal_ids';

describe('validateNoTraversalInIdOverrides', () => {
  const policyWithInputId = (inputId: string, streamId?: string) =>
    ({
      name: 'test-policy',
      namespace: 'default',
      policy_ids: ['policy1'],
      package: { name: 'test-package', title: 'Test Package', version: '1.0.0' },
      enabled: true,
      inputs: [
        {
          id: inputId,
          type: 'logfile',
          enabled: true,
          streams: [
            {
              ...(streamId ? { id: streamId } : {}),
              enabled: true,
              data_stream: { type: 'logs', dataset: 'test-dataset' },
            },
          ],
        },
      ],
    } as any);

  it('throws when input.config.id override contains a traversal sequence', () => {
    const policy = policyWithInputId('safe-input-id') as any;
    policy.inputs[0].config = { id: { value: '../../../../tmp/evil' } };
    expect(() => validateNoTraversalInIdOverrides(policy)).toThrow('path traversal');
  });

  it('throws when stream.config.id override contains a traversal sequence', () => {
    const policy = policyWithInputId('safe-input-id') as any;
    policy.inputs[0].streams[0].config = { id: { value: 'a/../../../etc' } };
    expect(() => validateNoTraversalInIdOverrides(policy)).toThrow('path traversal');
  });

  it('throws when overrides.inputs[*].id contains a traversal sequence', () => {
    const policy = policyWithInputId('safe-input-id') as any;
    policy.overrides = { inputs: { 'safe-input-id': { id: '../../../../tmp/evil' } } };
    expect(() => validateNoTraversalInIdOverrides(policy)).toThrow('path traversal');
  });

  it('throws when overrides.inputs[*].streams[*].id contains a traversal sequence', () => {
    const policy = policyWithInputId('safe-input-id') as any;
    policy.overrides = {
      inputs: {
        'safe-input-id': {
          streams: [{ id: 'a/../../../../tmp/evil' }],
        },
      },
    };
    expect(() => validateNoTraversalInIdOverrides(policy)).toThrow('path traversal');
  });

  it('throws when input.config.streams.value[*].id contains a traversal sequence', () => {
    const policy = policyWithInputId('safe-input-id') as any;
    policy.inputs[0].config = { streams: { value: [{ id: 'a/../../../../tmp/evil' }] } };
    expect(() => validateNoTraversalInIdOverrides(policy)).toThrow('path traversal');
  });

  it('throws when input.config.streams.value adds a traversal stream to an input with no streams', () => {
    const policy = policyWithInputId('safe-input-id') as any;
    policy.inputs[0].streams = [];
    policy.inputs[0].config = { streams: { value: [{ id: '../../../../tmp/evil' }] } };
    expect(() => validateNoTraversalInIdOverrides(policy)).toThrow('path traversal');
  });

  it('throws when input.config.streams.value is an index-keyed object with a traversal id', () => {
    const policy = policyWithInputId('safe-input-id') as any;
    policy.inputs[0].config = { streams: { value: { 0: { id: '../../../../tmp/evil' } } } };
    expect(() => validateNoTraversalInIdOverrides(policy)).toThrow('path traversal');
  });

  it('does not throw for safe input.config.streams.value ids', () => {
    const policy = policyWithInputId('safe-input-id') as any;
    policy.inputs[0].config = {
      streams: { value: [{ id: 'logfile-system.syslog-policy123', paths: ['/var/log/../x'] }] },
    };
    expect(() => validateNoTraversalInIdOverrides(policy)).not.toThrow();
  });

  it('does not throw for non-identity nested ids in input.config.streams.value', () => {
    const policy = policyWithInputId('safe-input-id') as any;
    policy.inputs[0].config = {
      streams: { value: [{ processors: [{ add_fields: { fields: { id: '../../x' } } }] }] },
    };
    expect(() => validateNoTraversalInIdOverrides(policy)).not.toThrow();
  });

  it('does not throw for a non-identity nested id in an override (e.g. event-data field)', () => {
    const policy = policyWithInputId('safe-input-id') as any;
    policy.overrides = {
      inputs: {
        'safe-input-id': {
          processors: [{ add_fields: { target: '', fields: { id: 42 } } }],
          streams: [{ meta: { nested: { id: '../../not-a-path' } } }],
        },
      },
    };
    expect(() => validateNoTraversalInIdOverrides(policy)).not.toThrow();
  });

  it('does not throw for safe nested override ids', () => {
    const policy = policyWithInputId('safe-input-id') as any;
    policy.overrides = {
      inputs: {
        'safe-input-id': {
          id: 'cloudbeat/cis_k8s-safe',
          streams: [{ id: 'logfile-system.syslog-policy123' }],
        },
      },
    };
    expect(() => validateNoTraversalInIdOverrides(policy)).not.toThrow();
  });

  it('does not throw for a safe input.config.id override', () => {
    const policy = policyWithInputId('safe-input-id') as any;
    policy.inputs[0].config = { id: { value: 'cloudbeat/cis_k8s-safe' } };
    expect(() => validateNoTraversalInIdOverrides(policy)).not.toThrow();
  });

  it('rejects a non-string config.id override without crashing (no 500)', () => {
    const policy = policyWithInputId('safe-input-id') as any;
    policy.inputs[0].config = { id: { value: 42 } };
    expect(() => validateNoTraversalInIdOverrides(policy)).toThrow('path traversal');
  });

  it('ignores a null config.id override value', () => {
    const policy = policyWithInputId('safe-input-id') as any;
    policy.inputs[0].config = { id: { value: null } };
    expect(() => validateNoTraversalInIdOverrides(policy)).not.toThrow();
  });
});

describe('validateNoTraversalInCompiledIds', () => {
  const inputWith = (compiled: { input?: any; stream?: any }) =>
    [
      {
        id: 'safe-input-id',
        type: 'logfile',
        enabled: true,
        ...(compiled.input !== undefined ? { compiled_input: compiled.input } : {}),
        streams: [
          {
            id: 'safe-stream-id',
            enabled: true,
            data_stream: { type: 'logs', dataset: 'test-dataset' },
            ...(compiled.stream !== undefined ? { compiled_stream: compiled.stream } : {}),
          },
        ],
      },
    ] as any;

  it('throws when compiled_stream.id contains a traversal sequence', () => {
    expect(() =>
      validateNoTraversalInCompiledIds(inputWith({ stream: { id: '../../../tmp/evil' } }))
    ).toThrow('path traversal');
  });

  it('throws when compiled_input.id contains a traversal sequence', () => {
    expect(() =>
      validateNoTraversalInCompiledIds(inputWith({ input: { id: 'a/../../tmp/evil' } }))
    ).toThrow('path traversal');
  });

  it('throws when compiled_input.streams[*].id contains a traversal sequence', () => {
    expect(() =>
      validateNoTraversalInCompiledIds(
        inputWith({ input: { streams: [{ id: '../../../tmp/evil' }] } })
      )
    ).toThrow('path traversal');
  });

  it('does not throw for safe compiled ids, including ones with a slash', () => {
    expect(() =>
      validateNoTraversalInCompiledIds(
        inputWith({
          input: { id: 'cloudbeat/cis_k8s-safe' },
          stream: { id: 'logfile-system.syslog-policy123' },
        })
      )
    ).not.toThrow();
  });

  it('does not throw when there is no compiled output', () => {
    expect(() => validateNoTraversalInCompiledIds(inputWith({}))).not.toThrow();
  });

  it('ignores non-string compiled ids and non-identity nested ids', () => {
    expect(() =>
      validateNoTraversalInCompiledIds(
        inputWith({
          input: { id: 42, processors: [{ add_fields: { fields: { id: '../../x' } } }] },
          stream: { id: { nested: '../x' }, meta: { id: '../../x' } },
        })
      )
    ).not.toThrow();
  });
});

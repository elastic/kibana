/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FLEET_ENDPOINT_PACKAGE } from '../../../common/constants/epm';

import { getInputsWithIds, validateNoTraversalInCompiledIds } from './get_input_with_ids';

describe('getInputsWithIds', () => {
  it('should return inputs and streams with populated IDs if not already present', () => {
    const inputs = getInputsWithIds(
      {
        name: 'test-policy',
        namespace: 'default',
        policy_ids: ['policy1'],
        package: { name: 'test-package', title: 'Test Package', version: '1.0.0' },
        enabled: true,
        inputs: [
          {
            type: 'logfile',
            enabled: true,
            streams: [
              {
                enabled: true,
                data_stream: { type: 'logs', dataset: 'test-dataset' },
              },
              {
                enabled: false,
                data_stream: { type: 'logs', dataset: 'another-dataset' },
              },
            ],
          },
        ],
      },
      'policy123',
      false,
      {
        name: 'test-package',
        title: 'Test Package',
        version: '1.0.0',
        policy_templates: [],
      } as any
    );

    expect(inputs[0].id).toBe('logfile-policy123');
    expect(inputs[0].streams[0].id).toBe('logfile-test-dataset-policy123');
    expect(inputs[0].streams[1].id).toBe('logfile-another-dataset-policy123');
  });

  it('should keep inputs and streams ids if already present', () => {
    const inputs = getInputsWithIds(
      {
        name: 'test-policy',
        namespace: 'default',
        policy_ids: ['policy1'],
        package: { name: 'test-package', title: 'Test Package', version: '1.0.0' },
        enabled: true,
        inputs: [
          {
            id: 'existing-input-id',
            type: 'logfile',
            enabled: true,
            streams: [
              {
                id: 'existing-input-id-1',
                enabled: true,
                data_stream: { type: 'logs', dataset: 'test-dataset' },
              },
              {
                id: 'existing-input-id-2',
                enabled: false,
                data_stream: { type: 'logs', dataset: 'another-dataset' },
              },
            ],
          },
        ],
      },
      'policy123',
      false,
      {
        name: 'test-package',
        title: 'Test Package',
        version: '1.0.0',
        policy_templates: [],
      } as any
    );

    expect(inputs[0].id).toBe('existing-input-id');
    expect(inputs[0].streams[0].id).toBe('existing-input-id-1');
    expect(inputs[0].streams[1].id).toBe('existing-input-id-2');
  });

  it('should force endpoint input id to the package policy id when already present', () => {
    const inputs = getInputsWithIds(
      {
        name: 'endpoint-policy',
        namespace: 'default',
        policy_ids: ['policy1'],
        package: {
          name: FLEET_ENDPOINT_PACKAGE,
          title: 'Elastic Defend',
          version: '1.0.0',
        },
        enabled: true,
        inputs: [
          {
            id: 'stale-input-id',
            type: 'endpoint',
            enabled: true,
            streams: [
              {
                id: 'existing-stream-id',
                enabled: true,
                data_stream: { type: 'logs', dataset: 'endpoint.events' },
              },
            ],
          },
        ],
      },
      'endpoint-package-policy-id',
      false,
      {
        name: FLEET_ENDPOINT_PACKAGE,
        title: 'Elastic Defend',
        version: '1.0.0',
        policy_templates: [],
      } as any
    );

    expect(inputs[0].id).toBe('endpoint-package-policy-id');
    expect(inputs[0].streams[0].id).toBe('existing-stream-id');
  });

  it('should force endpoint input id using package policy package name when package info is unavailable', () => {
    const inputs = getInputsWithIds(
      {
        name: 'endpoint-policy',
        namespace: 'default',
        policy_ids: ['policy1'],
        package: {
          name: FLEET_ENDPOINT_PACKAGE,
          title: 'Elastic Defend',
          version: '1.0.0',
        },
        enabled: true,
        inputs: [
          {
            id: 'stale-input-id',
            type: 'endpoint',
            enabled: true,
            streams: [],
          },
        ],
      },
      'endpoint-package-policy-id'
    );

    expect(inputs[0].id).toBe('endpoint-package-policy-id');
  });

  it('should use default endpoint template input id when package policy id is unavailable', () => {
    const inputs = getInputsWithIds(
      {
        name: 'endpoint-policy',
        namespace: 'default',
        policy_ids: ['policy1'],
        package: {
          name: FLEET_ENDPOINT_PACKAGE,
          title: 'Elastic Defend',
          version: '1.0.0',
        },
        enabled: true,
        inputs: [
          {
            type: 'endpoint',
            enabled: true,
            streams: [],
          },
        ],
      },
      undefined,
      false,
      {
        name: FLEET_ENDPOINT_PACKAGE,
        title: 'Elastic Defend',
        version: '1.0.0',
        policy_templates: [],
      } as any
    );

    expect(inputs[0].id).toBe('default');
  });

  it('should use name instead of type when generating IDs for inputs with name', () => {
    const inputs = getInputsWithIds(
      {
        name: 'test-policy',
        namespace: 'default',
        policy_ids: ['policy1'],
        package: { name: 'nginx', title: 'Nginx', version: '1.0.0' },
        enabled: true,
        inputs: [
          {
            type: 'otelcol',
            name: 'filelog_otel',
            policy_template: 'nginx',
            enabled: true,
            streams: [
              {
                enabled: true,
                data_stream: { type: 'logs', dataset: 'nginx.access' },
              },
            ],
          },
          {
            type: 'otelcol',
            name: 'nginx_otel',
            policy_template: 'nginx',
            enabled: true,
            streams: [
              {
                enabled: true,
                data_stream: { type: 'metrics', dataset: 'nginx.stubstatus' },
              },
            ],
          },
        ],
      },
      'policy123',
      false,
      {
        name: 'nginx',
        title: 'Nginx',
        version: '1.0.0',
        policy_templates: [],
      } as any
    );

    expect(inputs[0].id).toBe('filelog_otel-nginx-policy123');
    expect(inputs[0].streams[0].id).toBe('filelog_otel-nginx.access-policy123');
    expect(inputs[1].id).toBe('nginx_otel-nginx-policy123');
    expect(inputs[1].streams[0].id).toBe('nginx_otel-nginx.stubstatus-policy123');
  });

  it('should fall back to type when name is not present', () => {
    const inputs = getInputsWithIds(
      {
        name: 'test-policy',
        namespace: 'default',
        policy_ids: ['policy1'],
        package: { name: 'test-package', title: 'Test Package', version: '1.0.0' },
        enabled: true,
        inputs: [
          {
            type: 'logfile',
            enabled: true,
            streams: [
              {
                enabled: true,
                data_stream: { type: 'logs', dataset: 'test-dataset' },
              },
            ],
          },
        ],
      },
      'policy123',
      false,
      {
        name: 'test-package',
        title: 'Test Package',
        version: '1.0.0',
        policy_templates: [],
      } as any
    );

    expect(inputs[0].id).toBe('logfile-policy123');
    expect(inputs[0].streams[0].id).toBe('logfile-test-dataset-policy123');
  });

  describe('path traversal validation', () => {
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

    it('throws when a client-supplied input id contains a traversal sequence', () => {
      expect(() =>
        getInputsWithIds(policyWithInputId('../../../../tmp/report-proof'), 'policy123')
      ).toThrow('path traversal');
    });

    it('throws when a client-supplied stream id contains a traversal sequence', () => {
      expect(() =>
        getInputsWithIds(policyWithInputId('safe-input-id', 'a/../../etc'), 'policy123')
      ).toThrow('path traversal');
    });

    it('does not throw for a client-supplied input id containing a legitimate slash', () => {
      expect(() =>
        getInputsWithIds(policyWithInputId('cloudbeat/cis_k8s-kspm-policy123'), 'policy123')
      ).not.toThrow();
    });

    it('skips validation when validateIds is false (stored-data callers)', () => {
      const inputs = getInputsWithIds(
        policyWithInputId('../../../../tmp/report-proof'),
        'policy123',
        false,
        undefined,
        false
      );
      expect(inputs[0].id).toBe('../../../../tmp/report-proof');
    });

    it('throws when input.config.id override contains a traversal sequence', () => {
      const policy = policyWithInputId('safe-input-id') as any;
      policy.inputs[0].config = { id: { value: '../../../../tmp/evil' } };
      expect(() => getInputsWithIds(policy, 'policy123')).toThrow('path traversal');
    });

    it('throws when stream.config.id override contains a traversal sequence', () => {
      const policy = policyWithInputId('safe-input-id') as any;
      policy.inputs[0].streams[0].config = { id: { value: 'a/../../../etc' } };
      expect(() => getInputsWithIds(policy, 'policy123')).toThrow('path traversal');
    });

    it('throws when overrides.inputs[*].id contains a traversal sequence', () => {
      const policy = policyWithInputId('safe-input-id') as any;
      policy.overrides = { inputs: { 'safe-input-id': { id: '../../../../tmp/evil' } } };
      expect(() => getInputsWithIds(policy, 'policy123')).toThrow('path traversal');
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
      expect(() => getInputsWithIds(policy, 'policy123')).toThrow('path traversal');
    });

    it('throws when input.config.streams.value[*].id contains a traversal sequence', () => {
      const policy = policyWithInputId('safe-input-id') as any;
      policy.inputs[0].config = { streams: { value: [{ id: 'a/../../../../tmp/evil' }] } };
      expect(() => getInputsWithIds(policy, 'policy123')).toThrow('path traversal');
    });

    it('throws when input.config.streams.value adds a traversal stream to an input with no streams', () => {
      const policy = policyWithInputId('safe-input-id') as any;
      policy.inputs[0].streams = [];
      policy.inputs[0].config = { streams: { value: [{ id: '../../../../tmp/evil' }] } };
      expect(() => getInputsWithIds(policy, 'policy123')).toThrow('path traversal');
    });

    it('throws when input.config.streams.value is an index-keyed object with a traversal id', () => {
      const policy = policyWithInputId('safe-input-id') as any;
      policy.inputs[0].config = { streams: { value: { 0: { id: '../../../../tmp/evil' } } } };
      expect(() => getInputsWithIds(policy, 'policy123')).toThrow('path traversal');
    });

    it('does not throw for safe input.config.streams.value ids', () => {
      const policy = policyWithInputId('safe-input-id') as any;
      policy.inputs[0].config = {
        streams: { value: [{ id: 'logfile-system.syslog-policy123', paths: ['/var/log/../x'] }] },
      };
      expect(() => getInputsWithIds(policy, 'policy123')).not.toThrow();
    });

    it('does not throw for non-identity nested ids in input.config.streams.value', () => {
      const policy = policyWithInputId('safe-input-id') as any;
      policy.inputs[0].config = {
        streams: { value: [{ processors: [{ add_fields: { fields: { id: '../../x' } } }] }] },
      };
      expect(() => getInputsWithIds(policy, 'policy123')).not.toThrow();
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
      expect(() => getInputsWithIds(policy, 'policy123')).not.toThrow();
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
      expect(() => getInputsWithIds(policy, 'policy123')).not.toThrow();
    });

    it('does not throw for a safe input.config.id override', () => {
      const policy = policyWithInputId('safe-input-id') as any;
      policy.inputs[0].config = { id: { value: 'cloudbeat/cis_k8s-safe' } };
      expect(() => getInputsWithIds(policy, 'policy123')).not.toThrow();
    });

    it('rejects a non-string config.id override without crashing (no 500)', () => {
      const policy = policyWithInputId('safe-input-id') as any;
      policy.inputs[0].config = { id: { value: 42 } };
      expect(() => getInputsWithIds(policy, 'policy123')).toThrow('path traversal');
    });

    it('ignores a null config.id override value', () => {
      const policy = policyWithInputId('safe-input-id') as any;
      policy.inputs[0].config = { id: { value: null } };
      expect(() => getInputsWithIds(policy, 'policy123')).not.toThrow();
    });
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

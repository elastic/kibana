/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getInputsWithIds } from './get_input_with_ids';

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
});

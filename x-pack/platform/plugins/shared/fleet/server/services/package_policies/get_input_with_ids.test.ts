/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FLEET_ENDPOINT_PACKAGE } from '../../../common/constants/epm';

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
});

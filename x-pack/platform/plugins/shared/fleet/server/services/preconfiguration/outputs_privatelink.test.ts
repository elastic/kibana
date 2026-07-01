/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SERVERLESS_DEFAULT_OUTPUT_ID, SERVERLESS_PRIVATE_OUTPUT_ID } from '../../constants';

import { getPreconfiguredOutputFromConfig } from './outputs';

jest.mock('../app_context', () => ({
  appContextService: {
    getExperimentalFeatures: jest.fn().mockReturnValue({ useSpaceAwareness: false }),
    getInternalUserSOClient: jest.fn(),
    getInternalUserSOClientWithoutSpaceExtension: jest.fn(),
    getLogger: () =>
      new Proxy(
        {},
        {
          get() {
            return jest.fn();
          },
        }
      ),
    getTaskManagerStart: jest.fn(),
    getCloud: jest.fn().mockReturnValue(null),
    getConfig: jest.fn().mockReturnValue({}),
  },
}));

jest.mock('../agent_policy_update');
jest.mock('../output');
jest.mock('../epm/packages/bundled_packages');
jest.mock('../epm/archive');
jest.mock('../settings');

describe('getPreconfiguredOutputFromConfig — PrivateLink allow_edit injection', () => {
  const baseConfig = {
    agents: { elasticsearch: { hosts: undefined } },
  } as any;

  it('should inject allow_edit on the serverless default output', () => {
    const config = {
      ...baseConfig,
      outputs: [
        {
          id: SERVERLESS_DEFAULT_OUTPUT_ID,
          name: 'Default',
          type: 'elasticsearch' as const,
          is_default: true,
          is_default_monitoring: true,
          hosts: ['https://es.example.com'],
        },
      ],
    };

    const res = getPreconfiguredOutputFromConfig(config);
    const defaultOutput = res.find((o) => o.id === SERVERLESS_DEFAULT_OUTPUT_ID);

    expect(defaultOutput?.allow_edit).toContain('is_default');
    expect(defaultOutput?.allow_edit).toContain('is_default_monitoring');
  });

  it('should inject allow_edit on the PrivateLink output', () => {
    const config = {
      ...baseConfig,
      outputs: [
        {
          id: SERVERLESS_DEFAULT_OUTPUT_ID,
          name: 'Default',
          type: 'elasticsearch' as const,
          is_default: true,
          is_default_monitoring: true,
          hosts: ['https://es.example.com'],
        },
        {
          id: SERVERLESS_PRIVATE_OUTPUT_ID,
          name: 'Private ES Output',
          type: 'elasticsearch' as const,
          is_default: false,
          is_default_monitoring: false,
          is_internal: true,
          hosts: ['https://private-es.example.com'],
        },
      ],
    };

    const res = getPreconfiguredOutputFromConfig(config);
    const privateOutput = res.find((o) => o.id === SERVERLESS_PRIVATE_OUTPUT_ID);

    expect(privateOutput?.allow_edit).toContain('is_default');
    expect(privateOutput?.allow_edit).toContain('is_default_monitoring');
  });

  it('should not inject allow_edit on non-PrivateLink outputs', () => {
    const config = {
      ...baseConfig,
      outputs: [
        {
          id: 'custom-output',
          name: 'Custom',
          type: 'elasticsearch' as const,
          is_default: true,
          is_default_monitoring: true,
          hosts: ['https://es.example.com'],
        },
      ],
    };

    const res = getPreconfiguredOutputFromConfig(config);
    const output = res.find((o) => o.id === 'custom-output');

    expect(output?.allow_edit).toBeUndefined();
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../agents', () => ({
  getAvailableVersions: jest
    .fn()
    .mockResolvedValue(['9.3.0', '9.1.0', '8.6.0', '8.9.0', '8.8.0', '7.17.0']),
}));

jest.mock('../app_context', () => ({
  appContextService: {
    getKibanaVersion: () => '9.3.0',
    getLogger: () => ({
      debug: jest.fn(),
    }),
  },
}));

jest.mock('../agent_policy', () => ({
  agentPolicyService: {
    getFullAgentPolicy: jest.fn().mockImplementation(async (_, id, { agentVersion }) => {
      const inputs = agentVersion.startsWith('9.')
        ? [
            {
              type: 'cel',
            },
          ]
        : [];

      if (id === 'policyBothConditions') {
        inputs.unshift({
          meta: { package: { agentVersion: '>=9.3.0' } },
        } as any);
      }

      return {
        inputs,
      };
    }),
  },
}));

import {
  getAgentVersionsForVersionSpecificPolicies,
  getVersionSpecificPolicies,
} from './version_specific_policies';

describe('getAgentVersionsForVersionSpecificPolicies', () => {
  it('should return the correct common agent versions', async () => {
    const result = await getAgentVersionsForVersionSpecificPolicies();
    expect(result).toEqual(['9.3', '9.2', '8.9']);
  });
});

describe('getVersionSpecificPolicies', () => {
  const soClient = {} as any;
  const fleetServerPolicy = { data: { inputs: [] } } as any;
  it('should create version specific policies with common agent versions and package level condition', async () => {
    const policies = await getVersionSpecificPolicies(soClient, fleetServerPolicy, {
      id: 'policy1',
      inputs: [
        {
          meta: { package: { agentVersion: '>=9.3.0' } },
        },
      ],
    } as any);
    expect(policies).toEqual([
      {
        data: {
          inputs: [
            {
              meta: {
                package: {
                  agentVersion: '>=9.3.0',
                },
              },
            },
          ],
        },
        policy_id: 'policy1#9.3',
      },
      {
        data: {
          inputs: [],
        },
        policy_id: 'policy1#9.2',
      },
      {
        data: {
          inputs: [],
        },
        policy_id: 'policy1#8.9',
      },
    ]);
  });

  it('should create version specific policies with custom agent versions and package level condition', async () => {
    const policies = await getVersionSpecificPolicies(
      soClient,
      fleetServerPolicy,
      {
        id: 'policy1',
        inputs: [
          {
            meta: { package: { agentVersion: '>=9.3.0' } },
          },
        ],
      } as any,
      ['9.4', '9.1']
    );
    expect(policies).toEqual([
      {
        data: {
          inputs: [
            {
              meta: {
                package: {
                  agentVersion: '>=9.3.0',
                },
              },
            },
          ],
        },
        policy_id: 'policy1#9.4',
      },
      {
        data: {
          inputs: [],
        },
        policy_id: 'policy1#9.1',
      },
    ]);
  });

  it('should create version specific policies with common agent versions and template level condition', async () => {
    const policies = await getVersionSpecificPolicies(soClient, fleetServerPolicy, {
      id: 'policy1',
      inputs: [{}],
    } as any);
    expect(policies).toEqual([
      {
        data: {
          inputs: [
            {
              type: 'cel',
            },
          ],
        },
        policy_id: 'policy1#9.3',
      },
      {
        data: {
          inputs: [
            {
              type: 'cel',
            },
          ],
        },
        policy_id: 'policy1#9.2',
      },
      {
        data: {
          inputs: [],
        },
        policy_id: 'policy1#8.9',
      },
    ]);
  });

  it('should create version specific policies with custom agent versions and template level condition', async () => {
    const policies = await getVersionSpecificPolicies(
      soClient,
      fleetServerPolicy,
      { id: 'policy1', inputs: [{}] } as any,
      ['9.4', '9.1']
    );
    expect(policies).toEqual([
      {
        data: {
          inputs: [
            {
              type: 'cel',
            },
          ],
        },
        policy_id: 'policy1#9.4',
      },
      {
        data: {
          inputs: [
            {
              type: 'cel',
            },
          ],
        },
        policy_id: 'policy1#9.1',
      },
    ]);
  });

  it('should create version specific policies with common agent versions and both package and template level condition', async () => {
    const policies = await getVersionSpecificPolicies(soClient, fleetServerPolicy, {
      id: 'policyBothConditions',
      inputs: [
        {
          meta: { package: { agentVersion: '>=9.3.0' } },
        },
        {},
      ],
    } as any);
    expect(policies).toEqual([
      {
        data: {
          inputs: [
            {
              meta: { package: { agentVersion: '>=9.3.0' } },
            },
            {
              type: 'cel',
            },
          ],
        },
        policy_id: 'policyBothConditions#9.3',
      },
      {
        data: {
          inputs: [
            {
              type: 'cel',
            },
          ],
        },
        policy_id: 'policyBothConditions#9.2',
      },
      {
        data: {
          inputs: [],
        },
        policy_id: 'policyBothConditions#8.9',
      },
    ]);
  });
});

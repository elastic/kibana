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
  getAgentsByKuery: jest.fn(),
  reassignAgents: jest.fn(),
}));

jest.mock('../app_context', () => ({
  appContextService: {
    getKibanaVersion: () => '9.3.0',
    getLogger: () => ({
      debug: jest.fn(),
      info: jest.fn(),
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

import * as AgentService from '../agents';

import {
  buildVariantAgentsKuery,
  deleteVersionSpecificFleetServerPolicies,
  deleteVersionSpecificFleetServerPoliciesForVersions,
  getAgentAssignedVersionsForPolicies,
  getAgentCountsForVariantPolicyIds,
  getAgentVersionsForVersionSpecificPolicies,
  getVersionSpecificPolicies,
  reassignAgentsFromVersionSpecificPolicies,
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
          id: 'policy1#9.3',
          inputs: [{ meta: { package: { agentVersion: '>=9.3.0' } } }],
          secret_references: [],
        },
        policy_id: 'policy1#9.3',
        policy_base_id: 'policy1',
      },
      {
        data: {
          id: 'policy1#9.2',
          inputs: [],
          secret_references: [],
        },
        policy_id: 'policy1#9.2',
        policy_base_id: 'policy1',
      },
      {
        data: {
          id: 'policy1#8.9',
          inputs: [],
          secret_references: [],
        },
        policy_id: 'policy1#8.9',
        policy_base_id: 'policy1',
      },
    ]);
  });

  it('should create version specific policies with custom agent versions and package level condition', async () => {
    const policies = await getVersionSpecificPolicies(
      soClient,
      fleetServerPolicy,
      {
        id: 'policy1',
        inputs: [{ meta: { package: { agentVersion: '>=9.3.0' } } }],
      } as any,
      ['9.4', '9.1']
    );
    expect(policies).toEqual([
      {
        data: {
          id: 'policy1#9.4',
          inputs: [{ meta: { package: { agentVersion: '>=9.3.0' } } }],
          secret_references: [],
        },
        policy_id: 'policy1#9.4',
        policy_base_id: 'policy1',
      },
      {
        data: {
          id: 'policy1#9.1',
          inputs: [],
          secret_references: [],
        },
        policy_id: 'policy1#9.1',
        policy_base_id: 'policy1',
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
          id: 'policy1#9.3',
          inputs: [{ type: 'cel' }],
          secret_references: [],
        },
        policy_id: 'policy1#9.3',
        policy_base_id: 'policy1',
      },
      {
        data: {
          id: 'policy1#9.2',
          inputs: [{ type: 'cel' }],
          secret_references: [],
        },
        policy_id: 'policy1#9.2',
        policy_base_id: 'policy1',
      },
      {
        data: {
          id: 'policy1#8.9',
          inputs: [],
          secret_references: [],
        },
        policy_id: 'policy1#8.9',
        policy_base_id: 'policy1',
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
          id: 'policy1#9.4',
          inputs: [{ type: 'cel' }],
          secret_references: [],
        },
        policy_id: 'policy1#9.4',
        policy_base_id: 'policy1',
      },
      {
        data: {
          id: 'policy1#9.1',
          inputs: [{ type: 'cel' }],
          secret_references: [],
        },
        policy_id: 'policy1#9.1',
        policy_base_id: 'policy1',
      },
    ]);
  });

  it('should create version specific policies with common agent versions and both package and template level condition', async () => {
    const policies = await getVersionSpecificPolicies(soClient, fleetServerPolicy, {
      id: 'policyBothConditions',
      inputs: [{ meta: { package: { agentVersion: '>=9.3.0' } } }, {}],
    } as any);
    expect(policies).toEqual([
      {
        data: {
          id: 'policyBothConditions#9.3',
          inputs: [{ meta: { package: { agentVersion: '>=9.3.0' } } }, { type: 'cel' }],
          secret_references: [],
        },
        policy_id: 'policyBothConditions#9.3',
        policy_base_id: 'policyBothConditions',
      },
      {
        data: {
          id: 'policyBothConditions#9.2',
          inputs: [{ type: 'cel' }],
          secret_references: [],
        },
        policy_id: 'policyBothConditions#9.2',
        policy_base_id: 'policyBothConditions',
      },
      {
        data: {
          id: 'policyBothConditions#8.9',
          inputs: [],
          secret_references: [],
        },
        policy_id: 'policyBothConditions#8.9',
        policy_base_id: 'policyBothConditions',
      },
    ]);
  });

  it('uses the rebuilt policy secret_references when the policy is rebuilt for the agent version', async () => {
    const { agentPolicyService: mockedAgentPolicyService } = jest.requireMock(
      '../agent_policy'
    ) as any;
    mockedAgentPolicyService.getFullAgentPolicy.mockImplementation(
      async (_: any, id: string, { agentVersion }: { agentVersion: string }) => ({
        id,
        inputs: agentVersion.startsWith('9.')
          ? [{ type: 'cel', credential: '$co.elastic.secret{secret-for-9x}' }]
          : [],
        secret_references: agentVersion.startsWith('9.') ? [{ id: 'secret-for-9x' }] : [],
      })
    );

    const localFleetServerPolicy = {
      data: { inputs: [], secret_references: [{ id: 'base-secret' }] },
    } as any;
    const fullPolicy = {
      id: 'policy1',
      inputs: [{}],
      secret_references: [{ id: 'base-secret' }],
    } as any;

    const policies = await getVersionSpecificPolicies(
      soClient,
      localFleetServerPolicy,
      fullPolicy,
      ['9.3', '8.9']
    );

    const policy93 = policies.find((p) => p.policy_id === 'policy1#9.3');
    const policy89 = policies.find((p) => p.policy_id === 'policy1#8.9');

    expect(policy93!.data.secret_references).toEqual([{ id: 'secret-for-9x' }]);
    expect(policy89!.data.secret_references).toEqual([]);
  });
});

describe('reassignAgentsFromVersionSpecificPolicies', () => {
  const soClient = {} as any;
  const esClient = { deleteByQuery: jest.fn() } as any;
  const getAgentsByKueryMock = AgentService.getAgentsByKuery as jest.Mock;
  const reassignAgentsMock = AgentService.reassignAgents as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    esClient.deleteByQuery.mockResolvedValue({});
  });

  const variantKuery = 'policy_base_id:"policy1" and not policy_id:"policy1"';

  it('reassigns agents on variant policies back to the base policy', async () => {
    getAgentsByKueryMock.mockResolvedValue({ total: 3 });

    await reassignAgentsFromVersionSpecificPolicies(soClient, esClient, 'policy1');

    expect(getAgentsByKueryMock).toHaveBeenCalledWith(esClient, soClient, {
      kuery: variantKuery,
      showInactive: false,
      perPage: 0,
    });
    expect(reassignAgentsMock).toHaveBeenCalledWith(
      soClient,
      esClient,
      { kuery: variantKuery, showInactive: false },
      'policy1'
    );
  });

  it('does not reassign when there are no agents on variant policies', async () => {
    getAgentsByKueryMock.mockResolvedValue({ total: 0 });

    await reassignAgentsFromVersionSpecificPolicies(soClient, esClient, 'policy1');

    expect(reassignAgentsMock).not.toHaveBeenCalled();
  });

  it('does not delete variant documents (deletion is owned by the periodic sweep)', async () => {
    getAgentsByKueryMock.mockResolvedValue({ total: 3 });

    await reassignAgentsFromVersionSpecificPolicies(soClient, esClient, 'policy1');

    expect(esClient.deleteByQuery).not.toHaveBeenCalled();
  });
});

describe('deleteVersionSpecificFleetServerPolicies', () => {
  const esClient = { deleteByQuery: jest.fn() } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    esClient.deleteByQuery.mockResolvedValue({});
  });

  it('deletes only the variant documents via policy_base_id (excluding the base) without forcing a refresh', async () => {
    await deleteVersionSpecificFleetServerPolicies(esClient, 'policy1');

    expect(esClient.deleteByQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        index: '.fleet-policies',
        query: {
          bool: {
            filter: [{ term: { policy_base_id: 'policy1' } }],
            must_not: [{ term: { policy_id: 'policy1' } }],
          },
        },
        refresh: false,
      })
    );
  });
});

describe('buildVariantAgentsKuery', () => {
  it('matches variant assignments via policy_base_id and excludes the base policy (no wildcard)', () => {
    const kuery = buildVariantAgentsKuery('policy1');
    expect(kuery).toBe('policy_base_id:"policy1" and not policy_id:"policy1"');
    expect(kuery).not.toContain('*');
  });
});

describe('deleteVersionSpecificFleetServerPoliciesForVersions', () => {
  const esClient = { deleteByQuery: jest.fn() } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    esClient.deleteByQuery.mockResolvedValue({});
  });

  it('does nothing when given an empty list', async () => {
    await deleteVersionSpecificFleetServerPoliciesForVersions(esClient, [], {
      writtenBefore: '2025-01-01T00:00:00.000Z',
    });
    expect(esClient.deleteByQuery).not.toHaveBeenCalled();
  });

  it('deletes specific variant docs by policy_id with @timestamp range, without forcing a refresh', async () => {
    await deleteVersionSpecificFleetServerPoliciesForVersions(
      esClient,
      ['policy-1#9.2', 'policy-1#8.18'],
      { writtenBefore: '2026-01-01T00:00:00.000Z' }
    );

    expect(esClient.deleteByQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        index: '.fleet-policies',
        query: {
          bool: {
            filter: [
              { terms: { policy_id: ['policy-1#9.2', 'policy-1#8.18'] } },
              { range: { '@timestamp': { lt: '2026-01-01T00:00:00.000Z' } } },
            ],
          },
        },
        refresh: false,
      })
    );
  });
});

describe('getAgentAssignedVersionsForPolicies', () => {
  const esClient = { search: jest.fn() } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns an empty map without querying when given no parent ids', async () => {
    const result = await getAgentAssignedVersionsForPolicies(esClient, []);

    expect(esClient.search).not.toHaveBeenCalled();
    expect(result.size).toBe(0);
  });

  it('returns an empty map without querying .fleet-agents when no variants exist in .fleet-policies', async () => {
    // Step 1 returns no variant buckets → early return, step 2 never runs.
    esClient.search.mockResolvedValueOnce({
      aggregations: { variant_policy_ids: { buckets: [] } },
    });

    const result = await getAgentAssignedVersionsForPolicies(esClient, ['policy-1']);

    expect(esClient.search).toHaveBeenCalledTimes(1);
    expect(result.size).toBe(0);
  });

  it('queries .fleet-policies by policy_base_id then .fleet-agents by policy_id, grouping version suffixes by parent id', async () => {
    // Step 1: .fleet-policies returns the variant ids that exist for these parents.
    esClient.search.mockResolvedValueOnce({
      aggregations: {
        variant_policy_ids: {
          buckets: [
            { key: 'policy-1#9.4' },
            { key: 'policy-1#8.18' },
            { key: 'policy-2#9.4' },
            { key: 'policy-1' }, // base-id doc — filtered out (no version suffix)
          ],
        },
      },
    });
    // Step 2: .fleet-agents by policy_id — includes an agent without policy_base_id (downlevel enrollment).
    esClient.search.mockResolvedValueOnce({
      aggregations: {
        agents_by_policy_id: {
          buckets: [{ key: 'policy-1#9.4' }, { key: 'policy-1#8.18' }, { key: 'policy-2#9.4' }],
        },
      },
    });

    const result = await getAgentAssignedVersionsForPolicies(esClient, ['policy-1', 'policy-2']);

    // Step 1 must query .fleet-policies by policy_base_id.
    expect(esClient.search).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        index: '.fleet-policies',
        size: 0,
        query: {
          bool: {
            filter: [{ terms: { policy_base_id: ['policy-1', 'policy-2'] } }],
          },
        },
      })
    );
    // Step 2 must query .fleet-agents by the exact variant policy_ids from step 1 (not policy_base_id).
    // This catches downlevel-enrolled agents that lack a policy_base_id field.
    expect(esClient.search).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        index: '.fleet-agents',
        size: 0,
        query: {
          bool: {
            filter: [{ terms: { policy_id: ['policy-1#9.4', 'policy-1#8.18', 'policy-2#9.4'] } }],
          },
        },
      })
    );
    expect(result.get('policy-1')).toEqual(new Set(['9.4', '8.18']));
    expect(result.get('policy-2')).toEqual(new Set(['9.4']));
  });
});

describe('getAgentCountsForVariantPolicyIds', () => {
  const esClient = { search: jest.fn() } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns an empty map without querying when given no variant ids', async () => {
    const result = await getAgentCountsForVariantPolicyIds(esClient, []);

    expect(esClient.search).not.toHaveBeenCalled();
    expect(result.size).toBe(0);
  });

  it('queries .fleet-agents by policy_id with no active/status filter and returns counts', async () => {
    esClient.search.mockResolvedValue({
      aggregations: {
        agents_by_policy_id: {
          buckets: [{ key: 'policy-1#9.2', doc_count: 3 }],
          // policy-1#8.18 absent from buckets → zero agents for it
        },
      },
    });

    const result = await getAgentCountsForVariantPolicyIds(esClient, [
      'policy-1#9.2',
      'policy-1#8.18',
    ]);

    const call = esClient.search.mock.calls[0][0];
    // Must NOT filter on active / status — inactive and unenrolled agents must block deletion too.
    expect(JSON.stringify(call.query)).not.toContain('active');
    expect(JSON.stringify(call.query)).not.toContain('status');
    expect(call.query.bool.filter[0]).toEqual({
      terms: { policy_id: ['policy-1#9.2', 'policy-1#8.18'] },
    });
    expect(result.get('policy-1#9.2')).toBe(3);
    expect(result.has('policy-1#8.18')).toBe(false); // zero — absent from map
  });

  it('issues multiple search requests when variant ids exceed the chunk size (>1000)', async () => {
    const ids = Array.from({ length: 1001 }, (_, i) => `policy-1#9.${i}`);
    esClient.search.mockResolvedValue({
      aggregations: { agents_by_policy_id: { buckets: [] } },
    });

    await getAgentCountsForVariantPolicyIds(esClient, ids);

    expect(esClient.search).toHaveBeenCalledTimes(2);
  });
});

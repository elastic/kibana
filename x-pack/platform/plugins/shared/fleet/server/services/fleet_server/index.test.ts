/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';

import type { PackagePolicy } from '../../../common';

import { appContextService } from '..';

import type { MockedFleetAppContext } from '../../mocks';
import { createAppContextStartContractMock } from '../../mocks';

import { agentPolicyService } from '../agent_policy';
import { packagePolicyService } from '../package_policy';
import { getAgentsByKuery, getAgentStatusById, getAgentStatusForAgentPolicy } from '../agents';

import {
  checkFleetServerVersionsForSecretsStorage,
  hasFleetServersForPolicies,
  getFleetServerPolicies,
} from '.';

jest.mock('../agent_policy');
jest.mock('../agents');

const mockedAgentPolicyService = agentPolicyService as jest.Mocked<typeof agentPolicyService>;
const mockedPackagePolicyService = packagePolicyService as jest.Mocked<typeof packagePolicyService>;
const mockedGetAgentsByKuery = getAgentsByKuery as jest.MockedFunction<typeof getAgentsByKuery>;
const mockedGetAgentStatusById = getAgentStatusById as jest.MockedFunction<
  typeof getAgentStatusById
>;

describe('checkFleetServerVersionsForSecretsStorage', () => {
  let mockContext: MockedFleetAppContext;

  beforeEach(() => {
    mockContext = createAppContextStartContractMock();
    appContextService.start(mockContext);
  });

  afterEach(() => {
    appContextService.stop();
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  const esClientMock = elasticsearchServiceMock.createElasticsearchClient();
  const soClientMock = savedObjectsClientMock.create();

  it('should return true if all fleet server versions are at least the specified version and there are no managed policies', async () => {
    const version = '1.0.0';

    jest
      .spyOn(mockedPackagePolicyService, 'list')
      .mockResolvedValueOnce({
        items: [
          {
            id: '1',
            policy_id: '1',
            policy_ids: ['1'],
            package: {
              name: 'fleet_server',
              version: '10.0.0',
            },
          },
          {
            id: '2',
            policy_id: '2',
            policy_ids: ['2'],
            package: {
              name: 'fleet_server',
              version: '10.0.0',
            },
          },
        ],
      } as any)
      .mockResolvedValueOnce({
        items: [],
      } as any);

    mockedAgentPolicyService.getAllManagedAgentPolicies.mockResolvedValueOnce([]);

    mockedGetAgentsByKuery.mockResolvedValueOnce({
      agents: [
        {
          id: '1',
          local_metadata: {
            elastic: {
              agent: {
                version: '10.0.0',
              },
            },
          },
        },
        {
          id: '2',
          local_metadata: {
            elastic: {
              agent: {
                version: '10.0.0',
              },
            },
          },
        },
      ],
    } as any);

    mockedGetAgentStatusById.mockResolvedValue('online');

    const result = await checkFleetServerVersionsForSecretsStorage(
      esClientMock,
      soClientMock,
      version
    );
    expect(result).toBe(true);
    expect(mockedGetAgentsByKuery).toHaveBeenCalledWith(
      esClientMock,
      soClientMock,
      expect.objectContaining({
        // kuery must cover both base and versioned variants (e.g. policy_id:1#*)
        kuery: expect.stringContaining('policy_id:1#*'),
      })
    );
  });

  it('should return true if there are no fleet servers', async () => {
    const version = '1.0.0';

    jest
      .spyOn(mockedPackagePolicyService, 'list')
      .mockResolvedValueOnce({
        items: [
          {
            id: '1',
            policy_id: '1',
            policy_ids: ['1'],
            package: {
              name: 'fleet_server',
              version: '10.0.0',
            },
          },
        ],
      } as any)
      .mockResolvedValueOnce({
        items: [],
      } as any);

    mockedAgentPolicyService.getAllManagedAgentPolicies.mockResolvedValueOnce([]);

    mockedGetAgentsByKuery.mockResolvedValueOnce({
      agents: [],
    } as any);

    mockedGetAgentStatusById.mockResolvedValue('online');

    const result = await checkFleetServerVersionsForSecretsStorage(
      esClientMock,
      soClientMock,
      version
    );
    expect(result).toBe(true);
  });

  it('should query versioned policy_id variants when Fleet Server agent is reassigned', async () => {
    const version = '1.0.0';

    jest
      .spyOn(mockedPackagePolicyService, 'list')
      .mockResolvedValueOnce({
        items: [
          {
            id: '1',
            policy_id: 'fleet-server-policy',
            policy_ids: ['fleet-server-policy'],
            package: { name: 'fleet_server', version: '10.0.0' },
          },
        ],
      } as any)
      .mockResolvedValueOnce({ items: [] } as any);

    mockedAgentPolicyService.getAllManagedAgentPolicies.mockResolvedValueOnce([]);

    // Simulate an agent whose policy_id is the versioned variant (fleet-server-policy#9.4)
    mockedGetAgentsByKuery.mockResolvedValueOnce({
      agents: [
        {
          id: 'agent-1',
          local_metadata: { elastic: { agent: { version: '10.0.0' } } },
        },
      ],
    } as any);

    mockedGetAgentStatusById.mockResolvedValue('online');

    const result = await checkFleetServerVersionsForSecretsStorage(
      esClientMock,
      soClientMock,
      version
    );

    expect(result).toBe(true);
    // Kuery must include the wildcard variant so versioned agents are found
    const kuery = mockedGetAgentsByKuery.mock.calls[0][2].kuery as string;
    expect(kuery).toContain('fleet-server-policy#*');
  });

  it('should return true if a versioned-policy agent is offline but its base policy is managed', async () => {
    // Regression: managedAgentPolicies contains base IDs (e.g. 'fleet-server-policy'),
    // but an agent on a versioned policy has policy_id 'fleet-server-policy#9.4'.
    // The comparison must strip the version suffix before matching.
    const version = '10.0.0';

    jest
      .spyOn(mockedPackagePolicyService, 'list')
      .mockResolvedValueOnce({
        items: [
          {
            id: '1',
            policy_id: 'fleet-server-policy',
            policy_ids: ['fleet-server-policy'],
            package: { name: 'fleet_server', version: '10.0.0' },
          },
        ],
      } as any)
      .mockResolvedValueOnce({ items: [] } as any);

    mockedAgentPolicyService.getAllManagedAgentPolicies.mockResolvedValueOnce([
      { id: 'fleet-server-policy', is_managed: true } as any,
    ]);

    mockedGetAgentsByKuery.mockResolvedValueOnce({
      agents: [
        {
          id: 'agent-versioned',
          policy_id: 'fleet-server-policy#9.4',
          active: true,
          local_metadata: { elastic: { agent: { version: '9.4.0' } } },
        },
      ],
    } as any);

    mockedGetAgentStatusById.mockResolvedValue('offline');

    const result = await checkFleetServerVersionsForSecretsStorage(
      esClientMock,
      soClientMock,
      version
    );
    // Offline managed versioned agent must not block secrets storage
    expect(result).toBe(true);
  });
});

describe('getFleetServerPolicies', () => {
  const soClient = savedObjectsClientMock.create();
  const mockPackagePolicies = [
    {
      id: 'package-policy-1',
      name: 'Package Policy 1',
      package: {
        name: 'fleet_server',
        title: 'Fleet Server',
        version: '1.0.0',
      },
      policy_id: 'fs-policy-1',
      policy_ids: ['fs-policy-1'],
    },
    {
      id: 'package-policy-2',
      name: 'Package Policy 2',
      package: {
        name: 'fleet_server',
        title: 'Fleet Server',
        version: '1.0.0',
      },
      policy_id: 'fs-policy-2',
      policy_ids: ['fs-policy-2'],
    },
    {
      id: 'package-policy-3',
      name: 'Package Policy 3',
      package: {
        name: 'system',
        title: 'System',
        version: '1.0.0',
      },
      policy_id: 'agent-policy-2',
      policy_ids: ['agent-policy-2'],
    },
  ] as PackagePolicy[];
  const mockFleetServerPolicies = [
    {
      id: 'fs-policy-1',
      name: 'FS Policy 1',
      is_managed: true,
      is_default_fleet_server: true,
      has_fleet_server: true,
      download_source_id: undefined,
      fleet_server_host_id: undefined,
    },
    {
      id: 'fs-policy-2',
      name: 'FS Policy 2',
      is_managed: true,
      is_default_fleet_server: false,
      has_fleet_server: false,
      download_source_id: undefined,
      fleet_server_host_id: undefined,
    },
  ];

  it('should return no policies if there are no fleet server package policies', async () => {
    jest.spyOn(mockedPackagePolicyService, 'list').mockResolvedValueOnce({
      items: [],
      total: 0,
      page: 1,
      perPage: 10,
    });
    const result = await getFleetServerPolicies(soClient);
    expect(result).toEqual([]);
  });

  it('should return agent policies with fleet server package policies', async () => {
    jest.spyOn(mockedPackagePolicyService, 'list').mockResolvedValueOnce({
      items: mockPackagePolicies,
      total: mockPackagePolicies.length,
      page: 1,
      perPage: mockPackagePolicies.length,
    });
    (mockedAgentPolicyService.getByIds as jest.Mock).mockResolvedValueOnce(mockFleetServerPolicies);
    const result = await getFleetServerPolicies(soClient);
    expect(result).toEqual(mockFleetServerPolicies);
  });
});

describe('hasActiveFleetServersForPolicies', () => {
  const mockSoClient = savedObjectsClientMock.create();
  const mockEsClient = elasticsearchServiceMock.createInternalClient();

  it('returns false when no agent IDs are provided', async () => {
    const hasFs = await hasFleetServersForPolicies(mockEsClient, mockSoClient, []);
    expect(hasFs).toBe(false);
  });

  describe('activeOnly is true', () => {
    it('returns true when at least one agent is online', async () => {
      (getAgentStatusForAgentPolicy as jest.Mock).mockResolvedValueOnce({
        other: 0,
        events: 0,
        total: 1,
        all: 1,
        active: 0,
        updating: 0,
        offline: 0,
        inactive: 0,
        unenrolled: 0,
        online: 1,
        error: 0,
      });
      const hasFs = await hasFleetServersForPolicies(
        mockEsClient,
        mockSoClient,
        [{ id: 'policy-1' }],
        true
      );
      expect(hasFs).toBe(true);
    });

    it('returns true when at least one agent is updating', async () => {
      (getAgentStatusForAgentPolicy as jest.Mock).mockResolvedValueOnce({
        other: 0,
        events: 0,
        total: 1,
        all: 1,
        active: 0,
        updating: 1,
        offline: 0,
        inactive: 0,
        unenrolled: 0,
        online: 0,
        error: 0,
      });
      const hasFs = await hasFleetServersForPolicies(
        mockEsClient,
        mockSoClient,
        [{ id: 'policy-1' }],
        true
      );
      expect(hasFs).toBe(true);
    });

    it('returns false when no agents are updating or online', async () => {
      (getAgentStatusForAgentPolicy as jest.Mock).mockResolvedValueOnce({
        other: 0,
        events: 0,
        total: 3,
        all: 3,
        active: 1,
        updating: 0,
        offline: 1,
        inactive: 1,
        unenrolled: 1,
        online: 0,
        error: 1,
      });
      const hasFs = await hasFleetServersForPolicies(
        mockEsClient,
        mockSoClient,
        [{ id: 'policy-1' }],
        true
      );
      expect(hasFs).toBe(false);
    });
  });

  describe('activeOnly is false', () => {
    it('returns true when at least one agent is found regardless of its status', async () => {
      (getAgentStatusForAgentPolicy as jest.Mock).mockResolvedValueOnce({
        other: 0,
        events: 0,
        total: 0,
        all: 1,
        active: 0,
        updating: 0,
        offline: 1,
        inactive: 0,
        unenrolled: 0,
        online: 0,
        error: 0,
      });
      const hasFs = await hasFleetServersForPolicies(mockEsClient, mockSoClient, [
        { id: 'policy-1' },
      ]);
      expect(hasFs).toBe(true);
    });
  });

  describe('kuery includes versioned policy_id variants', () => {
    it('passes a kuery matching both the base policy_id and versioned variants', async () => {
      (getAgentStatusForAgentPolicy as jest.Mock).mockResolvedValueOnce({
        other: 0,
        events: 0,
        total: 1,
        all: 1,
        active: 0,
        updating: 0,
        offline: 0,
        inactive: 0,
        unenrolled: 0,
        online: 1,
        error: 0,
      });

      await hasFleetServersForPolicies(mockEsClient, mockSoClient, [{ id: 'fleet-server-policy' }]);

      const kuery = (getAgentStatusForAgentPolicy as jest.Mock).mock.calls.at(-1)![3] as string;
      // Must match the base policy_id exactly
      expect(kuery).toContain('policy_id:"fleet-server-policy"');
      // Must also match versioned variants like fleet-server-policy#9.4
      expect(kuery).toContain('policy_id:fleet-server-policy#*');
    });

    it('returns true when the Fleet Server agent is on a versioned policy_id', async () => {
      // Simulate: agent has policy_id "fleet-server-policy#9.4" (no exact-match on base id).
      // The old exact-match query returned all:0; the new kuery must return all:1.
      (getAgentStatusForAgentPolicy as jest.Mock).mockImplementationOnce(
        (_es, _so, _id, kuery: string) => {
          // Simulate ES matching an agent whose policy_id is "fleet-server-policy#9.4"
          const agentMatchesVersionedVariant = kuery.includes('fleet-server-policy#*');
          return Promise.resolve({
            other: 0,
            events: 0,
            total: agentMatchesVersionedVariant ? 1 : 0,
            all: agentMatchesVersionedVariant ? 1 : 0,
            active: 0,
            updating: 0,
            offline: 0,
            inactive: 0,
            unenrolled: 0,
            online: agentMatchesVersionedVariant ? 1 : 0,
            error: 0,
          });
        }
      );

      const hasFs = await hasFleetServersForPolicies(mockEsClient, mockSoClient, [
        { id: 'fleet-server-policy' },
      ]);
      expect(hasFs).toBe(true);
    });
  });
});

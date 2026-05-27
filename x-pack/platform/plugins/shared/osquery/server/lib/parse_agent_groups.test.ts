/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { aggregateResults, parseAgentSelection } from './parse_agent_groups';
import type { ElasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { SortResults } from '@elastic/elasticsearch/lib/api/types';
import type { Agent } from '@kbn/fleet-plugin/common/types/models/agent';
import type { PackagePolicy } from '@kbn/fleet-plugin/common/types/models/package_policy';
import type { OsqueryAppContext } from './osquery_app_context_services';

function createPaginatedMockResponse(totalAgents: number, chunkSize = 9000) {
  const agentIds = Array.from({ length: totalAgents }, (_, i) => `agent-${i + 1}`);

  return jest.fn(
    ({
      searchAfter,
      pitId,
    }: {
      searchAfter?: SortResults;
      kuery?: string;
      showInactive?: boolean;
      pitId?: string;
      perPage?: number;
      page?: number;
    }): Promise<{ agents: Agent[]; total: number; pit?: string }> => {
      const start = searchAfter ? (searchAfter[0] as number) + 1 : 0;
      const end = Math.min(start + chunkSize, agentIds.length);
      const chunk = agentIds.slice(start, end);

      return Promise.resolve({
        agents: chunk.map((id, index) => ({
          id,
          sort: [start + index],
        })) as Agent[],
        total: agentIds.length,
        ...(pitId ? { pit: `${pitId}-next` } : {}),
      });
    }
  );
}

function createSimpleMockResponse(agentIds: string[]) {
  return jest.fn().mockResolvedValue({
    agents: agentIds.map((id, index) => ({
      id,
      sort: [index],
    })) as Agent[],
    total: agentIds.length,
  });
}

function createMockContext(
  mockAgentService: {
    listAgents: jest.MockedFunction<
      (params: {
        searchAfter?: SortResults;
        kuery?: string;
        showInactive?: boolean;
        pitId?: string;
        perPage?: number;
        page?: number;
      }) => Promise<{ agents: Agent[]; total: number }>
    >;
  },
  mockPackagePolicyService: {
    list: jest.MockedFunction<
      (
        soClient: SavedObjectsClientContract,
        options: { kuery?: string; perPage?: number; page?: number }
      ) => Promise<{ items: PackagePolicy[]; total: number }>
    >;
  },
  serviceOverrides: Partial<OsqueryAppContext['service']> = {}
) {
  return {
    logFactory: mockLogFactory,
    service: {
      getAgentService: jest.fn().mockReturnValue({
        asInternalScopedUser: jest.fn().mockReturnValue(mockAgentService),
      }),
      getPackagePolicyService: jest.fn().mockReturnValue(mockPackagePolicyService),
      ...serviceOverrides,
    },
  } as unknown as OsqueryAppContext;
}

const mockOpenPointInTime = jest.fn().mockResolvedValue({ id: 'mockedPitId' });
const mockClosePointInTime = jest.fn();

const mockElasticsearchClient = {
  openPointInTime: mockOpenPointInTime,
  closePointInTime: mockClosePointInTime,
} as unknown as ElasticsearchClientMock;

const mockLogFactory = {
  get: jest.fn().mockReturnValue({
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  }),
};

const mockContext = {
  logFactory: mockLogFactory,
} as unknown as OsqueryAppContext;

describe('aggregateResults', () => {
  it('should handle one page of results', async () => {
    const generatorMock = jest.fn().mockResolvedValue({
      results: ['result1', 'result2'],
      total: 2,
    });

    const result = await aggregateResults(generatorMock, mockElasticsearchClient, mockContext);

    expect(generatorMock).toHaveBeenCalledWith(1, expect.any(Number));
    expect(mockOpenPointInTime).not.toHaveBeenCalled();
    expect(mockClosePointInTime).not.toHaveBeenCalled();

    expect(result).toEqual(['result1', 'result2']);
  });

  it('should handle multiple pages of results', async () => {
    const generateResults = (run = 1, length = 9000) =>
      Array.from({ length }, (_, index) => `result_${index + 1 + (run - 1) * length}`);

    const generatorMock = jest
      .fn()
      .mockResolvedValueOnce({
        results: generateResults(),
        total: 18001,
      })
      .mockResolvedValueOnce({
        results: generateResults(),
        total: 18001,
        searchAfter: ['firstSort'],
        pitId: 'refreshedPit-1',
      })
      .mockResolvedValueOnce({
        results: generateResults(2),
        total: 18001,
        searchAfter: ['secondSort'],
        pitId: 'refreshedPit-2',
      })
      .mockResolvedValueOnce({
        results: ['result_18001'],
        total: 18001,
        searchAfter: ['thirdSort'],
        pitId: 'refreshedPit-3',
      });

    const result = await aggregateResults(generatorMock, mockElasticsearchClient, mockContext);
    expect(generatorMock).toHaveBeenCalledWith(1, expect.any(Number));
    expect(generatorMock).toHaveBeenCalledWith(1, expect.any(Number), undefined, 'mockedPitId');
    expect(generatorMock).toHaveBeenCalledWith(
      2,
      expect.any(Number),
      ['firstSort'],
      'refreshedPit-1'
    );
    expect(generatorMock).toHaveBeenCalledWith(
      3,
      expect.any(Number),
      ['secondSort'],
      'refreshedPit-2'
    );
    expect(mockOpenPointInTime).toHaveBeenCalledTimes(1);
    expect(mockClosePointInTime).toHaveBeenCalledTimes(1);
    expect(mockClosePointInTime).toHaveBeenCalledWith({ id: 'refreshedPit-3' });
    expect(result.length).toEqual(18001);
  });
});

describe('parseAgentSelection', () => {
  let mockSoClient: jest.Mocked<SavedObjectsClientContract>;
  let mockAgentService: {
    listAgents: jest.MockedFunction<
      (params: {
        searchAfter?: SortResults;
        kuery?: string;
        showInactive?: boolean;
        pitId?: string;
        perPage?: number;
        page?: number;
      }) => Promise<{ agents: Agent[]; total: number }>
    >;
  };
  let mockPackagePolicyService: {
    list: jest.MockedFunction<
      (
        soClient: SavedObjectsClientContract,
        options: { kuery?: string; perPage?: number; page?: number }
      ) => Promise<{ items: PackagePolicy[]; total: number }>
    >;
  };
  let mockContextWithServices: OsqueryAppContext;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSoClient = {
      find: jest.fn(),
    } as unknown as jest.Mocked<SavedObjectsClientContract>;

    mockAgentService = {
      listAgents: jest.fn(),
    };

    mockPackagePolicyService = {
      list: jest.fn().mockResolvedValue({
        items: [
          { policy_ids: ['policy-1', 'policy-2'] } as PackagePolicy,
          { policy_ids: ['policy-3'] } as PackagePolicy,
        ],
        total: 2,
      }),
    };

    mockContextWithServices = createMockContext(mockAgentService, mockPackagePolicyService);
  });

  describe('with 10k+ agents (scalability tests)', () => {
    it('should handle multi-page results with 10k+ agents', async () => {
      const agentCount = 15000;
      mockAgentService.listAgents = createPaginatedMockResponse(agentCount);

      const result = await parseAgentSelection(
        mockSoClient,
        mockElasticsearchClient,
        mockContextWithServices,
        { allAgentsSelected: true, spaceId: 'default' }
      );

      expect(result).toHaveLength(agentCount);
      expect(mockAgentService.listAgents).toHaveBeenCalled();
      expect(mockAgentService.listAgents.mock.calls.length).toBeGreaterThan(1);
    });
  });

  describe('PIT-based pagination verification', () => {
    it('should use PIT with searchAfter for multi-page results', async () => {
      mockAgentService.listAgents = createPaginatedMockResponse(18000);

      const result = await parseAgentSelection(
        mockSoClient,
        mockElasticsearchClient,
        mockContextWithServices,
        { allAgentsSelected: true, spaceId: 'default' }
      );

      expect(result).toHaveLength(18000);

      expect(mockOpenPointInTime).toHaveBeenCalledWith({
        index: '.fleet-agents',
        keep_alive: '10m',
      });
      expect(mockClosePointInTime).toHaveBeenCalledWith({ id: 'mockedPitId-next-next' });

      const thirdCall = mockAgentService.listAgents.mock.calls[2][0];
      expect(thirdCall.searchAfter).toBeDefined();
      expect(thirdCall.pitId).toBe('mockedPitId-next');
    });

    it('should continue even if PIT close fails', async () => {
      mockAgentService.listAgents = createPaginatedMockResponse(18000);
      mockClosePointInTime.mockRejectedValueOnce(new Error('PIT close failed'));

      const result = await parseAgentSelection(
        mockSoClient,
        mockElasticsearchClient,
        mockContextWithServices,
        { allAgentsSelected: true, spaceId: 'default' }
      );

      expect(result).toHaveLength(18000);
      expect(mockLogFactory.get().warn).toHaveBeenCalledWith(
        expect.stringContaining('Error closing point in time')
      );
    });
  });

  describe('empty result and error handling', () => {
    it('should handle empty result set gracefully', async () => {
      mockAgentService.listAgents.mockResolvedValue({
        agents: [],
        total: 0,
      });

      const result = await parseAgentSelection(
        mockSoClient,
        mockElasticsearchClient,
        mockContextWithServices,
        { allAgentsSelected: true, spaceId: 'default' }
      );

      expect(result).toEqual([]);
    });

    it('should handle empty agents array', async () => {
      const result = await parseAgentSelection(
        mockSoClient,
        mockElasticsearchClient,
        mockContextWithServices,
        { agents: [], spaceId: 'default' }
      );

      expect(result).toEqual([]);
    });

    it.each([
      {
        name: 'agent service unavailable',
        serviceOverrides: {
          getAgentService: jest.fn().mockReturnValue(undefined),
          getPackagePolicyService: jest.fn().mockReturnValue(undefined),
        },
      },
      {
        name: 'package policy service unavailable',
        serviceOverrides: {
          getAgentService: jest.fn().mockReturnValue({
            asInternalScopedUser: jest.fn().mockReturnValue(mockAgentService),
          }),
          getPackagePolicyService: jest.fn().mockReturnValue(undefined),
        },
      },
    ])('should return empty array when $name', async ({ serviceOverrides }) => {
      const contextWithoutService = createMockContext(
        mockAgentService,
        mockPackagePolicyService,
        serviceOverrides
      );

      const result = await parseAgentSelection(
        mockSoClient,
        mockElasticsearchClient,
        contextWithoutService,
        { allAgentsSelected: true, spaceId: 'default' }
      );

      expect(result).toEqual([]);
    });
  });

  describe('agent ID deduplication', () => {
    it('should deduplicate agent IDs from multiple sources', async () => {
      mockAgentService.listAgents = createSimpleMockResponse(['agent-1', 'agent-2', 'agent-3']);

      const result = await parseAgentSelection(
        mockSoClient,
        mockElasticsearchClient,
        mockContextWithServices,
        {
          agents: ['agent-1', 'agent-4', 'agent-1'],
          platformsSelected: ['linux'],
          spaceId: 'default',
        }
      );

      expect(result).toHaveLength(4);
      expect(result).toEqual(expect.arrayContaining(['agent-1', 'agent-2', 'agent-3', 'agent-4']));
      expect(new Set(result).size).toBe(result.length);
    });

    it('should deduplicate when same agents appear in different filter results', async () => {
      mockAgentService.listAgents = createSimpleMockResponse(['agent-1', 'agent-2']);

      const result = await parseAgentSelection(
        mockSoClient,
        mockElasticsearchClient,
        mockContextWithServices,
        {
          agents: ['agent-1', 'agent-2'],
          platformsSelected: ['linux'],
          policiesSelected: ['policy-1'],
          spaceId: 'default',
        }
      );

      expect(result).toHaveLength(2);
      expect(new Set(result).size).toBe(2);
    });
  });

  describe('space isolation verification', () => {
    it('should use space-scoped agent service', async () => {
      const spaceId = 'custom-space';
      const mockAsInternalScopedUser = jest.fn().mockReturnValue(mockAgentService);

      const contextWithSpaceService = {
        ...mockContext,
        service: {
          getAgentService: jest.fn().mockReturnValue({
            asInternalScopedUser: mockAsInternalScopedUser,
          }),
          getPackagePolicyService: jest.fn().mockReturnValue(mockPackagePolicyService),
        },
      } as unknown as OsqueryAppContext;

      mockAgentService.listAgents = createSimpleMockResponse(['agent-1']);

      await parseAgentSelection(mockSoClient, mockElasticsearchClient, contextWithSpaceService, {
        allAgentsSelected: true,
        spaceId,
      });

      expect(mockAsInternalScopedUser).toHaveBeenCalledWith(spaceId);
    });

    it('should enforce space isolation for explicitly provided agent IDs', async () => {
      const spaceId = 'space-A';
      const mockAsInternalScopedUser = jest.fn().mockReturnValue(mockAgentService);

      const contextWithSpaceService = {
        ...mockContext,
        service: {
          getAgentService: jest.fn().mockReturnValue({
            asInternalScopedUser: mockAsInternalScopedUser,
          }),
          getPackagePolicyService: jest.fn().mockReturnValue(mockPackagePolicyService),
        },
      } as unknown as OsqueryAppContext;

      mockAgentService.listAgents.mockResolvedValue({
        agents: [],
        total: 0,
      });

      const result = await parseAgentSelection(
        mockSoClient,
        mockElasticsearchClient,
        contextWithSpaceService,
        { agents: ['agent-from-space-B'], spaceId }
      );

      expect(result).toContain('agent-from-space-B');
      expect(mockAsInternalScopedUser).toHaveBeenCalledWith(spaceId);
    });
  });

  describe('filters and kuery construction', () => {
    it.each([
      {
        name: 'always includes base filters',
        selection: { allAgentsSelected: true },
        expectedFragments: ['status:online', 'policy_id:(policy-1 or policy-2 or policy-3)'],
      },
      {
        name: 'combines platform and policy filters',
        selection: { platformsSelected: ['linux', 'darwin'], policiesSelected: ['policy-1'] },
        expectedFragments: [
          'status:online',
          'local_metadata.os.platform:(linux or darwin)',
          'policy_id:(policy-1)',
        ],
      },
    ])('$name', async ({ selection, expectedFragments }) => {
      mockAgentService.listAgents = createSimpleMockResponse(['agent-1']);

      await parseAgentSelection(mockSoClient, mockElasticsearchClient, mockContextWithServices, {
        ...selection,
        spaceId: 'default',
      });

      const kueryCall = mockAgentService.listAgents.mock.calls[0][0].kuery;
      expectedFragments.forEach((fragment) => {
        expect(kueryCall).toContain(fragment);
      });
    });

    it('should set showInactive to false', async () => {
      mockAgentService.listAgents = createSimpleMockResponse(['agent-1']);

      await parseAgentSelection(mockSoClient, mockElasticsearchClient, mockContextWithServices, {
        allAgentsSelected: true,
        spaceId: 'default',
      });

      const callArgs = mockAgentService.listAgents.mock.calls[0][0];
      expect(callArgs.showInactive).toBe(false);
    });
  });

  describe('explicitly provided agent IDs', () => {
    it('should include explicitly provided agent IDs even without filters', async () => {
      const result = await parseAgentSelection(
        mockSoClient,
        mockElasticsearchClient,
        mockContextWithServices,
        { agents: ['agent-explicit-1', 'agent-explicit-2'], spaceId: 'default' }
      );

      expect(result).toHaveLength(2);
      expect(result).toContain('agent-explicit-1');
      expect(result).toContain('agent-explicit-2');
    });

    it('should merge explicitly provided agent IDs with filtered results', async () => {
      mockAgentService.listAgents = createSimpleMockResponse([
        'agent-filtered-1',
        'agent-filtered-2',
      ]);

      const result = await parseAgentSelection(
        mockSoClient,
        mockElasticsearchClient,
        mockContextWithServices,
        {
          agents: ['agent-explicit-1'],
          platformsSelected: ['linux'],
          spaceId: 'default',
        }
      );

      expect(result).toHaveLength(3);
      expect(result).toContain('agent-explicit-1');
      expect(result).toContain('agent-filtered-1');
      expect(result).toContain('agent-filtered-2');
    });
  });
});

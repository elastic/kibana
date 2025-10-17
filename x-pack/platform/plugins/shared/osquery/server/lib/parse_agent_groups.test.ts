/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { aggregateResults, parseAgentSelection } from './parse_agent_groups';
import type { ElasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { OsqueryAppContext } from './osquery_app_context_services';
import type { AgentSelection } from './parse_agent_groups';

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

    expect(generatorMock).toHaveBeenCalledWith(1, expect.any(Number)); // 1st page, PER_PAGE
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
      })
      .mockResolvedValueOnce({
        results: generateResults(2),
        total: 18001,
        searchAfter: ['secondSort'],
      })
      .mockResolvedValueOnce({
        results: ['result_18001'],
        total: 18001,
        searchAfter: ['thirdSort'],
      });

    const result = await aggregateResults(generatorMock, mockElasticsearchClient, mockContext);
    expect(generatorMock).toHaveBeenCalledWith(1, expect.any(Number));
    expect(generatorMock).toHaveBeenCalledWith(1, expect.any(Number), undefined, 'mockedPitId');
    expect(generatorMock).toHaveBeenCalledWith(2, expect.any(Number), ['firstSort'], 'mockedPitId');
    expect(generatorMock).toHaveBeenCalledWith(
      3,
      expect.any(Number),
      ['secondSort'],
      'mockedPitId'
    );
    expect(mockOpenPointInTime).toHaveBeenCalledTimes(1);
    expect(mockClosePointInTime).toHaveBeenCalledTimes(1);
    expect(mockClosePointInTime).toHaveBeenCalledWith({ id: 'mockedPitId' });
    expect(result.length).toEqual(18001);
  });
});

describe('parseAgentSelection', () => {
  let mockSoClient: jest.Mocked<SavedObjectsClientContract>;
  let mockAgentService: any;
  let mockPackagePolicyService: any;
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
          { policy_ids: ['policy-1', 'policy-2'] },
          { policy_ids: ['policy-3'] },
        ],
        total: 2,
      }),
    };

    mockContextWithServices = {
      ...mockContext,
      service: {
        getAgentService: jest.fn().mockReturnValue({
          asInternalScopedUser: jest.fn().mockReturnValue(mockAgentService),
        }),
        getPackagePolicyService: jest.fn().mockReturnValue(mockPackagePolicyService),
      },
    } as unknown as OsqueryAppContext;
  });

  describe('with 10k+ agents (scalability tests)', () => {
    it('should successfully handle 15,000 agents without validation errors', async () => {
      // Generate 15,000 agent IDs
      const agentIds = Array.from({ length: 15000 }, (_, i) => `agent-${i + 1}`);

      // Mock listAgents to return results in chunks (simulating PIT pagination)
      const chunkSize = 9000;
      let callCount = 0;
      mockAgentService.listAgents.mockImplementation(() => {
        const start = callCount * chunkSize;
        const end = Math.min(start + chunkSize, agentIds.length);
        const chunk = agentIds.slice(start, end);
        callCount++;

        return Promise.resolve({
          agents: chunk.map((id, index) => ({
            id,
            sort: [start + index],
          })),
          total: agentIds.length,
        });
      });

      const agentSelection: AgentSelection = {
        allAgentsSelected: true,
        spaceId: 'default',
      };

      const result = await parseAgentSelection(
        mockSoClient,
        mockElasticsearchClient,
        mockContextWithServices,
        agentSelection
      );

      // Should return all 15,000 agents without hitting max_result_window limit
      expect(result).toHaveLength(15000);
      expect(result).toEqual(agentIds);
      // Should have used PIT pagination (multiple calls)
      expect(mockAgentService.listAgents).toHaveBeenCalledTimes(2);
    });

    it('should handle 20,000 agents with platform filtering', async () => {
      const agentIds = Array.from({ length: 20000 }, (_, i) => `agent-${i + 1}`);

      const chunkSize = 9000;
      let callCount = 0;
      mockAgentService.listAgents.mockImplementation(() => {
        const start = callCount * chunkSize;
        const end = Math.min(start + chunkSize, agentIds.length);
        const chunk = agentIds.slice(start, end);
        callCount++;

        return Promise.resolve({
          agents: chunk.map((id, index) => ({
            id,
            sort: [start + index],
          })),
          total: agentIds.length,
        });
      });

      const agentSelection: AgentSelection = {
        platformsSelected: ['linux', 'darwin'],
        spaceId: 'default',
      };

      const result = await parseAgentSelection(
        mockSoClient,
        mockElasticsearchClient,
        mockContextWithServices,
        agentSelection
      );

      expect(result).toHaveLength(20000);
      // Verify that the kuery includes platform filtering
      const firstCall = mockAgentService.listAgents.mock.calls[0][0];
      expect(firstCall.kuery).toContain('local_metadata.os.platform:(linux or darwin)');
    });

    it('should handle 12,000 agents with policy filtering', async () => {
      const agentIds = Array.from({ length: 12000 }, (_, i) => `agent-${i + 1}`);

      const chunkSize = 9000;
      let callCount = 0;
      mockAgentService.listAgents.mockImplementation(() => {
        const start = callCount * chunkSize;
        const end = Math.min(start + chunkSize, agentIds.length);
        const chunk = agentIds.slice(start, end);
        callCount++;

        return Promise.resolve({
          agents: chunk.map((id, index) => ({
            id,
            sort: [start + index],
          })),
          total: agentIds.length,
        });
      });

      const agentSelection: AgentSelection = {
        policiesSelected: ['policy-1', 'policy-2'],
        spaceId: 'default',
      };

      const result = await parseAgentSelection(
        mockSoClient,
        mockElasticsearchClient,
        mockContextWithServices,
        agentSelection
      );

      expect(result).toHaveLength(12000);
      const firstCall = mockAgentService.listAgents.mock.calls[0][0];
      expect(firstCall.kuery).toContain('policy_id:(policy-1 or policy-2)');
    });
  });

  describe('PIT-based pagination verification', () => {
    it('should use PIT when results exceed one page', async () => {
      const agentIds = Array.from({ length: 18000 }, (_, i) => `agent-${i + 1}`);

      let callCount = 0;
      mockAgentService.listAgents.mockImplementation(() => {
        const start = callCount * 9000;
        const end = Math.min(start + 9000, agentIds.length);
        const chunk = agentIds.slice(start, end);
        callCount++;

        return Promise.resolve({
          agents: chunk.map((id, index) => ({
            id,
            sort: [start + index],
          })),
          total: agentIds.length,
        });
      });

      const agentSelection: AgentSelection = {
        allAgentsSelected: true,
        spaceId: 'default',
      };

      await parseAgentSelection(
        mockSoClient,
        mockElasticsearchClient,
        mockContextWithServices,
        agentSelection
      );

      // Verify PIT was opened and closed
      expect(mockOpenPointInTime).toHaveBeenCalledWith({
        index: '.fleet-agents',
        keep_alive: '10m',
      });
      expect(mockClosePointInTime).toHaveBeenCalledWith({ id: 'mockedPitId' });
    });

    it('should use searchAfter for subsequent pages', async () => {
      const agentIds = Array.from({ length: 18000 }, (_, i) => `agent-${i + 1}`);

      let callCount = 0;
      mockAgentService.listAgents.mockImplementation(({ searchAfter }: any) => {
        const start = callCount * 9000;
        const end = Math.min(start + 9000, agentIds.length);
        const chunk = agentIds.slice(start, end);
        callCount++;

        return Promise.resolve({
          agents: chunk.map((id, index) => ({
            id,
            sort: [start + index],
          })),
          total: agentIds.length,
        });
      });

      const agentSelection: AgentSelection = {
        allAgentsSelected: true,
        spaceId: 'default',
      };

      await parseAgentSelection(
        mockSoClient,
        mockElasticsearchClient,
        mockContextWithServices,
        agentSelection
      );

      // Verify searchAfter was used for second page
      const secondCall = mockAgentService.listAgents.mock.calls[1][0];
      expect(secondCall.searchAfter).toBeDefined();
      expect(secondCall.pitId).toBe('mockedPitId');
    });
  });

  describe('empty result and error handling', () => {
    it('should handle empty result set gracefully', async () => {
      mockAgentService.listAgents.mockResolvedValue({
        agents: [],
        total: 0,
      });

      const agentSelection: AgentSelection = {
        allAgentsSelected: true,
        spaceId: 'default',
      };

      const result = await parseAgentSelection(
        mockSoClient,
        mockElasticsearchClient,
        mockContextWithServices,
        agentSelection
      );

      expect(result).toEqual([]);
    });

    it('should handle service unavailability (no agent service)', async () => {
      const contextWithoutService = {
        ...mockContext,
        service: {
          getAgentService: jest.fn().mockReturnValue(undefined),
          getPackagePolicyService: jest.fn().mockReturnValue(undefined),
        },
      } as unknown as OsqueryAppContext;

      const agentSelection: AgentSelection = {
        allAgentsSelected: true,
        spaceId: 'default',
      };

      const result = await parseAgentSelection(
        mockSoClient,
        mockElasticsearchClient,
        contextWithoutService,
        agentSelection
      );

      // Should return empty array when services unavailable
      expect(result).toEqual([]);
    });

    it('should handle package policy service unavailability', async () => {
      const contextWithoutPackageService = {
        ...mockContext,
        service: {
          getAgentService: jest.fn().mockReturnValue({
            asInternalScopedUser: jest.fn().mockReturnValue(mockAgentService),
          }),
          getPackagePolicyService: jest.fn().mockReturnValue(undefined),
        },
      } as unknown as OsqueryAppContext;

      const agentSelection: AgentSelection = {
        allAgentsSelected: true,
        spaceId: 'default',
      };

      const result = await parseAgentSelection(
        mockSoClient,
        mockElasticsearchClient,
        contextWithoutPackageService,
        agentSelection
      );

      expect(result).toEqual([]);
    });
  });

  describe('agent ID deduplication', () => {
    it('should deduplicate agent IDs from multiple sources', async () => {
      mockAgentService.listAgents.mockResolvedValue({
        agents: [
          { id: 'agent-1', sort: [1] },
          { id: 'agent-2', sort: [2] },
          { id: 'agent-3', sort: [3] },
        ],
        total: 3,
      });

      const agentSelection: AgentSelection = {
        agents: ['agent-1', 'agent-4', 'agent-1'], // Duplicates
        platformsSelected: ['linux'],
        spaceId: 'default',
      };

      const result = await parseAgentSelection(
        mockSoClient,
        mockElasticsearchClient,
        mockContextWithServices,
        agentSelection
      );

      // Should contain unique agents: agent-1, agent-2, agent-3, agent-4
      expect(result).toHaveLength(4);
      expect(result).toContain('agent-1');
      expect(result).toContain('agent-2');
      expect(result).toContain('agent-3');
      expect(result).toContain('agent-4');
      // Verify no duplicates
      expect(new Set(result).size).toBe(result.length);
    });

    it('should deduplicate when same agents appear in different filter results', async () => {
      // Simulate overlapping results from platform and policy filters
      mockAgentService.listAgents.mockResolvedValue({
        agents: [
          { id: 'agent-1', sort: [1] },
          { id: 'agent-2', sort: [2] },
        ],
        total: 2,
      });

      const agentSelection: AgentSelection = {
        agents: ['agent-1', 'agent-2'], // Same as filter results
        platformsSelected: ['linux'],
        policiesSelected: ['policy-1'],
        spaceId: 'default',
      };

      const result = await parseAgentSelection(
        mockSoClient,
        mockElasticsearchClient,
        mockContextWithServices,
        agentSelection
      );

      // Should deduplicate to 2 unique agents
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

      mockAgentService.listAgents.mockResolvedValue({
        agents: [{ id: 'agent-1', sort: [1] }],
        total: 1,
      });

      const agentSelection: AgentSelection = {
        allAgentsSelected: true,
        spaceId,
      };

      await parseAgentSelection(
        mockSoClient,
        mockElasticsearchClient,
        contextWithSpaceService,
        agentSelection
      );

      // Verify space-scoped service was requested
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

      const agentSelection: AgentSelection = {
        agents: ['agent-from-space-B'], // Potentially from different space
        spaceId,
      };

      const result = await parseAgentSelection(
        mockSoClient,
        mockElasticsearchClient,
        contextWithSpaceService,
        agentSelection
      );

      // Agent IDs are accepted, but space service ensures they can only be queried
      // if they belong to the correct space (enforced at query execution time)
      expect(result).toContain('agent-from-space-B');
      expect(mockAsInternalScopedUser).toHaveBeenCalledWith(spaceId);
    });
  });

  describe('filters and kuery construction', () => {
    it('should always include online status and Osquery policy filters', async () => {
      mockAgentService.listAgents.mockResolvedValue({
        agents: [{ id: 'agent-1', sort: [1] }],
        total: 1,
      });

      const agentSelection: AgentSelection = {
        allAgentsSelected: true,
        spaceId: 'default',
      };

      await parseAgentSelection(
        mockSoClient,
        mockElasticsearchClient,
        mockContextWithServices,
        agentSelection
      );

      const kueryCall = mockAgentService.listAgents.mock.calls[0][0].kuery;
      expect(kueryCall).toContain('status:online');
      expect(kueryCall).toContain('policy_id:(policy-1 or policy-2 or policy-3)');
    });

    it('should correctly combine platform and policy filters', async () => {
      mockAgentService.listAgents.mockResolvedValue({
        agents: [{ id: 'agent-1', sort: [1] }],
        total: 1,
      });

      const agentSelection: AgentSelection = {
        platformsSelected: ['linux', 'darwin'],
        policiesSelected: ['policy-1'],
        spaceId: 'default',
      };

      await parseAgentSelection(
        mockSoClient,
        mockElasticsearchClient,
        mockContextWithServices,
        agentSelection
      );

      const kueryCall = mockAgentService.listAgents.mock.calls[0][0].kuery;
      expect(kueryCall).toContain('status:online');
      expect(kueryCall).toContain('local_metadata.os.platform:(linux or darwin)');
      expect(kueryCall).toContain('policy_id:(policy-1)');
    });

    it('should set showInactive to false', async () => {
      mockAgentService.listAgents.mockResolvedValue({
        agents: [{ id: 'agent-1', sort: [1] }],
        total: 1,
      });

      const agentSelection: AgentSelection = {
        allAgentsSelected: true,
        spaceId: 'default',
      };

      await parseAgentSelection(
        mockSoClient,
        mockElasticsearchClient,
        mockContextWithServices,
        agentSelection
      );

      const callArgs = mockAgentService.listAgents.mock.calls[0][0];
      expect(callArgs.showInactive).toBe(false);
    });
  });

  describe('explicitly provided agent IDs', () => {
    it('should include explicitly provided agent IDs even without filters', async () => {
      const agentSelection: AgentSelection = {
        agents: ['agent-explicit-1', 'agent-explicit-2'],
        spaceId: 'default',
      };

      const result = await parseAgentSelection(
        mockSoClient,
        mockElasticsearchClient,
        mockContextWithServices,
        agentSelection
      );

      expect(result).toHaveLength(2);
      expect(result).toContain('agent-explicit-1');
      expect(result).toContain('agent-explicit-2');
    });

    it('should merge explicitly provided agent IDs with filtered results', async () => {
      mockAgentService.listAgents.mockResolvedValue({
        agents: [
          { id: 'agent-filtered-1', sort: [1] },
          { id: 'agent-filtered-2', sort: [2] },
        ],
        total: 2,
      });

      const agentSelection: AgentSelection = {
        agents: ['agent-explicit-1'],
        platformsSelected: ['linux'],
        spaceId: 'default',
      };

      const result = await parseAgentSelection(
        mockSoClient,
        mockElasticsearchClient,
        mockContextWithServices,
        agentSelection
      );

      expect(result).toHaveLength(3);
      expect(result).toContain('agent-explicit-1');
      expect(result).toContain('agent-filtered-1');
      expect(result).toContain('agent-filtered-2');
    });
  });
});

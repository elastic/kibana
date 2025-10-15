/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { aggregateResults, parseAgentSelection } from './parse_agent_groups';
import type { ElasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import type { OsqueryAppContext } from './osquery_app_context_services';

const mockOpenPointInTime = jest.fn().mockResolvedValue({ id: 'mockedPitId' });
const mockClosePointInTime = jest.fn();

const mockElasticsearchClient = {
  openPointInTime: mockOpenPointInTime,
  closePointInTime: mockClosePointInTime,
} as unknown as ElasticsearchClientMock;

const mockContext = {} as unknown as OsqueryAppContext;

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
  let mockSoClient: ReturnType<typeof savedObjectsClientMock.create>;
  let mockEsClient: ElasticsearchClientMock;
  let mockAgentService: any;
  let mockPackagePolicyService: any;
  let mockContext: OsqueryAppContext;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSoClient = savedObjectsClientMock.create();

    mockEsClient = {
      openPointInTime: jest.fn().mockResolvedValue({ id: 'test-pit-id' }),
      closePointInTime: jest.fn().mockResolvedValue({}),
    } as unknown as ElasticsearchClientMock;

    mockAgentService = {
      listAgents: jest.fn(),
      // NOTE: getByIds is intentionally NOT mocked - tests verify it's not called
    };

    mockPackagePolicyService = {
      list: jest.fn(),
    };

    mockContext = {
      service: {
        getAgentService: jest.fn(() => ({
          asInternalScopedUser: jest.fn(() => mockAgentService),
        })),
        getPackagePolicyService: jest.fn(() => mockPackagePolicyService),
      },
      logFactory: {
        get: jest.fn(() => ({
          warn: jest.fn(),
          error: jest.fn(),
        })),
      },
    } as unknown as OsqueryAppContext;
  });

  describe('10k+ agents scenarios', () => {
    it('should successfully return 15k+ agents without validation errors', async () => {
      // Generate 15,000 mock agent IDs across multiple pages
      const totalAgents = 15000;
      const perPage = 9000;
      const page1Agents = Array.from({ length: perPage }, (_, i) => ({
        id: `agent-${i}`,
        sort: [`sort-${i}`],
      }));
      const page2Agents = Array.from({ length: totalAgents - perPage }, (_, i) => ({
        id: `agent-${perPage + i}`,
        sort: [`sort-${perPage + i}`],
      }));

      // Mock package policy service to return osquery policies
      mockPackagePolicyService.list.mockResolvedValue({
        items: [{ policy_ids: ['policy-1', 'policy-2'] }],
        total: 1,
      });

      // Mock agent service to return paginated results
      mockAgentService.listAgents
        .mockResolvedValueOnce({
          agents: page1Agents,
          total: totalAgents,
        })
        .mockResolvedValueOnce({
          agents: page1Agents,
          total: totalAgents,
        })
        .mockResolvedValueOnce({
          agents: page2Agents,
          total: totalAgents,
        });

      const result = await parseAgentSelection(mockSoClient, mockEsClient, mockContext, {
        allAgentsSelected: true,
        spaceId: 'default',
      });

      expect(result).toHaveLength(totalAgents);
      expect(mockAgentService.listAgents).toHaveBeenCalled();
      // Verify getByIds was NOT called
      expect(mockAgentService.getByIds).toBeUndefined();
      // Verify PIT was used for pagination
      expect(mockEsClient.openPointInTime).toHaveBeenCalled();
      expect(mockEsClient.closePointInTime).toHaveBeenCalled();
    });

    it('should fetch all agents using pagination when allAgentsSelected is true', async () => {
      const totalAgents = 12000;
      const perPage = 9000;

      // Create mock agents for two pages
      const page1Agents = Array.from({ length: perPage }, (_, i) => ({
        id: `agent-${i}`,
        sort: [`sort-${i}`],
      }));
      const page2Agents = Array.from({ length: totalAgents - perPage }, (_, i) => ({
        id: `agent-${perPage + i}`,
        sort: [`sort-${perPage + i}`],
      }));

      mockPackagePolicyService.list.mockResolvedValue({
        items: [{ policy_ids: ['policy-osquery'] }],
        total: 1,
      });

      mockAgentService.listAgents
        .mockResolvedValueOnce({
          agents: page1Agents,
          total: totalAgents,
        })
        .mockResolvedValueOnce({
          agents: page1Agents,
          total: totalAgents,
        })
        .mockResolvedValueOnce({
          agents: page2Agents,
          total: totalAgents,
        });

      const result = await parseAgentSelection(mockSoClient, mockEsClient, mockContext, {
        allAgentsSelected: true,
        spaceId: 'default',
      });

      expect(result).toHaveLength(totalAgents);
      expect(mockEsClient.openPointInTime).toHaveBeenCalledWith({
        index: '.fleet-agents',
        keep_alive: '10m',
      });
      expect(mockEsClient.closePointInTime).toHaveBeenCalledWith({ id: 'test-pit-id' });
    });

    it('should apply platform and policy filters for large agent sets', async () => {
      const totalAgents = 10500;
      const perPage = 9000;

      const page1Agents = Array.from({ length: perPage }, (_, i) => ({
        id: `agent-linux-${i}`,
        sort: [`sort-${i}`],
      }));
      const page2Agents = Array.from({ length: totalAgents - perPage }, (_, i) => ({
        id: `agent-darwin-${i}`,
        sort: [`sort-${perPage + i}`],
      }));

      mockPackagePolicyService.list.mockResolvedValue({
        items: [
          { policy_ids: ['policy-1'] },
          { policy_ids: ['policy-2'] },
        ],
        total: 2,
      });

      mockAgentService.listAgents
        .mockResolvedValueOnce({
          agents: page1Agents,
          total: totalAgents,
        })
        .mockResolvedValueOnce({
          agents: page1Agents,
          total: totalAgents,
        })
        .mockResolvedValueOnce({
          agents: page2Agents,
          total: totalAgents,
        });

      const result = await parseAgentSelection(mockSoClient, mockEsClient, mockContext, {
        platformsSelected: ['linux', 'darwin'],
        policiesSelected: ['policy-1', 'policy-2'],
        spaceId: 'default',
      });

      expect(result).toHaveLength(totalAgents);
      // Verify kuery includes platform and policy filters
      expect(mockAgentService.listAgents).toHaveBeenCalledWith(
        expect.objectContaining({
          kuery: expect.stringContaining('local_metadata.os.platform:(linux or darwin)'),
        })
      );
    });
  });

  describe('edge cases', () => {
    it('should return empty array when no agents match criteria', async () => {
      mockPackagePolicyService.list.mockResolvedValue({
        items: [{ policy_ids: ['policy-1'] }],
        total: 1,
      });

      mockAgentService.listAgents.mockResolvedValue({
        agents: [],
        total: 0,
      });

      const result = await parseAgentSelection(mockSoClient, mockEsClient, mockContext, {
        allAgentsSelected: true,
        spaceId: 'default',
      });

      expect(result).toEqual([]);
      // Verify getByIds was NOT called
      expect(mockAgentService.getByIds).toBeUndefined();
    });

    it('should return only manually specified agents when agentService is unavailable', async () => {
      const contextWithoutService = {
        service: {
          getAgentService: jest.fn(() => undefined),
          getPackagePolicyService: jest.fn(() => undefined),
        },
        logFactory: {
          get: jest.fn(() => ({
            warn: jest.fn(),
            error: jest.fn(),
          })),
        },
      } as unknown as OsqueryAppContext;

      const result = await parseAgentSelection(
        mockSoClient,
        mockEsClient,
        contextWithoutService,
        {
          agents: ['agent-1', 'agent-2', 'agent-3'],
          spaceId: 'default',
        }
      );

      expect(result).toEqual(['agent-1', 'agent-2', 'agent-3']);
    });

    it('should deduplicate agent IDs', async () => {
      mockPackagePolicyService.list.mockResolvedValue({
        items: [{ policy_ids: ['policy-1'] }],
        total: 1,
      });

      // Return same agent IDs from different sources
      mockAgentService.listAgents.mockResolvedValue({
        agents: [
          { id: 'agent-1', sort: ['sort-1'] },
          { id: 'agent-2', sort: ['sort-2'] },
        ],
        total: 2,
      });

      const result = await parseAgentSelection(mockSoClient, mockEsClient, mockContext, {
        agents: ['agent-1', 'agent-3', 'agent-1'], // Duplicates and overlap with fetched agents
        allAgentsSelected: true,
        spaceId: 'default',
      });

      // Should contain unique IDs only
      expect(result).toHaveLength(3);
      expect(result).toContain('agent-1');
      expect(result).toContain('agent-2');
      expect(result).toContain('agent-3');
    });

    it('should handle empty package policy results', async () => {
      mockPackagePolicyService.list.mockResolvedValue({
        items: [],
        total: 0,
      });

      const result = await parseAgentSelection(mockSoClient, mockEsClient, mockContext, {
        allAgentsSelected: true,
        spaceId: 'default',
      });

      // Should return empty array when no osquery policies exist
      expect(result).toEqual([]);
      // listAgents should not be called if no policies
      expect(mockAgentService.listAgents).not.toHaveBeenCalled();
    });
  });

  describe('space isolation', () => {
    it('should use space-scoped agent service', async () => {
      const spaceId = 'custom-space';
      const asInternalScopedUserMock = jest.fn(() => mockAgentService);

      mockContext = {
        service: {
          getAgentService: jest.fn(() => ({
            asInternalScopedUser: asInternalScopedUserMock,
          })),
          getPackagePolicyService: jest.fn(() => mockPackagePolicyService),
        },
        logFactory: {
          get: jest.fn(() => ({
            warn: jest.fn(),
            error: jest.fn(),
          })),
        },
      } as unknown as OsqueryAppContext;

      mockPackagePolicyService.list.mockResolvedValue({
        items: [{ policy_ids: ['policy-1'] }],
        total: 1,
      });

      mockAgentService.listAgents.mockResolvedValue({
        agents: [{ id: 'agent-1', sort: ['sort-1'] }],
        total: 1,
      });

      await parseAgentSelection(mockSoClient, mockEsClient, mockContext, {
        allAgentsSelected: true,
        spaceId,
      });

      // Verify space-scoped service was requested
      expect(asInternalScopedUserMock).toHaveBeenCalledWith(spaceId);
    });
  });
});

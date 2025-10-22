/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import type { RequestHandler } from '@kbn/core/server';
import type { DataRequestHandlerContext } from '@kbn/data-plugin/server';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { getActionResultsRoute } from './get_action_results_route';
import {
  Direction,
  OsqueryQueries,
  type ActionDetailsStrategyResponse,
  type ActionResultsStrategyResponse,
} from '../../../common/search_strategy';
import { TOO_MANY_AGENT_IDS } from '../../../common/translations/errors';
import type {
  GetActionResultsRequestParamsSchema,
  GetActionResultsRequestQuerySchema,
} from '../../../common/api/action_results/get_action_results_route';
import {
  createMockOsqueryContext,
  createMockRouter,
  createMockContext,
  createMockRequest,
  createMockSearchStrategy,
  createMockActionDetailsResponse,
  createMockActionResultsResponse,
} from './mocks';

describe('getActionResultsRoute', () => {
  let mockOsqueryContext: OsqueryAppContext;
  let mockRouter: ReturnType<typeof createMockRouter>;
  let routeHandler: RequestHandler<
    GetActionResultsRequestParamsSchema,
    GetActionResultsRequestQuerySchema,
    unknown,
    DataRequestHandlerContext
  >;

  const expectedSearchOptions = {
    abortSignal: expect.any(AbortSignal),
    strategy: 'osquerySearchStrategy',
  };

  beforeEach(() => {
    mockOsqueryContext = createMockOsqueryContext();
    mockRouter = createMockRouter();

    getActionResultsRoute(mockRouter, mockOsqueryContext);

    const route = mockRouter.versioned.getRoute('get', '/api/osquery/action_results/{actionId}');
    const routeVersion = route.versions['2023-10-31'];
    if (!routeVersion) {
      throw new Error('Handler for version [2023-10-31] not found!');
    }

    routeHandler = routeVersion.handler;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Internal API - fetch agents from action document', () => {
    it('should fetch agents from action document when no agentIds parameter provided', async () => {
      const mockSearchFn = createMockSearchStrategy(
        createMockActionDetailsResponse(['agent-1', 'agent-2', 'agent-3']),
        createMockActionResultsResponse(3, {
          totalResponded: 3,
          successCount: 3,
          errorCount: 0,
        })
      );

      const mockContext = createMockContext(mockSearchFn);
      const mockRequest = createMockRequest({
        actionId: 'test-action-id',
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(mockContext, mockRequest, mockResponse);

      // Verify action details was fetched
      expect(mockSearchFn).toHaveBeenCalledWith(
        expect.objectContaining({
          actionId: 'test-action-id',
          factoryQueryType: OsqueryQueries.actionDetails,
        }),
        expectedSearchOptions
      );

      // Verify action results was called (without agentIds kuery since we use internal logic)
      expect(mockSearchFn).toHaveBeenCalledWith(
        expect.objectContaining({
          actionId: 'test-action-id',
          factoryQueryType: OsqueryQueries.actionResults,
          kuery: undefined, // No kuery when no agentIds provided
        }),
        expectedSearchOptions
      );

      // Verify response includes correct aggregations
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: expect.objectContaining({
          aggregations: {
            totalRowCount: 100,
            totalResponded: 3,
            successful: 3,
            failed: 0,
            pending: 0, // 3 agents - 3 responded = 0 pending
          },
        }),
      });
    });

    it('should calculate aggregations correctly with partial responses', async () => {
      const mockSearchFn = createMockSearchStrategy(
        createMockActionDetailsResponse(['agent-1', 'agent-2', 'agent-3', 'agent-4', 'agent-5']),
        createMockActionResultsResponse(3, {
          totalResponded: 3,
          totalRowCount: 150,
          successCount: 2,
          errorCount: 1,
        })
      );

      const mockContext = createMockContext(mockSearchFn);

      const mockRequest = createMockRequest({
        actionId: 'test-action-id',
      });

      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: expect.objectContaining({
          aggregations: {
            totalRowCount: 150,
            totalResponded: 3,
            successful: 2,
            failed: 1,
            pending: 2, // 5 agents - 3 responded = 2 pending
          },
        }),
      });
    });

    it('should return empty results when action document has no agents', async () => {
      const mockSearchFn = createMockSearchStrategy(
        createMockActionDetailsResponse([]), // No agents
        createMockActionResultsResponse(0, {
          totalResponded: 0,
          totalRowCount: 0,
          successCount: 0,
          errorCount: 0,
        })
      );

      const mockContext = createMockContext(mockSearchFn);

      const mockRequest = createMockRequest({
        actionId: 'test-action-id',
      });

      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: expect.objectContaining({
          total: 0,
          edges: [],
          aggregations: {
            totalRowCount: 0,
            totalResponded: 0,
            successful: 0,
            failed: 0,
            pending: 0,
          },
        }),
      });
    });

    it('should respect kuery filtering without agentIds', async () => {
      const userKuery = 'agent.name: "test-agent"';
      const mockSearchFn = createMockSearchStrategy(
        createMockActionDetailsResponse(['agent-1']),
        createMockActionResultsResponse(1)
      );

      const mockContext = createMockContext(mockSearchFn);

      const mockRequest = createMockRequest({
        actionId: 'test-action-id',
        query: { kuery: userKuery },
      });

      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(mockContext, mockRequest, mockResponse);

      // Verify kuery was passed to action results search
      expect(mockSearchFn).toHaveBeenCalledWith(
        expect.objectContaining({
          factoryQueryType: OsqueryQueries.actionResults,
          kuery: userKuery, // User kuery should be preserved
        }),
        expectedSearchOptions
      );
    });
  });

  describe('External API - agentIds parameter', () => {
    it('should accept agentIds parameter and skip action details fetch', async () => {
      const mockSearchFn = createMockSearchStrategy(
        undefined, // Action details should not be fetched
        createMockActionResultsResponse(2, {
          totalResponded: 2,
          successCount: 2,
          errorCount: 0,
        })
      );

      const mockContext = createMockContext(mockSearchFn);

      const mockRequest = createMockRequest({
        actionId: 'test-action-id',
        query: {
          agentIds: 'agent-1,agent-2',
        },
      });

      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(mockContext, mockRequest, mockResponse);

      // Verify action details was NOT fetched
      expect(mockSearchFn).not.toHaveBeenCalledWith(
        expect.objectContaining({
          factoryQueryType: OsqueryQueries.actionDetails,
        }),
        expectedSearchOptions
      );

      // Verify action results was called with agent.id kuery
      expect(mockSearchFn).toHaveBeenCalledWith(
        expect.objectContaining({
          factoryQueryType: OsqueryQueries.actionResults,
          kuery: 'agent.id: "agent-1" OR agent.id: "agent-2"',
        }),
        expectedSearchOptions
      );

      expect(mockResponse.ok).toHaveBeenCalled();
    });

    it('should handle single agent ID in agentIds parameter', async () => {
      const mockSearchFn = createMockSearchStrategy(undefined, createMockActionResultsResponse(1));

      const mockContext = createMockContext(mockSearchFn);

      const mockRequest = createMockRequest({
        actionId: 'test-action-id',
        query: {
          agentIds: 'agent-1',
        },
      });

      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockSearchFn).toHaveBeenCalledWith(
        expect.objectContaining({
          kuery: 'agent.id: "agent-1"',
        }),
        expectedSearchOptions
      );
    });

    it('should handle exactly 100 agent IDs (maximum allowed)', async () => {
      const agentIds = Array.from({ length: 100 }, (_, i) => `agent-${i}`).join(',');
      const mockSearchFn = createMockSearchStrategy(
        undefined,
        createMockActionResultsResponse(100)
      );

      const mockContext = createMockContext(mockSearchFn);

      const mockRequest = createMockRequest({
        actionId: 'test-action-id',
        query: {
          agentIds,
        },
      });

      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(mockContext, mockRequest, mockResponse);

      // Should succeed with 100 agents
      expect(mockResponse.ok).toHaveBeenCalled();
      expect(mockResponse.badRequest).not.toHaveBeenCalled();
    });

    it('should trim whitespace from comma-separated agent IDs', async () => {
      const mockSearchFn = createMockSearchStrategy(undefined, createMockActionResultsResponse(3));

      const mockContext = createMockContext(mockSearchFn);

      const mockRequest = createMockRequest({
        actionId: 'test-action-id',
        query: {
          agentIds: ' agent-1 , agent-2 , agent-3 ', // With whitespace
        },
      });

      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(mockContext, mockRequest, mockResponse);

      // Verify trimmed agent IDs in kuery
      expect(mockSearchFn).toHaveBeenCalledWith(
        expect.objectContaining({
          kuery: 'agent.id: "agent-1" OR agent.id: "agent-2" OR agent.id: "agent-3"',
        }),
        expectedSearchOptions
      );
    });

    it('should combine agentIds with user-provided kuery correctly', async () => {
      const userKuery = 'error.message: *timeout*';
      const mockSearchFn = createMockSearchStrategy(undefined, createMockActionResultsResponse(2));

      const mockContext = createMockContext(mockSearchFn);

      const mockRequest = createMockRequest({
        actionId: 'test-action-id',
        query: {
          agentIds: 'agent-1,agent-2',
          kuery: userKuery,
        },
      });

      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(mockContext, mockRequest, mockResponse);

      // Verify combined kuery: (agentIds kuery) AND (user kuery)
      expect(mockSearchFn).toHaveBeenCalledWith(
        expect.objectContaining({
          kuery: '(agent.id: "agent-1" OR agent.id: "agent-2") AND (error.message: *timeout*)',
        }),
        expectedSearchOptions
      );
    });

    it('should handle empty string agentIds parameter', async () => {
      const mockSearchFn = createMockSearchStrategy(
        createMockActionDetailsResponse(['agent-1']), // Should fall back to fetching from action
        createMockActionResultsResponse(1)
      );

      const mockContext = createMockContext(mockSearchFn);

      const mockRequest = createMockRequest({
        actionId: 'test-action-id',
        query: {
          agentIds: '', // Empty string
        },
      });

      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(mockContext, mockRequest, mockResponse);

      // Empty string should be treated as undefined, so action details should be fetched
      expect(mockSearchFn).toHaveBeenCalledWith(
        expect.objectContaining({
          factoryQueryType: OsqueryQueries.actionDetails,
        }),
        expectedSearchOptions
      );
    });
  });

  describe('Error Handling', () => {
    it('should return 400 error for more than 100 agent IDs', async () => {
      const agentIds = Array.from({ length: 101 }, (_, i) => `agent-${i}`).join(',');
      const mockSearchFn = jest.fn();

      const mockContext = createMockContext(mockSearchFn);

      const mockRequest = createMockRequest({
        actionId: 'test-action-id',
        query: {
          agentIds,
        },
      });

      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(mockContext, mockRequest, mockResponse);

      // Verify returns 400 with correct error message
      expect(mockResponse.badRequest).toHaveBeenCalledWith({
        body: TOO_MANY_AGENT_IDS,
      });

      // Verify search was never called
      expect(mockSearchFn).not.toHaveBeenCalled();
    });

    it('should return 500 error when search strategy throws error', async () => {
      const errorMessage = 'Elasticsearch connection failed';
      const mockSearchFn = jest.fn().mockImplementation(() => {
        throw new Error(errorMessage);
      });

      const mockContext = createMockContext(mockSearchFn);

      const mockRequest = createMockRequest({
        actionId: 'test-action-id',
        query: {
          agentIds: 'agent-1',
        },
      });

      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: { message: errorMessage },
      });
    });

    it('should handle action details returning null gracefully', async () => {
      const mockSearchFn = createMockSearchStrategy(
        {
          actionDetails: undefined,
          rawResponse: {},
        } as Partial<ActionDetailsStrategyResponse> as ActionDetailsStrategyResponse,
        createMockActionResultsResponse(0)
      );

      const mockContext = createMockContext(mockSearchFn);

      const mockRequest = createMockRequest({
        actionId: 'non-existent-action-id',
      });

      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(mockContext, mockRequest, mockResponse);

      // Should return successfully with empty results
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: expect.objectContaining({
          total: 0,
          edges: [],
          aggregations: expect.objectContaining({
            pending: 0,
          }),
        }),
      });
    });

    it('should handle action details with missing _source', async () => {
      const mockSearchFn = createMockSearchStrategy(
        {
          actionDetails: {
            _id: 'test-action-id',
            _index: '.logs-osquery_manager.actions',
            // Missing _source
          },
          rawResponse: {},
        } as Partial<ActionDetailsStrategyResponse> as ActionDetailsStrategyResponse,
        createMockActionResultsResponse(0)
      );

      const mockContext = createMockContext(mockSearchFn);

      const mockRequest = createMockRequest({
        actionId: 'test-action-id',
      });

      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(mockContext, mockRequest, mockResponse);

      // Should handle gracefully with empty agents array
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: expect.objectContaining({
          aggregations: expect.objectContaining({
            pending: 0,
          }),
        }),
      });
    });

    it('should handle missing aggregations in action results response', async () => {
      const mockSearchFn = createMockSearchStrategy(createMockActionDetailsResponse(['agent-1']), {
        edges: [],
        total: 0,
        rawResponse: {
          // Missing aggregations
        },
        inspect: { dsl: [] },
      } as unknown as ActionResultsStrategyResponse);

      const mockContext = createMockContext(mockSearchFn);

      const mockRequest = createMockRequest({
        actionId: 'test-action-id',
      });

      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(mockContext, mockRequest, mockResponse);

      // Should return with zero values for missing aggregations
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: expect.objectContaining({
          aggregations: {
            totalRowCount: 0,
            totalResponded: 0,
            successful: 0,
            failed: 0,
            pending: 1, // 1 agent - 0 responded = 1 pending
          },
        }),
      });
    });

    it('should handle pagination and sort parameters correctly', async () => {
      const mockSearchFn = createMockSearchStrategy(
        createMockActionDetailsResponse(['agent-1']),
        createMockActionResultsResponse(10)
      );

      const mockContext = createMockContext(mockSearchFn);

      const mockRequest = createMockRequest({
        actionId: 'test-action-id',
        query: {
          page: 2,
          pageSize: 50,
          sort: 'agent.id',
          sortOrder: Direction.asc,
        },
      });

      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(mockContext, mockRequest, mockResponse);

      // Verify pagination and sort parameters were passed to search
      expect(mockSearchFn).toHaveBeenCalledWith(
        expect.objectContaining({
          pagination: expect.objectContaining({
            activePage: 2,
            querySize: 50,
          }),
          sort: {
            direction: Direction.asc,
            field: 'agent.id',
          },
        }),
        expectedSearchOptions
      );

      expect(mockResponse.ok).toHaveBeenCalled();
    });

    it('should use default pagination values when not provided', async () => {
      const mockSearchFn = createMockSearchStrategy(
        createMockActionDetailsResponse(['agent-1']),
        createMockActionResultsResponse(10)
      );

      const mockContext = createMockContext(mockSearchFn);

      const mockRequest = createMockRequest({
        actionId: 'test-action-id',
        // No pagination/sort parameters
      });

      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(mockContext, mockRequest, mockResponse);

      // Verify default values were used
      expect(mockSearchFn).toHaveBeenCalledWith(
        expect.objectContaining({
          pagination: expect.objectContaining({
            activePage: 0, // default page
            querySize: 100, // default pageSize
          }),
          sort: {
            direction: Direction.desc, // default sortOrder
            field: '@timestamp', // default sort
          },
        }),
        expectedSearchOptions
      );
    });
  });

  describe('ProcessedEdges for Internal UI', () => {
    it('should create placeholder edges for agents without results', async () => {
      // 5 agents in action, but only 3 have results (agent-1, agent-2, agent-3)
      const mockSearchFn = createMockSearchStrategy(
        createMockActionDetailsResponse(['agent-1', 'agent-2', 'agent-3', 'agent-4', 'agent-5']),
        createMockActionResultsResponse(['agent-1', 'agent-2', 'agent-3'], {
          totalResponded: 3,
          successCount: 3,
          errorCount: 0,
        })
      );

      const mockContext = createMockContext(mockSearchFn);
      const mockRequest = createMockRequest({
        actionId: 'test-action-id',
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(mockContext, mockRequest, mockResponse);

      // Verify response contains all 5 agents (3 real + 2 placeholders)
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: expect.objectContaining({
          edges: expect.arrayContaining([
            expect.any(Object), // Real results
            expect.any(Object),
            expect.any(Object),
            expect.any(Object), // Placeholder edges
            expect.any(Object),
          ]),
          total: 5, // Total should be 5 (all agents)
          aggregations: expect.objectContaining({
            pending: 2, // 5 agents - 3 responded = 2 pending
          }),
        }),
      });
    });

    it('should not create placeholders when agentIds parameter provided', async () => {
      // External API usage - agentIds parameter provided
      const mockSearchFn = createMockSearchStrategy(
        undefined, // Action details should not be fetched
        createMockActionResultsResponse(2, {
          totalResponded: 2,
          successCount: 2,
          errorCount: 0,
        })
      );

      const mockContext = createMockContext(mockSearchFn);
      const mockRequest = createMockRequest({
        actionId: 'test-action-id',
        query: {
          agentIds: 'agent-1,agent-2',
        },
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(mockContext, mockRequest, mockResponse);

      // Verify only actual ES results returned, no placeholders
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: expect.objectContaining({
          edges: expect.any(Array),
          total: 2, // Only actual results, no placeholders
        }),
      });
    });

    it('should deduplicate edges keeping real data over placeholders', async () => {
      // Setup: 3 agents, all have results
      const mockActionResults = createMockActionResultsResponse(3, {
        totalResponded: 3,
        successCount: 3,
        errorCount: 0,
      });

      // Add agent_id fields to the edges to simulate real data
      mockActionResults.edges = [
        {
          _id: 'result-1',
          _index: '.logs-osquery_manager.action.responses',
          _source: { status: 'success' },
          fields: { agent_id: ['agent-1'] },
        },
        {
          _id: 'result-2',
          _index: '.logs-osquery_manager.action.responses',
          _source: { status: 'success' },
          fields: { agent_id: ['agent-2'] },
        },
        {
          _id: 'result-3',
          _index: '.logs-osquery_manager.action.responses',
          _source: { status: 'success' },
          fields: { agent_id: ['agent-3'] },
        },
      ] as typeof mockActionResults.edges;

      const mockSearchFn = createMockSearchStrategy(
        createMockActionDetailsResponse(['agent-1', 'agent-2', 'agent-3']),
        mockActionResults
      );

      const mockContext = createMockContext(mockSearchFn);
      const mockRequest = createMockRequest({
        actionId: 'test-action-id',
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(mockContext, mockRequest, mockResponse);

      const responseBody = mockResponse.ok.mock.calls[0]?.[0]?.body as {
        edges: Array<{ _source?: object; fields?: { agent_id?: string[] } }>;
      };

      // Verify all 3 edges exist
      expect(responseBody.edges).toHaveLength(3);

      // Verify edges contain real data (have _source property), not just placeholders
      expect(responseBody.edges[0]).toHaveProperty('_source');
      expect(responseBody.edges[1]).toHaveProperty('_source');
      expect(responseBody.edges[2]).toHaveProperty('_source');
    });

    it('should handle empty results with all pending agents', async () => {
      // 10 agents, 0 results - all should be placeholders
      const mockSearchFn = createMockSearchStrategy(
        createMockActionDetailsResponse([
          'agent-1',
          'agent-2',
          'agent-3',
          'agent-4',
          'agent-5',
          'agent-6',
          'agent-7',
          'agent-8',
          'agent-9',
          'agent-10',
        ]),
        createMockActionResultsResponse(0, {
          totalResponded: 0,
          totalRowCount: 0,
          successCount: 0,
          errorCount: 0,
        })
      );

      const mockContext = createMockContext(mockSearchFn);
      const mockRequest = createMockRequest({
        actionId: 'test-action-id',
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(mockContext, mockRequest, mockResponse);

      // Verify 10 placeholder edges created
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: expect.objectContaining({
          edges: expect.arrayContaining([
            expect.objectContaining({ fields: { agent_id: expect.any(Array) } }),
            expect.objectContaining({ fields: { agent_id: expect.any(Array) } }),
            expect.objectContaining({ fields: { agent_id: expect.any(Array) } }),
            expect.objectContaining({ fields: { agent_id: expect.any(Array) } }),
            expect.objectContaining({ fields: { agent_id: expect.any(Array) } }),
            expect.objectContaining({ fields: { agent_id: expect.any(Array) } }),
            expect.objectContaining({ fields: { agent_id: expect.any(Array) } }),
            expect.objectContaining({ fields: { agent_id: expect.any(Array) } }),
            expect.objectContaining({ fields: { agent_id: expect.any(Array) } }),
            expect.objectContaining({ fields: { agent_id: expect.any(Array) } }),
          ]),
          total: 10, // All placeholders
          aggregations: expect.objectContaining({
            pending: 10, // All pending
          }),
        }),
      });
    });

    it('should handle large agent sets efficiently', async () => {
      // Test with 100 agents to verify performance characteristics
      const largeAgentSet = Array.from({ length: 100 }, (_, i) => `agent-${i}`);

      const mockSearchFn = createMockSearchStrategy(
        createMockActionDetailsResponse(largeAgentSet),
        createMockActionResultsResponse(50, {
          totalResponded: 50,
          successCount: 50,
          errorCount: 0,
        })
      );

      const mockContext = createMockContext(mockSearchFn);
      const mockRequest = createMockRequest({
        actionId: 'test-action-id',
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(mockContext, mockRequest, mockResponse);

      // Verify all 100 agents represented in response
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: expect.objectContaining({
          total: 100, // 50 real + 50 placeholders
          aggregations: expect.objectContaining({
            pending: 50, // 100 agents - 50 responded = 50 pending
          }),
        }),
      });
    });

    it('should maintain proper edge structure for placeholders', async () => {
      const mockSearchFn = createMockSearchStrategy(
        createMockActionDetailsResponse(['agent-1', 'agent-2']),
        createMockActionResultsResponse(0, {
          totalResponded: 0,
          successCount: 0,
          errorCount: 0,
        })
      );

      const mockContext = createMockContext(mockSearchFn);
      const mockRequest = createMockRequest({
        actionId: 'test-action-id',
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(mockContext, mockRequest, mockResponse);

      const responseBody = mockResponse.ok.mock.calls[0]?.[0]?.body as {
        edges: Array<{ _source?: object; fields: { agent_id: string[] } }>;
      };

      // Verify placeholder edges have proper fields.agent_id structure
      expect(responseBody.edges[0]).toMatchObject({
        fields: { agent_id: expect.arrayContaining([expect.any(String)]) },
      });
      expect(responseBody.edges[1]).toMatchObject({
        fields: { agent_id: expect.arrayContaining([expect.any(String)]) },
      });

      // Verify agent IDs are preserved
      const agentIds = responseBody.edges.map(
        (edge: { fields: { agent_id: string[] } }) => edge.fields.agent_id[0]
      );
      expect(agentIds).toEqual(expect.arrayContaining(['agent-1', 'agent-2']));
    });

    it('should skip processedEdges when agentIds array is empty', async () => {
      // Action with no agents should not attempt to create placeholders
      const mockSearchFn = createMockSearchStrategy(
        createMockActionDetailsResponse([]), // No agents
        createMockActionResultsResponse(0, {
          totalResponded: 0,
          successCount: 0,
          errorCount: 0,
        })
      );

      const mockContext = createMockContext(mockSearchFn);
      const mockRequest = createMockRequest({
        actionId: 'test-action-id',
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(mockContext, mockRequest, mockResponse);

      // Verify no placeholders created, just empty results
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: expect.objectContaining({
          edges: [],
          total: 0,
          aggregations: expect.objectContaining({
            pending: 0,
          }),
        }),
      });
    });
  });
});

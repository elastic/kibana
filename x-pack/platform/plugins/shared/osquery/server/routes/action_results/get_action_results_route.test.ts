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

      // Verify response includes correct aggregations and pagination metadata
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: expect.objectContaining({
          currentPage: 0,
          pageSize: 100,
          totalPages: 1,
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

      // Verify action results was called with agentIds array (new pagination approach)
      const actionResultsCall = mockSearchFn.mock.calls.find(
        (call) => call[0].factoryQueryType === OsqueryQueries.actionResults
      );

      expect(actionResultsCall).toBeDefined();
      expect(actionResultsCall![0]).toMatchObject({
        factoryQueryType: OsqueryQueries.actionResults,
        agentIds: ['agent-1', 'agent-2'],
      });

      // CRITICAL: Verify kuery does NOT contain agent.id filters (architectural change from KQL to array)
      // kuery should be undefined or not contain agent.id patterns
      if (actionResultsCall![0].kuery) {
        expect(actionResultsCall![0].kuery).not.toMatch(/agent\.id:/);
      }

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
          agentIds: ['agent-1'],
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

      // Verify trimmed agent IDs in array
      expect(mockSearchFn).toHaveBeenCalledWith(
        expect.objectContaining({
          agentIds: ['agent-1', 'agent-2', 'agent-3'],
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

      // Verify agentIds passed as array and kuery kept separate (new pagination approach)
      const actionResultsCall = mockSearchFn.mock.calls.find(
        (call) => call[0].factoryQueryType === OsqueryQueries.actionResults
      );

      expect(actionResultsCall).toBeDefined();
      expect(actionResultsCall![0]).toMatchObject({
        agentIds: ['agent-1', 'agent-2'],
        kuery: userKuery,
      });

      // CRITICAL: Verify kuery contains ONLY user filter, NOT agent.id filters (architectural change)
      expect(actionResultsCall![0].kuery).toBe(userKuery);
      expect(actionResultsCall![0].kuery).not.toMatch(/agent\.id:/);
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

  describe('Hybrid Fallback Pagination - agentIds only', () => {
    // Tests for the fallback path when action document is unavailable
    // Client sends current page agent IDs only; client handles overall pagination

    it('should use client-provided agent IDs when action document unavailable', async () => {
      // Scenario: Client sends 20 agents for current page, 2 responded, 18 pending
      const mockSearchFn = createMockSearchStrategy(
        undefined, // Action details should NOT be fetched (fallback path)
        createMockActionResultsResponse(2, {
          totalResponded: 2,
          successCount: 2,
          errorCount: 0,
        })
      );

      const mockContext = createMockContext(mockSearchFn);

      // Client sends ONLY current page agent IDs (20 agents)
      const currentPageAgentIds = Array.from({ length: 20 }, (_, i) => `agent-${i}`).join(',');

      const mockRequest = createMockRequest({
        actionId: 'test-action-id',
        query: {
          agentIds: currentPageAgentIds,
          page: 0,
          pageSize: 20,
        },
      });

      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(mockContext, mockRequest, mockResponse);

      // Verify action details was NOT fetched (fallback path used)
      expect(mockSearchFn).not.toHaveBeenCalledWith(
        expect.objectContaining({
          factoryQueryType: OsqueryQueries.actionDetails,
        }),
        expect.anything()
      );

      // Verify response - server doesn't know total, client handles pagination
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: expect.objectContaining({
          currentPage: 0,
          pageSize: 20,
          // Should have 2 real results + 18 placeholders = 20 total (full page)
          edges: expect.arrayContaining([expect.objectContaining({ _id: expect.any(String) })]),
          total: 20, // Current page size
        }),
      });
    });

    it('should create placeholders for pending agents in fallback path', async () => {
      // Scenario: Page with 5 agents, 2 responded, should create 3 placeholders
      const mockActionResults = createMockActionResultsResponse(2, {
        totalResponded: 2,
        successCount: 2,
        errorCount: 0,
      });

      // Set actual agent IDs on the 2 responses
      mockActionResults.edges[0].fields = { agent_id: ['agent-0'] };
      mockActionResults.edges[1].fields = { agent_id: ['agent-1'] };

      const mockSearchFn = createMockSearchStrategy(undefined, mockActionResults);
      const mockContext = createMockContext(mockSearchFn);

      const mockRequest = createMockRequest({
        actionId: 'test-action-id',
        query: {
          agentIds: 'agent-0,agent-1,agent-2,agent-3,agent-4', // 5 agents current page
          page: 0,
          pageSize: 20,
        },
      });

      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(mockContext, mockRequest, mockResponse);

      const responseBody = (mockResponse.ok as jest.Mock).mock.calls[0][0].body;

      // Should have 5 edges total: 2 real + 3 placeholders
      expect(responseBody.edges).toHaveLength(5);

      // Count placeholders (IDs starting with "placeholder-")
      const placeholderCount = responseBody.edges.filter((edge: any) =>
        edge._id.startsWith('placeholder-')
      ).length;

      expect(placeholderCount).toBe(3); // agent-2, agent-3, agent-4 pending

      // Verify placeholders have correct agent IDs
      const placeholderAgentIds = responseBody.edges
        .filter((edge: any) => edge._id.startsWith('placeholder-'))
        .map((edge: any) => edge.fields.agent_id[0])
        .sort();

      expect(placeholderAgentIds).toEqual(['agent-2', 'agent-3', 'agent-4']);
    });

    it('should maintain server-side pagination principles (URL length safe)', async () => {
      // Verify that even with 10k agents total, only current page IDs are sent
      const mockSearchFn = createMockSearchStrategy(
        undefined,
        createMockActionResultsResponse(0, {
          totalResponded: 0,
          successCount: 0,
          errorCount: 0,
        })
      );

      const mockContext = createMockContext(mockSearchFn);

      // Client sends 100 agent IDs (current page), not all 10,000
      const currentPageAgentIds = Array.from({ length: 100 }, (_, i) => `agent-${i}`).join(',');

      const mockRequest = createMockRequest({
        actionId: 'test-action-id',
        query: {
          agentIds: currentPageAgentIds, // Only 100 IDs (~3,600 chars)
          page: 0,
          pageSize: 100,
        },
      });

      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(mockContext, mockRequest, mockResponse);

      // Verify URL length is reasonable
      const agentIdsQueryParam = mockRequest.query.agentIds;
      expect(agentIdsQueryParam.length).toBeLessThan(4000); // Well under URL limits

      // Verify response - server returns current page only
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: expect.objectContaining({
          currentPage: 0,
          edges: expect.any(Array),
        }),
      });
    });

    it('should handle partial page in fallback path', async () => {
      // Scenario: Client sends 2 agents (could be last page), 1 responded, 1 pending
      const mockSearchFn = createMockSearchStrategy(
        undefined,
        createMockActionResultsResponse(1, {
          totalResponded: 1,
          successCount: 1,
          errorCount: 0,
        })
      );

      const mockContext = createMockContext(mockSearchFn);

      const mockRequest = createMockRequest({
        actionId: 'test-action-id',
        query: {
          agentIds: 'agent-500,agent-501', // Only 2 agents
          page: 25,
          pageSize: 20,
        },
      });

      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(mockContext, mockRequest, mockResponse);

      const responseBody = (mockResponse.ok as jest.Mock).mock.calls[0][0].body;

      // Should have 2 edges (1 real + 1 placeholder)
      expect(responseBody.edges).toHaveLength(2);
      expect(responseBody.total).toBe(2);
      expect(responseBody.currentPage).toBe(25);
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

      // Verify pagination metadata in response
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: expect.objectContaining({
          currentPage: 2,
          pageSize: 50,
          totalPages: 1,
        }),
      });
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

    it('should return correct pagination metadata for multi-page results', async () => {
      // Test with 250 agents, page size 100, requesting page 1 (second page)
      const allAgents = Array.from({ length: 250 }, (_, i) => `agent-${i}`);
      const mockSearchFn = createMockSearchStrategy(
        createMockActionDetailsResponse(allAgents),
        createMockActionResultsResponse(50)
      );

      const mockContext = createMockContext(mockSearchFn);
      const mockRequest = createMockRequest({
        actionId: 'test-action-id',
        query: {
          page: 1,
          pageSize: 100,
        },
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(mockContext, mockRequest, mockResponse);

      // Verify pagination metadata is correct
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: expect.objectContaining({
          currentPage: 1,
          pageSize: 100,
          totalPages: 3,
          total: expect.any(Number),
        }),
      });
    });
  });

  describe('ProcessedEdges for Internal UI', () => {
    // Note: Mixed results + placeholders scenario is tested at scale in
    // "should handle large agent sets efficiently" (100 agents, 50 responded)

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

  describe('Server-side Pagination', () => {
    it('should apply pagination to agent IDs before querying (page 0)', async () => {
      // 1000 agents total, page 0, pageSize 100 -> agents 0-99
      const totalAgents = 1000;
      const allAgents = Array.from({ length: totalAgents }, (_, i) => `agent-${i}`);

      // Mock response for current page: agents 0-49 responded (50 out of 100)
      const currentPageResponded = allAgents.slice(0, 50);

      const mockSearchFn = createMockSearchStrategy(
        createMockActionDetailsResponse(allAgents),
        createMockActionResultsResponse(currentPageResponded, {
          totalResponded: 50,
          successCount: 50,
          errorCount: 0,
        })
      );

      const mockContext = createMockContext(mockSearchFn);
      const mockRequest = createMockRequest({
        actionId: 'test-action-id',
        query: {
          page: 0,
          pageSize: 100,
        },
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(mockContext, mockRequest, mockResponse);

      // Verify action results was called with pagination-sliced agents
      expect(mockSearchFn).toHaveBeenCalledWith(
        expect.objectContaining({
          factoryQueryType: OsqueryQueries.actionResults,
          // Should pass first 100 agent IDs to query
          agentIds: allAgents.slice(0, 100),
        }),
        expectedSearchOptions
      );

      // Verify response contains current page (100 agents: 50 responded + 50 placeholders)
      const responseBody = mockResponse.ok.mock.calls[0]?.[0]?.body as {
        edges: unknown[];
        aggregations: { pending: number };
      };

      // Should have exactly 100 edges for current page
      expect(responseBody.edges.length).toBe(100);

      // Total pending is 1000 total - 50 responded = 950
      expect(responseBody.aggregations.pending).toBe(950);
    });

    it('should apply pagination to agent IDs for page 5', async () => {
      // 1000 agents total, page 5, pageSize 100 -> agents 500-599
      const totalAgents = 1000;
      const allAgents = Array.from({ length: totalAgents }, (_, i) => `agent-${i}`);

      // Mock response for current page: agents 500-574 responded (75 out of 100)
      const currentPageResponded = allAgents.slice(500, 575);

      const mockSearchFn = createMockSearchStrategy(
        createMockActionDetailsResponse(allAgents),
        createMockActionResultsResponse(currentPageResponded, {
          totalResponded: 75,
          successCount: 75,
          errorCount: 0,
        })
      );

      const mockContext = createMockContext(mockSearchFn);
      const mockRequest = createMockRequest({
        actionId: 'test-action-id',
        query: {
          page: 5,
          pageSize: 100,
        },
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(mockContext, mockRequest, mockResponse);

      // Verify correct page slice (500-599)
      expect(mockSearchFn).toHaveBeenCalledWith(
        expect.objectContaining({
          factoryQueryType: OsqueryQueries.actionResults,
          agentIds: allAgents.slice(500, 600),
        }),
        expectedSearchOptions
      );

      // Verify response for current page only (100 agents: 75 responded + 25 placeholders)
      const responseBody = mockResponse.ok.mock.calls[0]?.[0]?.body as {
        edges: unknown[];
        aggregations: { pending: number };
      };

      expect(responseBody.edges.length).toBe(100);
      expect(responseBody.aggregations.pending).toBe(925); // 1000 total - 75 responded
    });

    it('should handle last page with partial results (10k+ agents)', async () => {
      // 10,200 agents total, page 101, pageSize 100 -> agents 10100-10199 (last 100)
      const totalAgents = 10200;
      const allAgents = Array.from({ length: totalAgents }, (_, i) => `agent-${i}`);
      const lastPageIndex = 101; // Page 0 = first 100, page 101 = agents 10100-10199
      const lastPageSize = 100;

      // Mock response for last page: all 100 agents responded
      const lastPageResponded = allAgents.slice(10100, 10200);

      const mockSearchFn = createMockSearchStrategy(
        createMockActionDetailsResponse(allAgents),
        createMockActionResultsResponse(lastPageResponded, {
          totalResponded: 100,
          successCount: 100,
          errorCount: 0,
        })
      );

      const mockContext = createMockContext(mockSearchFn);
      const mockRequest = createMockRequest({
        actionId: 'test-action-id',
        query: {
          page: lastPageIndex,
          pageSize: lastPageSize,
        },
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(mockContext, mockRequest, mockResponse);

      // Verify correct last page slice
      expect(mockSearchFn).toHaveBeenCalledWith(
        expect.objectContaining({
          factoryQueryType: OsqueryQueries.actionResults,
          agentIds: allAgents.slice(10100, 10200),
        }),
        expectedSearchOptions
      );

      // Verify response for last page (100 agents all responded, no placeholders)
      const responseBody = mockResponse.ok.mock.calls[0]?.[0]?.body as { edges: unknown[] };
      expect(responseBody.edges.length).toBe(100);
    });

    it('should handle 15k agents with efficient pagination (150 pages)', async () => {
      // Simulates enterprise deployment with 15,000 agents
      const totalAgents = 15000;
      const allAgents = Array.from({ length: totalAgents }, (_, i) => `agent-${i}`);

      // Test middle page (page 75 = agents 7500-7599)
      // Mock response: agents 7500-7519 responded (20 out of 100)
      const currentPageResponded = allAgents.slice(7500, 7520);

      const mockSearchFn = createMockSearchStrategy(
        createMockActionDetailsResponse(allAgents),
        createMockActionResultsResponse(currentPageResponded, {
          totalResponded: 20,
          successCount: 20,
          errorCount: 0,
        })
      );

      const mockContext = createMockContext(mockSearchFn);
      const mockRequest = createMockRequest({
        actionId: 'test-action-id',
        query: {
          page: 75,
          pageSize: 100,
        },
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(mockContext, mockRequest, mockResponse);

      // Verify only 100 agents processed (not all 15k)
      expect(mockSearchFn).toHaveBeenCalledWith(
        expect.objectContaining({
          factoryQueryType: OsqueryQueries.actionResults,
          agentIds: allAgents.slice(7500, 7600),
        }),
        expectedSearchOptions
      );

      // Verify memory-efficient response (only current page: 20 responded + 80 placeholders = 100 total)
      const responseBody = mockResponse.ok.mock.calls[0]?.[0]?.body as { edges: unknown[] };
      expect(responseBody.edges.length).toBe(100);
    });

    it('should create placeholders only for current page, not all agents', async () => {
      // Validates that ES query receives ONLY current page agent IDs (100), not all 10,000
      const totalAgents = 10000;
      const allAgents = Array.from({ length: totalAgents }, (_, i) => `agent-${i}`);

      // No agents responded on this page
      const mockSearchFn = createMockSearchStrategy(
        createMockActionDetailsResponse(allAgents),
        createMockActionResultsResponse(0, {
          totalResponded: 0,
          successCount: 0,
          errorCount: 0,
        })
      );

      const mockContext = createMockContext(mockSearchFn);
      const mockRequest = createMockRequest({
        actionId: 'test-action-id',
        query: {
          page: 0,
          pageSize: 100,
        },
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(mockContext, mockRequest, mockResponse);

      // CRITICAL ASSERTION: Verify Elasticsearch query receives ONLY 100 agent IDs, not all 10,000
      const actionResultsCall = mockSearchFn.mock.calls.find(
        (call) => call[0].factoryQueryType === OsqueryQueries.actionResults
      );

      expect(actionResultsCall).toBeDefined();
      expect(actionResultsCall![0].agentIds).toHaveLength(100);
      expect(actionResultsCall![0].agentIds).not.toHaveLength(totalAgents);

      // Verify response also has correct number of edges (100 placeholders created)
      const responseBody = mockResponse.ok.mock.calls[0]?.[0]?.body as { edges: unknown[] };
      expect(responseBody.edges.length).toBe(100);
      expect(responseBody.edges.length).not.toBe(totalAgents);
    });

    it('should support different page sizes (50, 100, 500)', async () => {
      const totalAgents = 1000;
      const allAgents = Array.from({ length: totalAgents }, (_, i) => `agent-${i}`);

      const pageSizes = [50, 100, 500];

      for (const pageSize of pageSizes) {
        const mockSearchFn = createMockSearchStrategy(
          createMockActionDetailsResponse(allAgents),
          createMockActionResultsResponse(pageSize / 2) // Half responded
        );

        const mockContext = createMockContext(mockSearchFn);
        const mockRequest = createMockRequest({
          actionId: 'test-action-id',
          query: {
            page: 0,
            pageSize,
          },
        });
        const mockResponse = httpServerMock.createResponseFactory();

        await routeHandler(mockContext, mockRequest, mockResponse);

        // Verify correct page size used
        expect(mockSearchFn).toHaveBeenCalledWith(
          expect.objectContaining({
            agentIds: allAgents.slice(0, pageSize),
          }),
          expectedSearchOptions
        );

        const responseBody = mockResponse.ok.mock.calls[0]?.[0]?.body as { edges: unknown[] };
        expect(responseBody.edges.length).toBeLessThanOrEqual(pageSize);
      }
    });

    it('should handle boundary condition: exactly 10k agents at page boundary', async () => {
      // Edge case: exactly 10,000 agents, last page (page 99)
      const totalAgents = 10000;
      const allAgents = Array.from({ length: totalAgents }, (_, i) => `agent-${i}`);

      const mockSearchFn = createMockSearchStrategy(
        createMockActionDetailsResponse(allAgents),
        createMockActionResultsResponse(100)
      );

      const mockContext = createMockContext(mockSearchFn);
      const mockRequest = createMockRequest({
        actionId: 'test-action-id',
        query: {
          page: 99, // Last page (0-indexed, so page 99 = agents 9900-9999)
          pageSize: 100,
        },
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(mockContext, mockRequest, mockResponse);

      // Verify last page slice
      expect(mockSearchFn).toHaveBeenCalledWith(
        expect.objectContaining({
          agentIds: allAgents.slice(9900, 10000),
        }),
        expectedSearchOptions
      );

      expect(mockResponse.ok).toHaveBeenCalled();
    });

    it('should handle pagination beyond last page gracefully', async () => {
      // Critical edge case: requesting page 999 when only 100 pages exist (10,000 agents / 100 per page)
      const totalAgents = 10000;
      const allAgents = Array.from({ length: totalAgents }, (_, i) => `agent-${i}`);

      const mockSearchFn = createMockSearchStrategy(
        createMockActionDetailsResponse(allAgents),
        createMockActionResultsResponse(0, {
          totalResponded: 0,
          successCount: 0,
          errorCount: 0,
        })
      );

      const mockContext = createMockContext(mockSearchFn);
      const mockRequest = createMockRequest({
        actionId: 'test-action-id',
        query: {
          page: 999, // Way beyond last page (only pages 0-99 exist)
          pageSize: 100,
        },
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(mockContext, mockRequest, mockResponse);

      // Verify request doesn't crash and returns empty results
      expect(mockResponse.ok).toHaveBeenCalled();

      const responseBody = mockResponse.ok.mock.calls[0]?.[0]?.body as { edges: unknown[] };

      // Should return empty results (slicing beyond array returns empty)
      expect(responseBody.edges).toEqual([]);
    });

    it('should pass agentIds array to search strategy (not KQL string)', async () => {
      const totalAgents = 500;
      const allAgents = Array.from({ length: totalAgents }, (_, i) => `agent-${i}`);

      const mockSearchFn = createMockSearchStrategy(
        createMockActionDetailsResponse(allAgents),
        createMockActionResultsResponse(50)
      );

      const mockContext = createMockContext(mockSearchFn);
      const mockRequest = createMockRequest({
        actionId: 'test-action-id',
        query: {
          page: 2,
          pageSize: 100,
        },
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(mockContext, mockRequest, mockResponse);

      // Verify agentIds is passed as array, not converted to KQL
      expect(mockSearchFn).toHaveBeenCalledWith(
        expect.objectContaining({
          factoryQueryType: OsqueryQueries.actionResults,
          agentIds: expect.arrayContaining(['agent-200', 'agent-250', 'agent-299']),
        }),
        expectedSearchOptions
      );

      // Verify kuery is separate (not mixed with agentIds)
      const actionResultsCall = mockSearchFn.mock.calls.find(
        (call) => call[0].factoryQueryType === OsqueryQueries.actionResults
      );
      expect(actionResultsCall?.[0].kuery).toBeUndefined();
    });

    it('should combine user kuery with internal pagination correctly', async () => {
      // Tests internal API (no agentIds param) with BOTH pagination AND user kuery filtering
      const totalAgents = 1000;
      const allAgents = Array.from({ length: totalAgents }, (_, i) => `agent-${i}`);
      const userKuery = 'error.message: *timeout*';

      // Mock response for page 2: agents 200-249 responded (50 out of 100)
      const currentPageResponded = allAgents.slice(200, 250);

      const mockSearchFn = createMockSearchStrategy(
        createMockActionDetailsResponse(allAgents),
        createMockActionResultsResponse(currentPageResponded, {
          totalResponded: 50,
          successCount: 50,
          errorCount: 0,
        })
      );

      const mockContext = createMockContext(mockSearchFn);
      const mockRequest = createMockRequest({
        actionId: 'test-action-id',
        query: {
          page: 2,
          pageSize: 100,
          kuery: userKuery,
        },
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(mockContext, mockRequest, mockResponse);

      // Verify action details was fetched (internal API path)
      expect(mockSearchFn).toHaveBeenCalledWith(
        expect.objectContaining({
          factoryQueryType: OsqueryQueries.actionDetails,
        }),
        expectedSearchOptions
      );

      // Verify action results was called with pagination + user kuery
      const actionResultsCall = mockSearchFn.mock.calls.find(
        (call) => call[0].factoryQueryType === OsqueryQueries.actionResults
      );

      expect(actionResultsCall).toBeDefined();
      expect(actionResultsCall![0]).toMatchObject({
        factoryQueryType: OsqueryQueries.actionResults,
        agentIds: allAgents.slice(200, 300), // Page 2, pageSize 100
        kuery: userKuery, // User kuery preserved
      });

      // CRITICAL: Verify kuery contains ONLY user filter, NOT agent.id filters
      expect(actionResultsCall![0].kuery).toBe(userKuery);
      expect(actionResultsCall![0].kuery).not.toMatch(/agent\.id:/);

      // Verify response has correct page size
      const responseBody = mockResponse.ok.mock.calls[0]?.[0]?.body as { edges: unknown[] };
      expect(responseBody.edges.length).toBe(100); // 50 responded + 50 placeholders
    });

    it('should apply pagination for external API with agentIds parameter', async () => {
      // External API consumer provides agentIds, pagination should still apply
      const mockSearchFn = createMockSearchStrategy(undefined, createMockActionResultsResponse(50));

      const mockContext = createMockContext(mockSearchFn);
      const mockRequest = createMockRequest({
        actionId: 'test-action-id',
        query: {
          agentIds: Array.from({ length: 100 }, (_, i) => `agent-${i}`).join(','),
          page: 0,
          pageSize: 50,
        },
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(mockContext, mockRequest, mockResponse);

      // Verify pagination applied to provided agentIds
      expect(mockSearchFn).toHaveBeenCalledWith(
        expect.objectContaining({
          factoryQueryType: OsqueryQueries.actionResults,
          agentIds: expect.arrayContaining(['agent-0', 'agent-25', 'agent-49']),
        }),
        expectedSearchOptions
      );
    });
  });
});

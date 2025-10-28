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
  type ActionResultsStrategyResponse,
} from '../../../common/search_strategy';
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

  describe('Route handler behavior', () => {
    it('should accept agentIds in query parameter', async () => {
      const mockSearchFn = createMockSearchStrategy(
        createMockActionResultsResponse(3, {
          totalResponded: 3,
          successCount: 3,
          errorCount: 0,
        })
      );

      const mockContext = createMockContext(mockSearchFn);
      const mockRequest = createMockRequest({
        actionId: 'test-action-id',
        query: {
          agentIds: 'agent-1,agent-2,agent-3',
        },
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(mockContext, mockRequest, mockResponse);

      // Verify NO action details call
      expect(mockSearchFn).not.toHaveBeenCalledWith(
        expect.objectContaining({
          factoryQueryType: OsqueryQueries.actionDetails,
        }),
        expect.anything()
      );

      // Verify action results called with provided agents
      expect(mockSearchFn).toHaveBeenCalledWith(
        expect.objectContaining({
          actionId: 'test-action-id',
          factoryQueryType: OsqueryQueries.actionResults,
          agentIds: ['agent-1', 'agent-2', 'agent-3'],
        }),
        expectedSearchOptions
      );

      expect(mockResponse.ok).toHaveBeenCalled();
    });

    it('should handle empty agentIds parameter', async () => {
      const mockSearchFn = createMockSearchStrategy(
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

      // Should call with empty array
      expect(mockSearchFn).toHaveBeenCalledWith(
        expect.objectContaining({
          agentIds: [],
        }),
        expectedSearchOptions
      );

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

    it('should handle single agent ID in agentIds parameter', async () => {
      const mockSearchFn = createMockSearchStrategy(createMockActionResultsResponse(1));

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

    it('should trim whitespace from comma-separated agent IDs', async () => {
      const mockSearchFn = createMockSearchStrategy(createMockActionResultsResponse(3));

      const mockContext = createMockContext(mockSearchFn);
      const mockRequest = createMockRequest({
        actionId: 'test-action-id',
        query: {
          agentIds: ' agent-1 , agent-2 , agent-3 ',
        },
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockSearchFn).toHaveBeenCalledWith(
        expect.objectContaining({
          agentIds: ['agent-1', 'agent-2', 'agent-3'],
        }),
        expectedSearchOptions
      );
    });

    it('should combine agentIds with user-provided kuery correctly', async () => {
      const userKuery = 'error.message: *timeout*';
      const mockSearchFn = createMockSearchStrategy(createMockActionResultsResponse(2));

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

      const actionResultsCall = mockSearchFn.mock.calls.find(
        (call) => call[0].factoryQueryType === OsqueryQueries.actionResults
      );

      expect(actionResultsCall).toBeDefined();
      expect(actionResultsCall![0]).toMatchObject({
        agentIds: ['agent-1', 'agent-2'],
        kuery: userKuery,
      });
    });

    it('should create placeholders for agents that have not responded', async () => {
      const mockActionResults = createMockActionResultsResponse(2, {
        totalResponded: 2,
        successCount: 2,
        errorCount: 0,
      });

      mockActionResults.edges[0].fields = { agent_id: ['agent-0'] };
      mockActionResults.edges[1].fields = { agent_id: ['agent-1'] };

      const mockSearchFn = createMockSearchStrategy(mockActionResults);
      const mockContext = createMockContext(mockSearchFn);

      const mockRequest = createMockRequest({
        actionId: 'test-action-id',
        query: {
          agentIds: 'agent-0,agent-1,agent-2,agent-3,agent-4',
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

      expect(placeholderCount).toBe(3);

      // Verify placeholders have correct agent IDs
      const placeholderAgentIds = responseBody.edges
        .filter((edge: any) => edge._id.startsWith('placeholder-'))
        .map((edge: any) => edge.fields.agent_id[0])
        .sort();

      expect(placeholderAgentIds).toEqual(['agent-2', 'agent-3', 'agent-4']);
    });

    it('should calculate aggregations correctly', async () => {
      const mockSearchFn = createMockSearchStrategy(
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
        query: {
          agentIds: 'agent-1,agent-2,agent-3,agent-4,agent-5',
        },
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

    it('should handle pagination parameters correctly', async () => {
      const mockSearchFn = createMockSearchStrategy(createMockActionResultsResponse(10));

      const mockContext = createMockContext(mockSearchFn);
      const mockRequest = createMockRequest({
        actionId: 'test-action-id',
        query: {
          agentIds: 'agent-1',
          page: 2,
          pageSize: 50,
          sort: 'agent.id',
          sortOrder: Direction.asc,
        },
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(mockContext, mockRequest, mockResponse);

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

      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: expect.objectContaining({
          currentPage: 2,
          pageSize: 50,
          totalPages: 1,
        }),
      });
    });

    it('should use default pagination values when not provided', async () => {
      const mockSearchFn = createMockSearchStrategy(createMockActionResultsResponse(10));

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
          pagination: expect.objectContaining({
            activePage: 0,
            querySize: 100,
          }),
          sort: {
            direction: Direction.desc,
            field: '@timestamp',
          },
        }),
        expectedSearchOptions
      );
    });
  });

  describe('Error Handling', () => {
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

    it('should handle missing aggregations in action results response', async () => {
      const mockSearchFn = createMockSearchStrategy({
        edges: [],
        total: 0,
        rawResponse: {},
        inspect: { dsl: [] },
      } as unknown as ActionResultsStrategyResponse);

      const mockContext = createMockContext(mockSearchFn);
      const mockRequest = createMockRequest({
        actionId: 'test-action-id',
        query: {
          agentIds: 'agent-1',
        },
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(mockContext, mockRequest, mockResponse);

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
  });
});

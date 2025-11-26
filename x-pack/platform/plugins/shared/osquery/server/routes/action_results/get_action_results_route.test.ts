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

    it('should return only real ES responses (placeholders generated client-side)', async () => {
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

      // Server returns ONLY real ES responses (2 agents responded)
      expect(responseBody.edges).toHaveLength(2);

      // Verify NO placeholders in server response (client-side responsibility)
      const placeholderCount = responseBody.edges.filter((edge: any) =>
        edge._id.startsWith('placeholder-')
      ).length;

      expect(placeholderCount).toBe(0);

      // Verify aggregations show pending agents (for client to generate placeholders)
      expect(responseBody.aggregations.pending).toBe(3);
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
      const mockSearchFn = createMockSearchStrategy(createMockActionResultsResponse(1));

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
            activePage: 0,
            querySize: 1,
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
          pagination: expect.objectContaining({
            activePage: 0,
            querySize: 1,
          }),
          sort: {
            direction: Direction.desc,
            field: '@timestamp',
          },
        }),
        expectedSearchOptions
      );
    });

    it('should return only real ES responses for current page (placeholders generated client-side)', async () => {
      const totalAgents = 1000;
      const allAgentIds = Array.from({ length: totalAgents }, (_, i) => `agent-${i}`);

      // Page 2, pageSize 20: agents 40-59
      const page = 2;
      const pageSize = 20;
      const startIndex = page * pageSize;
      const currentPageAgentIds = allAgentIds.slice(startIndex, startIndex + pageSize);

      const respondedAgentIds = ['agent-40', 'agent-42', 'agent-45', 'agent-50', 'agent-55'];
      const mockActionResults = createMockActionResultsResponse(respondedAgentIds, {
        totalResponded: 5,
        totalRowCount: 0,
        successCount: 5,
        errorCount: 0,
      });

      const mockSearchFn = createMockSearchStrategy(mockActionResults);
      const mockContext = createMockContext(mockSearchFn);

      const mockRequest = createMockRequest({
        actionId: 'test-action-id',
        query: {
          agentIds: currentPageAgentIds.join(','),
          page,
          pageSize,
        },
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(mockContext, mockRequest, mockResponse);

      const responseBody = (mockResponse.ok as jest.Mock).mock.calls[0][0].body;

      expect(responseBody.edges).toHaveLength(5);

      const placeholderCount = responseBody.edges.filter((edge: any) =>
        edge._id.startsWith('placeholder-')
      ).length;
      expect(placeholderCount).toBe(0);

      const realResponses = responseBody.edges.filter(
        (edge: any) => !edge._id.startsWith('placeholder-')
      );
      expect(realResponses).toHaveLength(5);

      expect(responseBody.aggregations).toEqual({
        totalRowCount: 0,
        totalResponded: 5,
        successful: 5,
        failed: 0,
        pending: 15,
      });

      expect(responseBody.totalPages).toBe(Math.ceil(currentPageAgentIds.length / pageSize));
    });

    it('should handle page 1 with large agent set efficiently (no server-side placeholders)', async () => {
      const totalAgents = 100;
      const allAgentIds = Array.from({ length: totalAgents }, (_, i) => `agent-${i}`);

      const page = 1;
      const pageSize = 20;
      const startIndex = page * pageSize; // 20
      const currentPageAgentIds = allAgentIds.slice(startIndex, startIndex + pageSize); // agent-20 to agent-39

      const respondedAgentIds = currentPageAgentIds.slice(0, 10); // agent-20 to agent-29

      const mockActionResults = createMockActionResultsResponse(respondedAgentIds, {
        totalResponded: 10,
        totalRowCount: 0,
        successCount: 10,
        errorCount: 0,
      });

      const mockSearchFn = createMockSearchStrategy(mockActionResults);
      const mockContext = createMockContext(mockSearchFn);

      const mockRequest = createMockRequest({
        actionId: 'test-action-id',
        query: {
          agentIds: currentPageAgentIds.join(','),
          page,
          pageSize,
        },
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(mockContext, mockRequest, mockResponse);

      const responseBody = (mockResponse.ok as jest.Mock).mock.calls[0][0].body;

      expect(responseBody.edges).toHaveLength(10);

      const placeholderCount = responseBody.edges.filter((edge: any) =>
        edge._id.startsWith('placeholder-')
      ).length;
      expect(placeholderCount).toBe(0);

      expect(responseBody.aggregations.pending).toBe(10);
    });

    it('should handle empty page (all agents responded) without creating placeholders', async () => {
      const totalAgents = 50;
      const allAgentIds = Array.from({ length: totalAgents }, (_, i) => `agent-${i}`);

      const page = 0;
      const pageSize = 20;
      const currentPageAgentIds = allAgentIds.slice(0, pageSize);

      const mockActionResults = createMockActionResultsResponse(currentPageAgentIds, {
        totalResponded: 20,
        totalRowCount: 0,
        successCount: 20,
        errorCount: 0,
      });

      const mockSearchFn = createMockSearchStrategy(mockActionResults);
      const mockContext = createMockContext(mockSearchFn);

      const mockRequest = createMockRequest({
        actionId: 'test-action-id',
        query: {
          agentIds: currentPageAgentIds.join(','),
          page,
          pageSize,
        },
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(mockContext, mockRequest, mockResponse);

      const responseBody = (mockResponse.ok as jest.Mock).mock.calls[0][0].body;

      expect(responseBody.edges).toHaveLength(20);

      const placeholders = responseBody.edges.filter((edge: any) =>
        edge._id.startsWith('placeholder-')
      );
      expect(placeholders).toHaveLength(0);

      expect(responseBody.edges.every((edge: any) => !edge._id.startsWith('placeholder-'))).toBe(
        true
      );
    });
  });

  describe('Hybrid Mode (with results index data)', () => {
    beforeEach(() => {
      // Enable hybrid mode
      mockOsqueryContext.experimentalFeatures = { hybridActionResults: true };
    });

    it('should enrich edges with status and row_count from results index', async () => {
      const mockActionResults: ActionResultsStrategyResponse = {
        edges: [
          {
            _id: 'result-1',
            _index: '.logs-osquery_manager.action.responses',
            _source: {},
            fields: {
              agent_id: ['agent-1'],
              completed_at: ['2024-01-15T12:00:00.000Z'],
            },
          },
        ],
        total: 1,
        rawResponse: {
          aggregations: {
            aggs: {
              responses_by_action_id: {
                doc_count: 1,
                rows_count: { value: 0 },
                responses: {
                  buckets: [{ key: 'success', doc_count: 1 }],
                },
                unique_agent_ids: {
                  buckets: [{ key: 'agent-1', doc_count: 1 }],
                },
              },
            },
          },
        },
        inspect: { dsl: [] },
        resultsAgentBuckets: [{ key: 'agent-1', doc_count: 50 }],
        resultsTotalDocs: 50,
      } as unknown as ActionResultsStrategyResponse;

      const mockSearchFn = createMockSearchStrategy(mockActionResults);
      const mockContext = createMockContext(mockSearchFn);
      const mockRequest = createMockRequest({
        actionId: 'test-action-id',
        query: { agentIds: 'agent-1' },
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(mockContext, mockRequest, mockResponse);

      const responseBody = (mockResponse.ok as jest.Mock).mock.calls[0][0].body;

      expect(responseBody.edges[0].fields).toMatchObject({
        agent_id: ['agent-1'],
        status: ['success'],
        row_count: [50],
      });
    });

    it('should create placeholder edges for missing agents with results', async () => {
      const mockActionResults: ActionResultsStrategyResponse = {
        edges: [],
        total: 0,
        rawResponse: {
          aggregations: {
            aggs: {
              responses_by_action_id: {
                doc_count: 0,
                rows_count: { value: 0 },
                responses: { buckets: [] },
                unique_agent_ids: { buckets: [] },
              },
            },
          },
        },
        inspect: { dsl: [] },
        resultsAgentBuckets: [
          { key: 'silent-agent-1', doc_count: 100 },
          { key: 'silent-agent-2', doc_count: 200 },
        ],
        resultsTotalDocs: 300,
      } as unknown as ActionResultsStrategyResponse;

      const mockSearchFn = createMockSearchStrategy(mockActionResults);
      const mockContext = createMockContext(mockSearchFn);
      const mockRequest = createMockRequest({
        actionId: 'test-action-id',
        query: { agentIds: 'silent-agent-1,silent-agent-2' },
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(mockContext, mockRequest, mockResponse);

      const responseBody = (mockResponse.ok as jest.Mock).mock.calls[0][0].body;

      expect(responseBody.edges).toHaveLength(2);
      expect(responseBody.edges[0]).toMatchObject({
        _id: 'placeholder-silent-agent-1',
        fields: {
          agent_id: ['silent-agent-1'],
          status: ['success'],
          row_count: [100],
        },
      });
      expect(responseBody.edges[1]).toMatchObject({
        _id: 'placeholder-silent-agent-2',
        fields: {
          agent_id: ['silent-agent-2'],
          status: ['success'],
          row_count: [200],
        },
      });
    });

    it('should calculate hybrid aggregations combining Fleet and results data', async () => {
      const mockActionResults: ActionResultsStrategyResponse = {
        edges: Array(70)
          .fill(null)
          .map((_, i) => ({
            _id: `result-${i}`,
            _index: '.logs-osquery_manager.action.responses',
            _source: {},
            fields: { agent_id: [`fleet-agent-${i}`] },
          })),
        total: 70,
        rawResponse: {
          aggregations: {
            aggs: {
              responses_by_action_id: {
                doc_count: 70,
                rows_count: { value: 2000 },
                responses: {
                  buckets: [
                    { key: 'success', doc_count: 65 },
                    { key: 'error', doc_count: 5 },
                  ],
                },
                unique_agent_ids: {
                  buckets: Array(70)
                    .fill(null)
                    .map((_, i) => ({
                      key: `fleet-agent-${i}`,
                      doc_count: 1,
                    })),
                },
              },
            },
          },
        },
        inspect: { dsl: [] },
        resultsAgentBuckets: [
          ...Array(70)
            .fill(null)
            .map((_, i) => ({ key: `fleet-agent-${i}`, doc_count: 30 })),
          { key: 'inferred-1', doc_count: 50 },
          { key: 'inferred-2', doc_count: 50 },
          { key: 'inferred-3', doc_count: 50 },
        ],
        resultsTotalDocs: 2500,
      } as unknown as ActionResultsStrategyResponse;

      const mockSearchFn = createMockSearchStrategy(mockActionResults);
      const mockContext = createMockContext(mockSearchFn);
      const mockRequest = createMockRequest({
        actionId: 'test-action-id',
        query: {
          agentIds: Array(100)
            .fill(null)
            .map((_, i) => `agent-${i}`)
            .join(','),
          totalAgents: 100,
        },
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(mockContext, mockRequest, mockResponse);

      const responseBody = (mockResponse.ok as jest.Mock).mock.calls[0][0].body;

      expect(responseBody.aggregations).toEqual({
        totalRowCount: 2500,
        totalResponded: 73, // 70 Fleet + 3 inferred
        successful: 68, // 65 Fleet + 3 inferred
        failed: 5,
        pending: 27, // 100 - 73
      });
    });

    it('should mark expired action agents as expired status', async () => {
      const pastDate = '2020-01-01T00:00:00.000Z';

      const mockActionResults: ActionResultsStrategyResponse = {
        edges: [],
        total: 0,
        rawResponse: {
          aggregations: {
            aggs: {
              responses_by_action_id: {
                doc_count: 0,
                rows_count: { value: 0 },
                responses: { buckets: [] },
                unique_agent_ids: { buckets: [] },
              },
            },
          },
        },
        inspect: { dsl: [] },
        resultsAgentBuckets: [],
        resultsTotalDocs: 0,
      } as unknown as ActionResultsStrategyResponse;

      const mockSearchFn = createMockSearchStrategy(mockActionResults);
      const mockContext = createMockContext(mockSearchFn);
      const mockRequest = createMockRequest({
        actionId: 'test-action-id',
        query: {
          agentIds: 'expired-agent-1',
          expiration: pastDate,
        },
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(mockContext, mockRequest, mockResponse);

      const responseBody = (mockResponse.ok as jest.Mock).mock.calls[0][0].body;

      expect(responseBody.edges[0].fields.status).toEqual(['expired']);
      expect(responseBody.aggregations).toMatchObject({
        pending: 0,
        failed: 1, // Moved from pending to failed
      });
    });

    it('should handle large scale (15k+ agents) with hybrid data', async () => {
      const fleetAgents = 10000;
      const inferredAgents = 5000;

      const mockActionResults: ActionResultsStrategyResponse = {
        edges: Array(fleetAgents)
          .fill(null)
          .map((_, i) => ({
            _id: `result-${i}`,
            _index: '.logs-osquery_manager.action.responses',
            _source: {},
            fields: { agent_id: [`fleet-${i}`] },
          })),
        total: fleetAgents,
        rawResponse: {
          aggregations: {
            aggs: {
              responses_by_action_id: {
                doc_count: fleetAgents,
                rows_count: { value: 50000 },
                responses: {
                  buckets: [
                    { key: 'success', doc_count: 9500 },
                    { key: 'error', doc_count: 500 },
                  ],
                },
                unique_agent_ids: {
                  buckets: Array(fleetAgents)
                    .fill(null)
                    .map((_, i) => ({
                      key: `fleet-${i}`,
                      doc_count: 1,
                    })),
                },
              },
            },
          },
        },
        inspect: { dsl: [] },
        resultsAgentBuckets: [
          ...Array(fleetAgents)
            .fill(null)
            .map((_, i) => ({ key: `fleet-${i}`, doc_count: 5 })),
          ...Array(inferredAgents)
            .fill(null)
            .map((_, i) => ({ key: `inferred-${i}`, doc_count: 5 })),
        ],
        resultsTotalDocs: 75000,
      } as unknown as ActionResultsStrategyResponse;

      const mockSearchFn = createMockSearchStrategy(mockActionResults);
      const mockContext = createMockContext(mockSearchFn);
      const mockRequest = createMockRequest({
        actionId: 'test-action-id',
        query: {
          agentIds: Array(20000)
            .fill(null)
            .map((_, i) => `agent-${i}`)
            .join(','),
          totalAgents: 20000,
        },
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(mockContext, mockRequest, mockResponse);

      const responseBody = (mockResponse.ok as jest.Mock).mock.calls[0][0].body;

      expect(responseBody.aggregations).toEqual({
        totalRowCount: 75000,
        totalResponded: 15000, // 10000 Fleet + 5000 inferred
        successful: 14500, // 9500 Fleet + 5000 inferred
        failed: 500,
        pending: 5000, // 20000 - 15000
      });
    });

    it('should handle edge case where results exist but no Fleet responses', async () => {
      const mockActionResults: ActionResultsStrategyResponse = {
        edges: [],
        total: 0,
        rawResponse: {
          aggregations: {
            aggs: {
              responses_by_action_id: {
                doc_count: 0,
                rows_count: { value: 0 },
                responses: { buckets: [] },
                unique_agent_ids: { buckets: [] },
              },
            },
          },
        },
        inspect: { dsl: [] },
        resultsAgentBuckets: [
          { key: 'agent-1', doc_count: 100 },
          { key: 'agent-2', doc_count: 200 },
          { key: 'agent-3', doc_count: 150 },
        ],
        resultsTotalDocs: 450,
      } as unknown as ActionResultsStrategyResponse;

      const mockSearchFn = createMockSearchStrategy(mockActionResults);
      const mockContext = createMockContext(mockSearchFn);
      const mockRequest = createMockRequest({
        actionId: 'test-action-id',
        query: {
          agentIds: 'agent-1,agent-2,agent-3',
          totalAgents: 3,
        },
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(mockContext, mockRequest, mockResponse);

      const responseBody = (mockResponse.ok as jest.Mock).mock.calls[0][0].body;

      expect(responseBody.aggregations).toEqual({
        totalRowCount: 450,
        totalResponded: 3, // All inferred
        successful: 3,
        failed: 0,
        pending: 0,
      });

      expect(responseBody.edges).toHaveLength(3);
      expect(responseBody.edges.every((e: any) => e._id.startsWith('placeholder-'))).toBe(true);
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import { coreMock, httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';
import type { RequestHandler } from '@kbn/core/server';
import type { DataRequestHandlerContext } from '@kbn/data-plugin/server';
import type { IScopedSearchClient } from '@kbn/data-plugin/server';
import { API_VERSIONS, DEFAULT_MAX_TABLE_QUERY_SIZE } from '../../../common/constants';
import { Direction, OsqueryQueries } from '../../../common/search_strategy';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { getScheduledActionResultsRoute } from './get_scheduled_action_results_route';

const ROUTE_PATH = '/api/osquery/scheduled_results/{scheduleId}/{executionCount}';

const createMockRouter = () => {
  const httpService = httpServiceMock.createSetupContract();

  return httpService.createRouter();
};

const createMockScheduledResponse = ({
  edges = [],
  total = 0,
  successCount = 0,
  errorCount = 0,
  rowsCount = 0,
  timestamp = '2026-03-11T12:00:00.000Z',
  packId = 'pack-1',
}: {
  edges?: Array<Record<string, unknown>>;
  total?: number;
  successCount?: number;
  errorCount?: number;
  rowsCount?: number;
  timestamp?: string;
  packId?: string;
} = {}) => ({
  edges,
  rawResponse: {
    hits: {
      total: { value: total, relation: 'eq' },
      hits: [
        {
          fields: {
            '@timestamp': [timestamp],
            pack_id: [packId],
          },
        },
      ],
    },
    aggregations: {
      aggs: {
        responses_by_schedule: {
          rows_count: { value: rowsCount },
          responses: {
            buckets: [
              { key: 'success', doc_count: successCount },
              { key: 'error', doc_count: errorCount },
            ],
          },
        },
      },
    },
  },
  inspect: { dsl: [] },
});

const createMockContext = (
  mockSearchFn: jest.Mock,
  soClientOverrides?: Record<string, jest.Mock>
) => {
  const mockCoreContext = coreMock.createRequestHandlerContext();

  if (soClientOverrides) {
    Object.assign(mockCoreContext.savedObjects.client, soClientOverrides);
  }

  return {
    core: Promise.resolve(mockCoreContext),
    search: Promise.resolve({
      search: mockSearchFn,
      saveSession: jest.fn(),
      getSession: jest.fn(),
      findSessions: jest.fn(),
      updateSession: jest.fn(),
      cancelSession: jest.fn(),
      deleteSession: jest.fn(),
      extendSession: jest.fn(),
      getSessionStatus: jest.fn(),
    } as unknown as IScopedSearchClient),
  } as unknown as DataRequestHandlerContext;
};

describe('getScheduledActionResultsRoute', () => {
  let routeHandler: RequestHandler;

  const expectedSearchOptions = {
    abortSignal: expect.any(AbortSignal),
    strategy: 'osquerySearchStrategy',
  };

  const registerRoute = (osqueryContext: OsqueryAppContext) => {
    const mockRouter = createMockRouter();
    getScheduledActionResultsRoute(mockRouter, osqueryContext);

    const route = mockRouter.versioned.getRoute('get', ROUTE_PATH);
    const routeVersion = route.versions[API_VERSIONS.public.v1];
    if (!routeVersion) {
      throw new Error(`Handler for version [${API_VERSIONS.public.v1}] not found!`);
    }

    routeHandler = routeVersion.handler;
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('happy path', () => {
    it('should call search strategy with correct params and return structured response', async () => {
      const mockSearchFn = jest.fn().mockReturnValue(
        of(
          createMockScheduledResponse({
            edges: [{ _id: 'hit-1' }],
            total: 1,
            successCount: 1,
            errorCount: 0,
            rowsCount: 42,
          })
        )
      );

      const mockOsqueryContext = {
        service: {
          getActiveSpace: jest.fn().mockResolvedValue({ id: 'space-a' }),
        },
      } as unknown as OsqueryAppContext;

      const soGet = jest.fn().mockResolvedValue({
        attributes: {
          name: 'My Pack',
          queries: [
            { schedule_id: 'sched-1', name: 'uptime_query', query: 'SELECT * FROM uptime;' },
          ],
        },
      });

      registerRoute(mockOsqueryContext);

      const mockRequest = httpServerMock.createKibanaRequest({
        params: { scheduleId: 'sched-1', executionCount: 5 },
        query: {},
      });
      const mockResponse = httpServerMock.createResponseFactory();
      const mockContext = createMockContext(mockSearchFn, { get: soGet });

      await routeHandler(mockContext as any, mockRequest, mockResponse);

      expect(mockSearchFn).toHaveBeenCalledWith(
        expect.objectContaining({
          scheduleId: 'sched-1',
          executionCount: 5,
          spaceId: 'space-a',
          factoryQueryType: OsqueryQueries.scheduledActionResults,
        }),
        expectedSearchOptions
      );

      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: expect.objectContaining({
          metadata: expect.objectContaining({
            scheduleId: 'sched-1',
            executionCount: 5,
            packName: 'My Pack',
            queryName: 'uptime_query',
            queryText: 'SELECT * FROM uptime;',
          }),
          total: 1,
          aggregations: {
            totalRowCount: 42,
            totalResponded: 1,
            successful: 1,
            failed: 0,
            pending: 0,
          },
        }),
      });
    });
  });

  describe('space ID resolution', () => {
    it('should pass resolved space ID to search strategy', async () => {
      const mockSearchFn = jest
        .fn()
        .mockReturnValue(of(createMockScheduledResponse({ packId: '' })));

      const mockOsqueryContext = {
        service: {
          getActiveSpace: jest.fn().mockResolvedValue({ id: 'custom-space' }),
        },
      } as unknown as OsqueryAppContext;

      registerRoute(mockOsqueryContext);

      const mockRequest = httpServerMock.createKibanaRequest({
        params: { scheduleId: 'sched-1', executionCount: 1 },
        query: {},
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(createMockContext(mockSearchFn) as any, mockRequest, mockResponse);

      expect(mockSearchFn).toHaveBeenCalledWith(
        expect.objectContaining({ spaceId: 'custom-space' }),
        expectedSearchOptions
      );
    });

    it('should fall back to default space when getActiveSpace is absent', async () => {
      const mockSearchFn = jest
        .fn()
        .mockReturnValue(of(createMockScheduledResponse({ packId: '' })));

      const mockOsqueryContext = {
        service: {},
      } as unknown as OsqueryAppContext;

      registerRoute(mockOsqueryContext);

      const mockRequest = httpServerMock.createKibanaRequest({
        params: { scheduleId: 'sched-1', executionCount: 1 },
        query: {},
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(createMockContext(mockSearchFn) as any, mockRequest, mockResponse);

      expect(mockSearchFn).toHaveBeenCalledWith(
        expect.objectContaining({ spaceId: 'default' }),
        expectedSearchOptions
      );
    });
  });

  describe('aggregation extraction', () => {
    it('should correctly extract success, failure, and row counts from nested aggregations', async () => {
      const mockSearchFn = jest.fn().mockReturnValue(
        of(
          createMockScheduledResponse({
            total: 5,
            successCount: 3,
            errorCount: 2,
            rowsCount: 150,
            packId: '',
          })
        )
      );

      const mockOsqueryContext = {
        service: {
          getActiveSpace: jest.fn().mockResolvedValue({ id: 'default' }),
        },
      } as unknown as OsqueryAppContext;

      registerRoute(mockOsqueryContext);

      const mockRequest = httpServerMock.createKibanaRequest({
        params: { scheduleId: 'sched-1', executionCount: 10 },
        query: {},
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(createMockContext(mockSearchFn) as any, mockRequest, mockResponse);

      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: expect.objectContaining({
          aggregations: {
            totalRowCount: 150,
            totalResponded: 5,
            successful: 3,
            failed: 2,
            pending: 0,
          },
        }),
      });
    });

    it('should default to zeros when aggregations are missing', async () => {
      const mockSearchFn = jest.fn().mockReturnValue(
        of({
          edges: [],
          rawResponse: {
            hits: { total: { value: 0 }, hits: [] },
            aggregations: undefined,
          },
          inspect: { dsl: [] },
        })
      );

      const mockOsqueryContext = {
        service: {
          getActiveSpace: jest.fn().mockResolvedValue({ id: 'default' }),
        },
      } as unknown as OsqueryAppContext;

      registerRoute(mockOsqueryContext);

      const mockRequest = httpServerMock.createKibanaRequest({
        params: { scheduleId: 'sched-1', executionCount: 1 },
        query: {},
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(createMockContext(mockSearchFn) as any, mockRequest, mockResponse);

      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: expect.objectContaining({
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
  });

  describe('pack lookup', () => {
    it('should resolve pack name, query name, and query text from saved objects', async () => {
      const mockSearchFn = jest
        .fn()
        .mockReturnValue(of(createMockScheduledResponse({ packId: 'pack-abc' })));

      const soGet = jest.fn().mockResolvedValue({
        attributes: {
          name: 'Security Pack',
          queries: [
            { schedule_id: 'sched-1', name: 'processes', query: 'SELECT * FROM processes;' },
            { schedule_id: 'sched-other', name: 'users', query: 'SELECT * FROM users;' },
          ],
        },
      });

      const mockOsqueryContext = {
        service: {
          getActiveSpace: jest.fn().mockResolvedValue({ id: 'default' }),
        },
      } as unknown as OsqueryAppContext;

      registerRoute(mockOsqueryContext);

      const mockRequest = httpServerMock.createKibanaRequest({
        params: { scheduleId: 'sched-1', executionCount: 1 },
        query: {},
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(
        createMockContext(mockSearchFn, { get: soGet }) as any,
        mockRequest,
        mockResponse
      );

      const responseBody = (mockResponse.ok as jest.Mock).mock.calls[0][0].body;
      expect(responseBody.metadata).toEqual(
        expect.objectContaining({
          packId: 'pack-abc',
          packName: 'Security Pack',
          queryName: 'processes',
          queryText: 'SELECT * FROM processes;',
        })
      );
    });

    it('should gracefully handle deleted pack', async () => {
      const mockSearchFn = jest
        .fn()
        .mockReturnValue(of(createMockScheduledResponse({ packId: 'deleted-pack' })));

      const soGet = jest.fn().mockRejectedValue(new Error('Saved object not found'));

      const mockOsqueryContext = {
        service: {
          getActiveSpace: jest.fn().mockResolvedValue({ id: 'default' }),
        },
      } as unknown as OsqueryAppContext;

      registerRoute(mockOsqueryContext);

      const mockRequest = httpServerMock.createKibanaRequest({
        params: { scheduleId: 'sched-1', executionCount: 1 },
        query: {},
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(
        createMockContext(mockSearchFn, { get: soGet }) as any,
        mockRequest,
        mockResponse
      );

      expect(mockResponse.ok).toHaveBeenCalled();
      const responseBody = (mockResponse.ok as jest.Mock).mock.calls[0][0].body;
      expect(responseBody.metadata).toEqual(
        expect.objectContaining({
          packName: '',
          queryName: '',
          queryText: '',
        })
      );
    });

    it('should skip pack lookup when packId is empty', async () => {
      const mockSearchFn = jest
        .fn()
        .mockReturnValue(of(createMockScheduledResponse({ packId: '' })));

      const soGet = jest.fn();

      const mockOsqueryContext = {
        service: {
          getActiveSpace: jest.fn().mockResolvedValue({ id: 'default' }),
        },
      } as unknown as OsqueryAppContext;

      registerRoute(mockOsqueryContext);

      const mockRequest = httpServerMock.createKibanaRequest({
        params: { scheduleId: 'sched-1', executionCount: 1 },
        query: {},
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(
        createMockContext(mockSearchFn, { get: soGet }) as any,
        mockRequest,
        mockResponse
      );

      expect(soGet).not.toHaveBeenCalled();
      expect(mockResponse.ok).toHaveBeenCalled();
    });
  });

  describe('pagination and sorting', () => {
    it('should use default values when query params are not provided', async () => {
      const mockSearchFn = jest
        .fn()
        .mockReturnValue(of(createMockScheduledResponse({ packId: '' })));

      const mockOsqueryContext = {
        service: {
          getActiveSpace: jest.fn().mockResolvedValue({ id: 'default' }),
        },
      } as unknown as OsqueryAppContext;

      registerRoute(mockOsqueryContext);

      const mockRequest = httpServerMock.createKibanaRequest({
        params: { scheduleId: 'sched-1', executionCount: 1 },
        query: {},
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(createMockContext(mockSearchFn) as any, mockRequest, mockResponse);

      expect(mockSearchFn).toHaveBeenCalledWith(
        expect.objectContaining({
          sort: { direction: Direction.desc, field: '@timestamp' },
        }),
        expectedSearchOptions
      );

      const responseBody = (mockResponse.ok as jest.Mock).mock.calls[0][0].body;
      expect(responseBody.currentPage).toBe(0);
      expect(responseBody.pageSize).toBe(20);
    });

    it('should forward custom pagination and sorting params', async () => {
      const mockSearchFn = jest.fn().mockReturnValue(
        of(
          createMockScheduledResponse({
            total: 100,
            packId: '',
          })
        )
      );

      const mockOsqueryContext = {
        service: {
          getActiveSpace: jest.fn().mockResolvedValue({ id: 'default' }),
        },
      } as unknown as OsqueryAppContext;

      registerRoute(mockOsqueryContext);

      const mockRequest = httpServerMock.createKibanaRequest({
        params: { scheduleId: 'sched-1', executionCount: 1 },
        query: { page: 2, pageSize: 50, sort: 'agent.id', sortOrder: 'asc' },
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(createMockContext(mockSearchFn) as any, mockRequest, mockResponse);

      expect(mockSearchFn).toHaveBeenCalledWith(
        expect.objectContaining({
          sort: { direction: 'asc', field: 'agent.id' },
        }),
        expectedSearchOptions
      );

      const responseBody = (mockResponse.ok as jest.Mock).mock.calls[0][0].body;
      expect(responseBody.currentPage).toBe(2);
      expect(responseBody.pageSize).toBe(50);
      expect(responseBody.totalPages).toBe(2);
    });
  });

  describe('pagination limit', () => {
    it('should return bad request when pagination exceeds limit', async () => {
      const mockOsqueryContext = {
        service: {
          getActiveSpace: jest.fn().mockResolvedValue({ id: 'default' }),
        },
      } as unknown as OsqueryAppContext;

      registerRoute(mockOsqueryContext);

      const mockRequest = httpServerMock.createKibanaRequest({
        params: { scheduleId: 'sched-1', executionCount: 1 },
        query: {
          page: 1,
          pageSize: DEFAULT_MAX_TABLE_QUERY_SIZE,
        },
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler({} as any, mockRequest, mockResponse);

      expect(mockResponse.badRequest).toHaveBeenCalledWith({
        body: expect.objectContaining({
          message: expect.stringContaining('Cannot paginate beyond'),
          attributes: { code: 'PAGINATION_LIMIT_EXCEEDED' },
        }),
      });
    });
  });

  describe('error handling', () => {
    it('should return 500 when search strategy throws', async () => {
      const mockSearchFn = jest.fn().mockImplementation(() => {
        throw new Error('Elasticsearch connection failed');
      });

      const mockOsqueryContext = {
        service: {
          getActiveSpace: jest.fn().mockResolvedValue({ id: 'default' }),
        },
      } as unknown as OsqueryAppContext;

      registerRoute(mockOsqueryContext);

      const mockRequest = httpServerMock.createKibanaRequest({
        params: { scheduleId: 'sched-1', executionCount: 1 },
        query: {},
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(createMockContext(mockSearchFn) as any, mockRequest, mockResponse);

      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: { message: 'Elasticsearch connection failed' },
      });
    });
  });
});

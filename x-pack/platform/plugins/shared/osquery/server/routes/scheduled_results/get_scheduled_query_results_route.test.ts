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
import { OsqueryQueries } from '../../../common/search_strategy';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { getScheduledQueryResultsRoute } from './get_scheduled_query_results_route';

jest.mock('../../utils/get_internal_saved_object_client', () => ({
  createInternalSavedObjectsClientForSpaceId: jest.fn().mockResolvedValue({}),
}));

const ROUTE_PATH = '/api/osquery/scheduled_results/{scheduleId}/{executionCount}/results';

const createMockRouter = () => {
  const httpService = httpServiceMock.createSetupContract();

  return httpService.createRouter();
};

const createMockContext = (mockSearchFn: jest.Mock) => {
  const mockCoreContext = coreMock.createRequestHandlerContext();

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

describe('getScheduledQueryResultsRoute', () => {
  let routeHandler: RequestHandler;
  let mockOsqueryContext: OsqueryAppContext;

  const registerRoute = () => {
    const mockRouter = createMockRouter();
    getScheduledQueryResultsRoute(mockRouter, mockOsqueryContext);

    const route = mockRouter.versioned.getRoute('get', ROUTE_PATH);
    const routeVersion = route.versions[API_VERSIONS.public.v1];
    if (!routeVersion) {
      throw new Error(`Handler for version [${API_VERSIONS.public.v1}] not found!`);
    }

    routeHandler = routeVersion.handler;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockOsqueryContext = {
      service: {
        getIntegrationNamespaces: jest.fn().mockResolvedValue({}),
      },
      logFactory: { get: jest.fn() },
    } as unknown as OsqueryAppContext;
  });

  it('should return bad request when pagination exceeds limit', async () => {
    registerRoute();

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

  it('should pass scheduleId and executionCount to search strategy', async () => {
    const mockResultsResponse = {
      edges: [{ _id: 'row-1' }],
      rawResponse: { hits: { total: 1 } },
      inspect: { dsl: [] },
    };

    const mockSearchFn = jest.fn().mockReturnValue(of(mockResultsResponse));

    registerRoute();

    const mockRequest = httpServerMock.createKibanaRequest({
      params: { scheduleId: 'sched-uuid-123', executionCount: 7 },
      query: {},
    });
    const mockResponse = httpServerMock.createResponseFactory();

    await routeHandler(createMockContext(mockSearchFn) as any, mockRequest, mockResponse);

    expect(mockSearchFn).toHaveBeenCalledWith(
      expect.objectContaining({
        actionId: 'sched-uuid-123',
        scheduleId: 'sched-uuid-123',
        executionCount: 7,
        factoryQueryType: OsqueryQueries.results,
      }),
      expect.objectContaining({ strategy: 'osquerySearchStrategy' })
    );

    expect(mockResponse.ok).toHaveBeenCalledWith({
      body: { data: mockResultsResponse },
    });
  });

  it('should return 500 when search strategy throws', async () => {
    const mockSearchFn = jest.fn().mockImplementation(() => {
      throw new Error('ES unavailable');
    });

    registerRoute();

    const mockRequest = httpServerMock.createKibanaRequest({
      params: { scheduleId: 'sched-1', executionCount: 1 },
      query: {},
    });
    const mockResponse = httpServerMock.createResponseFactory();

    await routeHandler(createMockContext(mockSearchFn) as any, mockRequest, mockResponse);

    expect(mockResponse.customError).toHaveBeenCalledWith({
      statusCode: 500,
      body: { message: 'ES unavailable' },
    });
  });
});

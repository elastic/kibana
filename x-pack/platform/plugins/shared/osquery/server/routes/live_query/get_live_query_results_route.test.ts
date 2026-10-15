/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of, throwError } from 'rxjs';
import { httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';
import type { RequestHandler } from '@kbn/core/server';
import { API_VERSIONS, DEFAULT_MAX_TABLE_QUERY_SIZE } from '../../../common/constants';
import { OsqueryQueries } from '../../../common/search_strategy';
import { OSQUERY_SEARCH_STRATEGY } from '../../search_strategy/constants';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { getLiveQueryResultsRoute } from './get_live_query_results_route';
import { getActionResponses } from './utils';

jest.mock('./utils', () => ({
  getActionResponses: jest.fn(),
}));

describe('getLiveQueryResultsRoute', () => {
  let routeHandler: RequestHandler;
  let mockOsqueryContext: OsqueryAppContext;

  const createMockRouter = () => {
    const httpService = httpServiceMock.createSetupContract();

    return httpService.createRouter();
  };

  const getRouteHandler = () => {
    const mockRouter = createMockRouter();
    getLiveQueryResultsRoute(mockRouter, mockOsqueryContext);

    const route = mockRouter.versioned.getRoute(
      'get',
      '/api/osquery/live_queries/{id}/results/{actionId}'
    );
    const routeVersion = route.versions[API_VERSIONS.public.v1];
    if (!routeVersion) {
      throw new Error(`Handler for version [${API_VERSIONS.public.v1}] not found!`);
    }

    return routeVersion.handler;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockOsqueryContext = {
      service: {},
      logFactory: { get: jest.fn() },
    } as unknown as OsqueryAppContext;
  });

  it('returns bad request when pagination exceeds limit', async () => {
    routeHandler = getRouteHandler();

    const mockRequest = httpServerMock.createKibanaRequest({
      params: { id: 'action-1', actionId: 'action-1' },
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

  it('runs the action-details and results searches against the osquery search strategy', async () => {
    (getActionResponses as jest.Mock).mockReturnValue(of({}));

    const searchFn = jest
      .fn()
      .mockReturnValueOnce(
        of({
          actionDetails: {
            _source: { queries: [{ action_id: 'query-1', agents: ['agent-1'] }] },
          },
        })
      )
      .mockReturnValueOnce(of({ edges: [] }));

    const context = {
      search: Promise.resolve({ search: searchFn }),
    };

    routeHandler = getRouteHandler();

    const mockRequest = httpServerMock.createKibanaRequest({
      params: { id: 'action-1', actionId: 'action-1' },
      query: {},
    });
    const mockResponse = httpServerMock.createResponseFactory();

    await routeHandler(context as any, mockRequest, mockResponse);

    expect(searchFn).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ factoryQueryType: OsqueryQueries.actionDetails }),
      expect.objectContaining({ strategy: OSQUERY_SEARCH_STRATEGY })
    );
    expect(searchFn).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ factoryQueryType: OsqueryQueries.results }),
      expect.objectContaining({ strategy: OSQUERY_SEARCH_STRATEGY })
    );
    expect(mockResponse.ok).toHaveBeenCalled();
  });

  it('returns not found when the parent action is missing in the active space', async () => {
    const searchFn = jest.fn().mockReturnValueOnce(of({ actionDetails: undefined }));

    routeHandler = getRouteHandler();

    const mockResponse = httpServerMock.createResponseFactory();

    await routeHandler(
      { search: Promise.resolve({ search: searchFn }) } as any,
      httpServerMock.createKibanaRequest({
        params: { id: 'other-space-action', actionId: 'query-1' },
        query: {},
      }),
      mockResponse
    );

    expect(mockResponse.notFound).toHaveBeenCalledWith({ body: { message: 'Action not found' } });
    expect(searchFn).toHaveBeenCalledTimes(1);
  });

  it('keys the results read on the sub-action id and surfaces a strategy 404', async () => {
    (getActionResponses as jest.Mock).mockReturnValue(of({}));

    const searchFn = jest
      .fn()
      .mockReturnValueOnce(
        of({
          actionDetails: {
            _source: { queries: [{ action_id: 'query-1', agents: ['agent-1'] }] },
          },
        })
      )
      .mockReturnValueOnce(
        throwError(() => Object.assign(new Error('Action not found'), { statusCode: 404 }))
      );

    routeHandler = getRouteHandler();

    const mockResponse = httpServerMock.createResponseFactory();

    await routeHandler(
      { search: Promise.resolve({ search: searchFn }) } as any,
      httpServerMock.createKibanaRequest({
        params: { id: 'action-1', actionId: 'query-1' },
        query: {},
      }),
      mockResponse
    );

    expect(searchFn).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ factoryQueryType: OsqueryQueries.results, actionId: 'query-1' }),
      expect.anything()
    );
    expect(mockResponse.customError).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 404 })
    );
  });
});

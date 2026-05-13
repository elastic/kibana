/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';
import type { RequestHandler } from '@kbn/core/server';
import { API_VERSIONS, DEFAULT_MAX_TABLE_QUERY_SIZE } from '../../../common/constants';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { getLiveQueryResultsRoute } from './get_live_query_results_route';

describe('getLiveQueryResultsRoute', () => {
  let routeHandler: RequestHandler;
  let mockOsqueryContext: OsqueryAppContext;

  const createMockRouter = () => {
    const httpService = httpServiceMock.createSetupContract();

    return httpService.createRouter();
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockOsqueryContext = {
      service: {},
      logFactory: { get: jest.fn() },
    } as unknown as OsqueryAppContext;
  });

  it('returns bad request when pagination exceeds limit', async () => {
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

    routeHandler = routeVersion.handler;

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
});

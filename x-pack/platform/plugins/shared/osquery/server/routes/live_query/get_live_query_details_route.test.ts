/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import { coreMock, httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';
import type { RequestHandler } from '@kbn/core/server';
import { API_VERSIONS, OSQUERY_INTEGRATION_NAME } from '../../../common/constants';
import { OsqueryQueries } from '../../../common/search_strategy';
import { OSQUERY_SEARCH_STRATEGY } from '../../search_strategy/constants';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { getLiveQueryDetailsRoute } from './get_live_query_details_route';
import { getActionResponses } from './utils';

jest.mock('./utils', () => ({
  getActionResponses: jest.fn(),
}));

jest.mock('../../utils/get_internal_saved_object_client', () => ({
  createInternalSavedObjectsClientForSpaceId: jest.fn().mockResolvedValue({}),
}));

describe('getLiveQueryDetailsRoute', () => {
  let routeHandler: RequestHandler;
  let mockOsqueryContext: OsqueryAppContext;

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
      }),
    };
  };

  const getRouteHandler = (mockRouter: ReturnType<typeof createMockRouter>): RequestHandler => {
    const route = mockRouter.versioned.getRoute('get', '/api/osquery/live_queries/{id}');
    const routeVersion = route.versions[API_VERSIONS.public.v1];
    if (!routeVersion) {
      throw new Error(`Handler for version [${API_VERSIONS.public.v1}] not found!`);
    }

    return routeVersion.handler;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns action details with completed status', async () => {
    const mockSearchFn = jest.fn().mockReturnValue(
      of({
        actionDetails: {
          _source: {
            action_id: 'action-1',
            user_id: 'test-user',
            user_profile_uid: 'u_test-profile-uid',
            queries: [
              {
                action_id: 'query-1',
                query: 'select 1;',
                agents: ['agent-1'],
              },
            ],
          },
          fields: { expiration: [new Date(Date.now() + 60000).toISOString()] },
        },
      })
    );

    (getActionResponses as jest.Mock).mockReturnValue(
      of({
        action_id: 'query-1',
        pending: 0,
        responded: 1,
        successful: 1,
        failed: 0,
        docs: 1,
      })
    );

    mockOsqueryContext = {
      service: {
        getActiveSpace: jest.fn().mockResolvedValue({ id: 'space-a' }),
      },
      logFactory: { get: jest.fn().mockReturnValue({ debug: jest.fn() }) },
    } as unknown as OsqueryAppContext;

    const mockRouter = createMockRouter();
    getLiveQueryDetailsRoute(mockRouter, mockOsqueryContext);

    routeHandler = getRouteHandler(mockRouter);

    const mockRequest = httpServerMock.createKibanaRequest({
      params: { id: 'action-1' },
      query: {},
    });
    const mockResponse = httpServerMock.createResponseFactory();

    await routeHandler(createMockContext(mockSearchFn) as any, mockRequest, mockResponse);

    expect(mockSearchFn).toHaveBeenCalledWith(
      {
        actionId: 'action-1',
        factoryQueryType: OsqueryQueries.actionDetails,
        spaceId: 'space-a',
      },
      expect.objectContaining({ strategy: OSQUERY_SEARCH_STRATEGY })
    );

    expect(mockResponse.ok).toHaveBeenCalledWith({
      body: {
        data: expect.objectContaining({
          action_id: 'action-1',
          user_id: 'test-user',
          user_profile_uid: 'u_test-profile-uid',
          status: 'completed',
          queries: [
            expect.objectContaining({
              action_id: 'query-1',
              status: 'completed',
              pending: 0,
            }),
          ],
        }),
      },
    });
  });

  const setupActionDetailsSearch = () =>
    jest.fn().mockReturnValue(
      of({
        actionDetails: {
          _source: {
            action_id: 'action-1',
            queries: [{ action_id: 'query-1', query: 'select 1;', agents: ['agent-1'] }],
          },
          fields: { expiration: [new Date(Date.now() + 60000).toISOString()] },
        },
      })
    );

  const mockActionResponse = () =>
    (getActionResponses as jest.Mock).mockReturnValue(
      of({
        action_id: 'query-1',
        pending: 0,
        responded: 1,
        successful: 1,
        failed: 0,
        docs: 1,
      })
    );

  it('passes resolved integration namespaces to the counts query', async () => {
    const mockSearchFn = setupActionDetailsSearch();
    mockActionResponse();

    mockOsqueryContext = {
      service: {
        getActiveSpace: jest.fn().mockResolvedValue({ id: 'custom-space' }),
        getIntegrationNamespaces: jest
          .fn()
          .mockResolvedValue({ [OSQUERY_INTEGRATION_NAME]: ['team.a'] }),
      },
      logFactory: { get: jest.fn().mockReturnValue({ debug: jest.fn() }) },
    } as unknown as OsqueryAppContext;

    const mockRouter = createMockRouter();
    getLiveQueryDetailsRoute(mockRouter, mockOsqueryContext);
    routeHandler = getRouteHandler(mockRouter);

    const mockRequest = httpServerMock.createKibanaRequest({
      params: { id: 'action-1' },
      query: {},
    });
    const mockResponse = httpServerMock.createResponseFactory();

    await routeHandler(createMockContext(mockSearchFn) as any, mockRequest, mockResponse);

    expect(getActionResponses).toHaveBeenCalledWith(
      expect.anything(),
      'query-1',
      1,
      ['team.a'],
      'custom-space'
    );
  });

  it('passes undefined namespaces to the counts query when none are resolved', async () => {
    const mockSearchFn = setupActionDetailsSearch();
    mockActionResponse();

    mockOsqueryContext = {
      service: {
        getActiveSpace: jest.fn().mockResolvedValue({ id: 'custom-space' }),
        getIntegrationNamespaces: jest.fn().mockResolvedValue({ [OSQUERY_INTEGRATION_NAME]: [] }),
      },
      logFactory: { get: jest.fn().mockReturnValue({ debug: jest.fn() }) },
    } as unknown as OsqueryAppContext;

    const mockRouter = createMockRouter();
    getLiveQueryDetailsRoute(mockRouter, mockOsqueryContext);
    routeHandler = getRouteHandler(mockRouter);

    const mockRequest = httpServerMock.createKibanaRequest({
      params: { id: 'action-1' },
      query: {},
    });
    const mockResponse = httpServerMock.createResponseFactory();

    await routeHandler(createMockContext(mockSearchFn) as any, mockRequest, mockResponse);

    expect(getActionResponses).toHaveBeenCalledWith(
      expect.anything(),
      'query-1',
      1,
      undefined,
      'custom-space'
    );
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import { coreMock, httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';
import type { RequestHandler } from '@kbn/core/server';
import { API_VERSIONS } from '../../../common/constants';
import { OsqueryQueries } from '../../../common/search_strategy';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { getLiveQueryDetailsRoute } from './get_live_query_details_route';
import { getActionResponses } from './utils';

jest.mock('./utils', () => ({
  getActionResponses: jest.fn(),
}));

jest.mock('../../lib/get_result_counts_for_actions', () => ({
  getResultCountsForActions: jest.fn(),
}));

import { getResultCountsForActions } from '../../lib/get_result_counts_for_actions';

jest.mock('../../utils/ccs_utils', () => ({
  hasConnectedRemoteClusters: jest.fn().mockResolvedValue(false),
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const singleQueryActionDetails = () => ({
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
  });

  const packActionDetails = () => ({
    _source: {
      action_id: 'action-1',
      user_id: 'test-user',
      pack_id: 'pack-1',
      queries: [
        { action_id: 'query-1', query: 'select 1;', agents: ['agent-1'] },
        { action_id: 'query-2', query: 'select 2;', agents: ['agent-1'] },
      ],
    },
    fields: { expiration: [new Date(Date.now() + 60000).toISOString()] },
  });

  const setupRoute = (overrides?: Partial<OsqueryAppContext>) => {
    mockOsqueryContext = {
      service: {
        getActiveSpace: jest.fn().mockResolvedValue({ id: 'space-a' }),
      },
      getStartServices: jest
        .fn()
        .mockResolvedValue([{ elasticsearch: { client: { asInternalUser: {} } } }]),
      logFactory: { get: jest.fn().mockReturnValue({ warn: jest.fn() }) },
      experimentalFeatures: { resultCountsEnabled: true },
      ...overrides,
    } as unknown as OsqueryAppContext;

    const mockRouter = createMockRouter();
    getLiveQueryDetailsRoute(mockRouter, mockOsqueryContext);

    const route = mockRouter.versioned.getRoute('get', '/api/osquery/live_queries/{id}');
    const routeVersion = route.versions[API_VERSIONS.public.v1];
    if (!routeVersion) {
      throw new Error(`Handler for version [${API_VERSIONS.public.v1}] not found!`);
    }

    routeHandler = routeVersion.handler;
  };

  it('returns action details with completed status and result_counts', async () => {
    const mockSearchFn = jest
      .fn()
      .mockReturnValue(of({ actionDetails: singleQueryActionDetails() }));

    (getActionResponses as jest.Mock).mockReturnValue(
      of({ action_id: 'query-1', pending: 0, responded: 1, successful: 1, failed: 0, docs: 1 })
    );

    (getResultCountsForActions as jest.Mock).mockResolvedValue(
      new Map([
        ['query-1', { totalRows: 5, respondedAgents: 1, successfulAgents: 1, errorAgents: 0 }],
      ])
    );

    setupRoute();

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
      expect.any(Object)
    );

    expect(mockResponse.ok).toHaveBeenCalledWith({
      body: {
        data: expect.objectContaining({
          action_id: 'action-1',
          user_id: 'test-user',
          user_profile_uid: 'u_test-profile-uid',
          status: 'completed',
          result_counts: {
            total_rows: 5,
            responded_agents: 1,
            successful_agents: 1,
            error_agents: 0,
          },
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

  it('omits result_counts when resultCountsEnabled is false', async () => {
    const mockSearchFn = jest
      .fn()
      .mockReturnValue(of({ actionDetails: singleQueryActionDetails() }));

    (getActionResponses as jest.Mock).mockReturnValue(
      of({ action_id: 'query-1', pending: 0, responded: 1, successful: 1, failed: 0, docs: 1 })
    );

    setupRoute({ experimentalFeatures: { resultCountsEnabled: false } } as any);

    const mockRequest = httpServerMock.createKibanaRequest({
      params: { id: 'action-1' },
      query: {},
    });
    const mockResponse = httpServerMock.createResponseFactory();

    await routeHandler(createMockContext(mockSearchFn) as any, mockRequest, mockResponse);

    expect(getResultCountsForActions).not.toHaveBeenCalled();

    const body = (mockResponse.ok.mock.calls[0][0] as any).body;
    expect(body.data).not.toHaveProperty('result_counts');
  });

  it('returns pack result_counts for pack queries', async () => {
    const mockSearchFn = jest.fn().mockReturnValue(of({ actionDetails: packActionDetails() }));

    (getActionResponses as jest.Mock).mockImplementation((_search: any, actionId: string) =>
      of({ action_id: actionId, pending: 0, responded: 1, successful: 1, failed: 0, docs: 1 })
    );

    (getResultCountsForActions as jest.Mock).mockResolvedValue(
      new Map([
        ['query-1', { totalRows: 10, respondedAgents: 1, successfulAgents: 1, errorAgents: 0 }],
        ['query-2', { totalRows: 0, respondedAgents: 1, successfulAgents: 0, errorAgents: 1 }],
      ])
    );

    setupRoute();

    const mockRequest = httpServerMock.createKibanaRequest({
      params: { id: 'action-1' },
      query: {},
    });
    const mockResponse = httpServerMock.createResponseFactory();

    await routeHandler(createMockContext(mockSearchFn) as any, mockRequest, mockResponse);

    const body = (mockResponse.ok.mock.calls[0][0] as any).body;
    expect(body.data.result_counts).toEqual({
      total_rows: 10,
      queries_with_results: 1,
      queries_total: 2,
      successful_agents: 1,
      error_agents: 0,
    });
  });

  it('omits result_counts and logs warning when aggregation fails', async () => {
    const mockSearchFn = jest
      .fn()
      .mockReturnValue(of({ actionDetails: singleQueryActionDetails() }));

    (getActionResponses as jest.Mock).mockReturnValue(
      of({ action_id: 'query-1', pending: 0, responded: 1, successful: 1, failed: 0, docs: 1 })
    );

    (getResultCountsForActions as jest.Mock).mockRejectedValue(
      new Error('index_not_found_exception')
    );

    setupRoute();

    const mockRequest = httpServerMock.createKibanaRequest({
      params: { id: 'action-1' },
      query: {},
    });
    const mockResponse = httpServerMock.createResponseFactory();

    await routeHandler(createMockContext(mockSearchFn) as any, mockRequest, mockResponse);

    expect(mockResponse.ok).toHaveBeenCalled();
    const body = (mockResponse.ok.mock.calls[0][0] as any).body;
    expect(body.data).not.toHaveProperty('result_counts');

    const mockLoggerWarn = (mockOsqueryContext.logFactory.get as jest.Mock).mock.results[0].value
      .warn;
    expect(mockLoggerWarn).toHaveBeenCalledWith(
      expect.stringContaining('index_not_found_exception')
    );
  });
});

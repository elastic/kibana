/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';
import type { RequestHandler } from '@kbn/core/server';
import { API_VERSIONS } from '../../../common/constants';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { getHistoryUsersRoute } from './get_history_users_route';

describe('getHistoryUsersRoute', () => {
  let routeHandler: RequestHandler;
  let mockOsqueryContext: OsqueryAppContext;
  let mockEsClient: { search: jest.Mock; indices: { exists: jest.Mock } };

  beforeEach(() => {
    jest.clearAllMocks();

    mockEsClient = {
      search: jest.fn(),
      indices: { exists: jest.fn().mockResolvedValue(true) },
    };

    mockOsqueryContext = {
      service: {
        getActiveSpace: jest.fn().mockResolvedValue({ id: 'default' }),
      },
      getStartServices: jest
        .fn()
        .mockResolvedValue([{ elasticsearch: { client: { asInternalUser: mockEsClient } } }]),
    } as unknown as OsqueryAppContext;
  });

  const setupRoute = () => {
    const httpService = httpServiceMock.createSetupContract();
    const mockRouter = httpService.createRouter();
    getHistoryUsersRoute(mockRouter, mockOsqueryContext);

    const route = mockRouter.versioned.getRoute('get', '/internal/osquery/history/users');
    const routeVersion = route.versions[API_VERSIONS.internal.v1];
    if (!routeVersion) {
      throw new Error(`Handler for version [${API_VERSIONS.internal.v1}] not found!`);
    }

    routeHandler = routeVersion.handler;
  };

  it('returns unique users with profile UIDs from aggregation', async () => {
    mockEsClient.search.mockResolvedValue({
      aggregations: {
        unique_users: {
          buckets: [
            {
              key: 'alice',
              doc_count: 5,
              latest_profile_uid: { buckets: [{ key: 'uid-alice', doc_count: 5 }] },
            },
            {
              key: 'bob',
              doc_count: 3,
              latest_profile_uid: { buckets: [{ key: 'uid-bob', doc_count: 3 }] },
            },
          ],
        },
      },
    });

    setupRoute();

    const mockRequest = httpServerMock.createKibanaRequest({ query: {} });
    const mockResponse = httpServerMock.createResponseFactory();

    await routeHandler({} as any, mockRequest, mockResponse);

    expect(mockResponse.ok).toHaveBeenCalledWith({
      body: {
        data: [
          { user_id: 'alice', user_profile_uid: 'uid-alice' },
          { user_id: 'bob', user_profile_uid: 'uid-bob' },
        ],
      },
    });
  });

  it('handles users without profile UIDs', async () => {
    mockEsClient.search.mockResolvedValue({
      aggregations: {
        unique_users: {
          buckets: [
            {
              key: 'old-user',
              doc_count: 2,
              latest_profile_uid: { buckets: [] },
            },
          ],
        },
      },
    });

    setupRoute();

    const mockRequest = httpServerMock.createKibanaRequest({ query: {} });
    const mockResponse = httpServerMock.createResponseFactory();

    await routeHandler({} as any, mockRequest, mockResponse);

    expect(mockResponse.ok).toHaveBeenCalledWith({
      body: {
        data: [{ user_id: 'old-user', user_profile_uid: undefined }],
      },
    });
  });

  it('returns empty array when no aggregation results', async () => {
    mockEsClient.search.mockResolvedValue({ aggregations: {} });

    setupRoute();

    const mockRequest = httpServerMock.createKibanaRequest({ query: {} });
    const mockResponse = httpServerMock.createResponseFactory();

    await routeHandler({} as any, mockRequest, mockResponse);

    expect(mockResponse.ok).toHaveBeenCalledWith({
      body: { data: [] },
    });
  });

  it('applies wildcard filter when searchTerm is provided', async () => {
    mockEsClient.search.mockResolvedValue({ aggregations: { unique_users: { buckets: [] } } });

    setupRoute();

    const mockRequest = httpServerMock.createKibanaRequest({
      query: { searchTerm: 'ali' },
    });
    const mockResponse = httpServerMock.createResponseFactory();

    await routeHandler({} as any, mockRequest, mockResponse);

    const searchCall = mockEsClient.search.mock.calls[0][0];
    const filters = searchCall.query.bool.filter;

    expect(filters).toContainEqual({ wildcard: { user_id: '*ali*' } });
  });

  it('does not apply wildcard filter when searchTerm is empty', async () => {
    mockEsClient.search.mockResolvedValue({ aggregations: { unique_users: { buckets: [] } } });

    setupRoute();

    const mockRequest = httpServerMock.createKibanaRequest({ query: {} });
    const mockResponse = httpServerMock.createResponseFactory();

    await routeHandler({} as any, mockRequest, mockResponse);

    const searchCall = mockEsClient.search.mock.calls[0][0];
    const filters = searchCall.query.bool.filter;

    expect(filters).not.toContainEqual(expect.objectContaining({ wildcard: expect.anything() }));
  });

  it('applies correct space filter for default space', async () => {
    mockEsClient.search.mockResolvedValue({ aggregations: { unique_users: { buckets: [] } } });

    setupRoute();

    const mockRequest = httpServerMock.createKibanaRequest({ query: {} });
    const mockResponse = httpServerMock.createResponseFactory();

    await routeHandler({} as any, mockRequest, mockResponse);

    const searchCall = mockEsClient.search.mock.calls[0][0];
    const spaceFilter = searchCall.query.bool.filter[0];

    expect(spaceFilter).toEqual({
      bool: {
        should: [
          { term: { space_id: 'default' } },
          { bool: { must_not: { exists: { field: 'space_id' } } } },
        ],
      },
    });
  });

  it('applies correct space filter for custom space', async () => {
    (mockOsqueryContext.service.getActiveSpace as jest.Mock).mockResolvedValue({
      id: 'my-space',
    });

    mockEsClient.search.mockResolvedValue({ aggregations: { unique_users: { buckets: [] } } });

    setupRoute();

    const mockRequest = httpServerMock.createKibanaRequest({ query: {} });
    const mockResponse = httpServerMock.createResponseFactory();

    await routeHandler({} as any, mockRequest, mockResponse);

    const searchCall = mockEsClient.search.mock.calls[0][0];
    const spaceFilter = searchCall.query.bool.filter[0];

    expect(spaceFilter).toEqual({ term: { space_id: 'my-space' } });
  });

  it('returns error when ES search fails', async () => {
    mockEsClient.search.mockRejectedValue(
      Object.assign(new Error('index_not_found_exception'), { statusCode: 404 })
    );

    setupRoute();

    const mockRequest = httpServerMock.createKibanaRequest({ query: {} });
    const mockResponse = httpServerMock.createResponseFactory();

    await routeHandler({} as any, mockRequest, mockResponse);

    expect(mockResponse.customError).toHaveBeenCalledWith({
      statusCode: 404,
      body: { message: 'index_not_found_exception' },
    });
  });
});

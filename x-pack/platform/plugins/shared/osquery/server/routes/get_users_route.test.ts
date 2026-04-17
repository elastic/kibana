/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, httpServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { RequestHandler } from '@kbn/core/server';
import { API_VERSIONS } from '../../common/constants';
import type { OsqueryAppContext } from '../lib/osquery_app_context_services';
import { getPackUsersRoute } from './get_users_route';
import { createInternalSavedObjectsClientForSpaceId } from '../utils/get_internal_saved_object_client';

jest.mock('../utils/get_internal_saved_object_client', () => ({
  createInternalSavedObjectsClientForSpaceId: jest.fn(),
}));

const TEST_PATH = '/internal/osquery/packs/users';

describe('getPackUsersRoute', () => {
  let routeHandler: RequestHandler;
  let mockOsqueryContext: OsqueryAppContext;
  let mockSavedObjectsClient: { find: jest.Mock };

  const createMockRouter = () => {
    const httpService = httpServiceMock.createSetupContract();

    return httpService.createRouter();
  };

  const makeSO = (createdBy: string, profileUid?: string) => ({
    id: `so-${createdBy}`,
    attributes: {
      created_by: createdBy,
      ...(profileUid ? { created_by_profile_uid: profileUid } : {}),
    },
    references: [],
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockOsqueryContext = {
      logFactory: {
        get: jest.fn().mockReturnValue(loggingSystemMock.createLogger()),
      },
    } as unknown as OsqueryAppContext;

    mockSavedObjectsClient = {
      find: jest.fn().mockResolvedValue({
        saved_objects: [],
        total: 0,
        page: 1,
        per_page: 10000,
      }),
    };

    (createInternalSavedObjectsClientForSpaceId as jest.Mock).mockResolvedValue(
      mockSavedObjectsClient
    );
  });

  const setupRoute = () => {
    const mockRouter = createMockRouter();
    getPackUsersRoute(mockRouter, mockOsqueryContext);

    const route = mockRouter.versioned.getRoute('get', TEST_PATH);
    const routeVersion = route.versions[API_VERSIONS.internal.v1];
    if (!routeVersion) {
      throw new Error(`Handler for version [${API_VERSIONS.internal.v1}] not found!`);
    }

    routeHandler = routeVersion.handler;
  };

  it('returns unique users with profile UIDs', async () => {
    mockSavedObjectsClient.find.mockResolvedValue({
      saved_objects: [makeSO('alice', 'uid-alice'), makeSO('bob', 'uid-bob')],
      total: 2,
      page: 1,
      per_page: 10000,
    });

    setupRoute();

    const mockRequest = httpServerMock.createKibanaRequest();
    const mockResponse = httpServerMock.createResponseFactory();

    await routeHandler({} as never, mockRequest, mockResponse);

    expect(mockResponse.ok).toHaveBeenCalled();
    const body = mockResponse.ok.mock.calls[0][0]?.body as {
      data: Array<{ created_by: string; created_by_profile_uid?: string }>;
    };
    expect(body.data).toEqual([
      { created_by: 'alice', created_by_profile_uid: 'uid-alice' },
      { created_by: 'bob', created_by_profile_uid: 'uid-bob' },
    ]);
  });

  it('deduplicates users across multiple saved objects', async () => {
    mockSavedObjectsClient.find.mockResolvedValue({
      saved_objects: [
        makeSO('alice', 'uid-alice'),
        makeSO('alice', 'uid-alice'),
        makeSO('bob', 'uid-bob'),
      ],
      total: 3,
      page: 1,
      per_page: 10000,
    });

    setupRoute();

    const mockRequest = httpServerMock.createKibanaRequest();
    const mockResponse = httpServerMock.createResponseFactory();

    await routeHandler({} as never, mockRequest, mockResponse);

    const body = mockResponse.ok.mock.calls[0][0]?.body as {
      data: Array<{ created_by: string }>;
    };
    expect(body.data).toHaveLength(2);
    expect(body.data.map((d) => d.created_by)).toEqual(['alice', 'bob']);
  });

  it('handles users without profile UIDs', async () => {
    mockSavedObjectsClient.find.mockResolvedValue({
      saved_objects: [makeSO('legacy-user')],
      total: 1,
      page: 1,
      per_page: 10000,
    });

    setupRoute();

    const mockRequest = httpServerMock.createKibanaRequest();
    const mockResponse = httpServerMock.createResponseFactory();

    await routeHandler({} as never, mockRequest, mockResponse);

    const body = mockResponse.ok.mock.calls[0][0]?.body as {
      data: Array<{ created_by: string; created_by_profile_uid?: string }>;
    };
    expect(body.data).toEqual([{ created_by: 'legacy-user' }]);
  });

  it('skips saved objects without created_by', async () => {
    mockSavedObjectsClient.find.mockResolvedValue({
      saved_objects: [{ id: 'so-1', attributes: {}, references: [] }, makeSO('alice', 'uid-alice')],
      total: 2,
      page: 1,
      per_page: 10000,
    });

    setupRoute();

    const mockRequest = httpServerMock.createKibanaRequest();
    const mockResponse = httpServerMock.createResponseFactory();

    await routeHandler({} as never, mockRequest, mockResponse);

    const body = mockResponse.ok.mock.calls[0][0]?.body as {
      data: Array<{ created_by: string }>;
    };
    expect(body.data).toHaveLength(1);
    expect(body.data[0].created_by).toBe('alice');
  });

  it('returns empty data when no saved objects exist', async () => {
    setupRoute();

    const mockRequest = httpServerMock.createKibanaRequest();
    const mockResponse = httpServerMock.createResponseFactory();

    await routeHandler({} as never, mockRequest, mockResponse);

    const body = mockResponse.ok.mock.calls[0][0]?.body as {
      data: Array<{ created_by: string }>;
    };
    expect(body.data).toEqual([]);
  });

  it('fetches with correct SO type and fields', async () => {
    setupRoute();

    const mockRequest = httpServerMock.createKibanaRequest();
    const mockResponse = httpServerMock.createResponseFactory();

    await routeHandler({} as never, mockRequest, mockResponse);

    expect(mockSavedObjectsClient.find).toHaveBeenCalledWith({
      type: 'osquery-pack',
      fields: ['created_by', 'created_by_profile_uid'],
      perPage: 10000,
      page: 1,
    });
  });

  it('returns 500 on SO client error', async () => {
    mockSavedObjectsClient.find.mockRejectedValue(new Error('SO find failed'));

    setupRoute();

    const mockRequest = httpServerMock.createKibanaRequest();
    const mockResponse = httpServerMock.createResponseFactory();

    await routeHandler({} as never, mockRequest, mockResponse);

    expect(mockResponse.customError).toHaveBeenCalledWith({
      statusCode: 500,
      body: { message: 'Failed to fetch users' },
    });
  });
});

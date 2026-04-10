/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, httpServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { RequestHandler } from '@kbn/core/server';
import { API_VERSIONS } from '../../../common/constants';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { findSavedQueryRoute } from './find_saved_query_route';
import { createInternalSavedObjectsClientForSpaceId } from '../../utils/get_internal_saved_object_client';
import { getInstalledSavedQueriesMap } from './utils';

jest.mock('../../utils/get_internal_saved_object_client', () => ({
  createInternalSavedObjectsClientForSpaceId: jest.fn(),
}));

jest.mock('./utils', () => ({
  ...jest.requireActual('./utils'),
  getInstalledSavedQueriesMap: jest.fn().mockResolvedValue({}),
}));

describe('findSavedQueryRoute', () => {
  let routeHandler: RequestHandler;
  let mockOsqueryContext: OsqueryAppContext;
  let mockSavedObjectsClient: { find: jest.Mock };

  const createMockRouter = () => {
    const httpService = httpServiceMock.createSetupContract();

    return httpService.createRouter();
  };

  const makeSavedQuery = (overrides: Record<string, unknown> = {}) => ({
    id: 'sq-1',
    attributes: {
      id: 'test-query',
      description: 'A test query',
      query: 'SELECT 1;',
      interval: '3600',
      platform: 'linux',
      version: '1.0.0',
      created_at: '2025-01-01T00:00:00.000Z',
      created_by: 'elastic',
      created_by_profile_uid: 'uid-1',
      updated_at: '2025-01-01T00:00:00.000Z',
      updated_by: 'elastic',
      updated_by_profile_uid: 'uid-1',
      ...overrides,
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockOsqueryContext = {
      logFactory: {
        get: jest.fn().mockReturnValue(loggingSystemMock.createLogger()),
      },
      service: {
        getActiveSpace: jest.fn().mockResolvedValue({ id: 'default' }),
        getPackageService: jest.fn().mockReturnValue({ asInternalUser: {} }),
      },
    } as unknown as OsqueryAppContext;

    mockSavedObjectsClient = {
      find: jest.fn().mockResolvedValue({
        saved_objects: [],
        total: 0,
        page: 1,
        per_page: 20,
      }),
    };

    (createInternalSavedObjectsClientForSpaceId as jest.Mock).mockResolvedValue(
      mockSavedObjectsClient
    );
    (getInstalledSavedQueriesMap as jest.Mock).mockResolvedValue({});
  });

  const setupRoute = () => {
    const mockRouter = createMockRouter();
    findSavedQueryRoute(mockRouter, mockOsqueryContext);

    const route = mockRouter.versioned.getRoute('get', '/api/osquery/saved_queries');
    const routeVersion = route.versions[API_VERSIONS.public.v1];
    if (!routeVersion) {
      throw new Error(`Handler for version [${API_VERSIONS.public.v1}] not found!`);
    }

    routeHandler = routeVersion.handler;
  };

  it('returns saved queries with profile_uid fields in response', async () => {
    mockSavedObjectsClient.find.mockResolvedValue({
      saved_objects: [makeSavedQuery()],
      total: 1,
      page: 1,
      per_page: 20,
    });

    setupRoute();

    const mockRequest = httpServerMock.createKibanaRequest({ query: {} });
    const mockResponse = httpServerMock.createResponseFactory();

    await routeHandler({} as any, mockRequest, mockResponse);

    expect(mockResponse.ok).toHaveBeenCalled();
    const body = mockResponse.ok.mock.calls[0][0]?.body as any;
    expect(body.data[0].created_by_profile_uid).toBe('uid-1');
    expect(body.data[0].updated_by_profile_uid).toBe('uid-1');
  });

  it('builds KQL prefix filter on id, description, and query fields', async () => {
    setupRoute();

    const mockRequest = httpServerMock.createKibanaRequest({
      query: { search: 'windows' },
    });
    const mockResponse = httpServerMock.createResponseFactory();

    await routeHandler({} as any, mockRequest, mockResponse);

    const findArgs = mockSavedObjectsClient.find.mock.calls[0][0];
    expect(findArgs.search).toBeUndefined();
    expect(findArgs.filter).toContain('osquery-saved-query.attributes.id: *windows*');
    expect(findArgs.filter).toContain('osquery-saved-query.attributes.description: *windows*');
    expect(findArgs.filter).toContain('osquery-saved-query.attributes.query: *windows*');
  });

  it('does not pass filter when no search or createdBy provided', async () => {
    setupRoute();

    const mockRequest = httpServerMock.createKibanaRequest({ query: {} });
    const mockResponse = httpServerMock.createResponseFactory();

    await routeHandler({} as any, mockRequest, mockResponse);

    const findArgs = mockSavedObjectsClient.find.mock.calls[0][0];
    expect(findArgs.search).toBeUndefined();
    expect(findArgs.filter).toBeUndefined();
  });

  it('escapes special characters in search term with escapeKuery', async () => {
    setupRoute();

    const mockRequest = httpServerMock.createKibanaRequest({
      query: { search: 'test<script>' },
    });
    const mockResponse = httpServerMock.createResponseFactory();

    await routeHandler({} as any, mockRequest, mockResponse);

    const findArgs = mockSavedObjectsClient.find.mock.calls[0][0];
    expect(findArgs.filter).toContain('osquery-saved-query.attributes.id: *test\\<script\\>*');
    expect(findArgs.filter).toContain(
      'osquery-saved-query.attributes.description: *test\\<script\\>*'
    );
    expect(findArgs.filter).toContain('osquery-saved-query.attributes.query: *test\\<script\\>*');
  });

  it('builds createdBy filter for a single user', async () => {
    setupRoute();

    const mockRequest = httpServerMock.createKibanaRequest({
      query: { createdBy: 'elastic' },
    });
    const mockResponse = httpServerMock.createResponseFactory();

    await routeHandler({} as any, mockRequest, mockResponse);

    const findArgs = mockSavedObjectsClient.find.mock.calls[0][0];
    expect(findArgs.filter).toContain('osquery-saved-query.attributes.created_by: "elastic"');
  });

  it('builds createdBy filter with OR for multiple comma-separated users', async () => {
    setupRoute();

    const mockRequest = httpServerMock.createKibanaRequest({
      query: { createdBy: 'elastic,admin' },
    });
    const mockResponse = httpServerMock.createResponseFactory();

    await routeHandler({} as any, mockRequest, mockResponse);

    const findArgs = mockSavedObjectsClient.find.mock.calls[0][0];
    expect(findArgs.filter).toContain(
      '(osquery-saved-query.attributes.created_by: "elastic" OR osquery-saved-query.attributes.created_by: "admin")'
    );
  });

  it('combines search and createdBy — search via SO search, createdBy via filter', async () => {
    setupRoute();

    const mockRequest = httpServerMock.createKibanaRequest({
      query: { search: 'windows', createdBy: 'elastic' },
    });
    const mockResponse = httpServerMock.createResponseFactory();

    await routeHandler({} as any, mockRequest, mockResponse);

    const findArgs = mockSavedObjectsClient.find.mock.calls[0][0];
    expect(findArgs.filter).toContain('osquery-saved-query.attributes.id: *windows*');
    expect(findArgs.filter).toContain('osquery-saved-query.attributes.created_by: "elastic"');
    expect(findArgs.filter).toContain(' AND ');
  });

  it('returns null profile_uid for legacy saved queries', async () => {
    mockSavedObjectsClient.find.mockResolvedValue({
      saved_objects: [
        makeSavedQuery({
          created_by_profile_uid: undefined,
          updated_by_profile_uid: undefined,
        }),
      ],
      total: 1,
      page: 1,
      per_page: 20,
    });

    setupRoute();

    const mockRequest = httpServerMock.createKibanaRequest({ query: {} });
    const mockResponse = httpServerMock.createResponseFactory();

    await routeHandler({} as any, mockRequest, mockResponse);

    const body = mockResponse.ok.mock.calls[0][0]?.body as any;
    expect(body.data[0].created_by_profile_uid).toBeUndefined();
    expect(body.data[0].updated_by_profile_uid).toBeUndefined();
  });
});

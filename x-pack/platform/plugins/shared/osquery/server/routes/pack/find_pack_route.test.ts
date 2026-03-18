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
import { findPackRoute } from './find_pack_route';
import { createInternalSavedObjectsClientForSpaceId } from '../../utils/get_internal_saved_object_client';

jest.mock('../../utils/get_internal_saved_object_client', () => ({
  createInternalSavedObjectsClientForSpaceId: jest.fn(),
}));

describe('findPackRoute', () => {
  let routeHandler: RequestHandler;
  let mockOsqueryContext: OsqueryAppContext;
  let mockSavedObjectsClient: { find: jest.Mock };

  const createMockRouter = () => {
    const httpService = httpServiceMock.createSetupContract();

    return httpService.createRouter();
  };

  const makePack = (overrides: Record<string, unknown> = {}) => ({
    id: 'pack-1',
    attributes: {
      name: 'test-pack',
      description: 'A test pack',
      queries: {},
      version: 1,
      enabled: true,
      created_at: '2025-01-01T00:00:00.000Z',
      created_by: 'elastic',
      created_by_profile_uid: 'uid-1',
      updated_at: '2025-01-01T00:00:00.000Z',
      updated_by: 'elastic',
      updated_by_profile_uid: 'uid-1',
      ...overrides,
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
        per_page: 20,
      }),
    };

    (createInternalSavedObjectsClientForSpaceId as jest.Mock).mockResolvedValue(
      mockSavedObjectsClient
    );
  });

  const setupRoute = () => {
    const mockRouter = createMockRouter();
    findPackRoute(mockRouter, mockOsqueryContext);

    const route = mockRouter.versioned.getRoute('get', '/api/osquery/packs');
    const routeVersion = route.versions[API_VERSIONS.public.v1];
    if (!routeVersion) {
      throw new Error(`Handler for version [${API_VERSIONS.public.v1}] not found!`);
    }

    routeHandler = routeVersion.handler;
  };

  it('returns packs with profile_uid fields in response', async () => {
    mockSavedObjectsClient.find.mockResolvedValue({
      saved_objects: [makePack()],
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

  it('passes search and searchFields to SO client when search param provided', async () => {
    setupRoute();

    const mockRequest = httpServerMock.createKibanaRequest({
      query: { search: 'monitoring' },
    });
    const mockResponse = httpServerMock.createResponseFactory();

    await routeHandler({} as any, mockRequest, mockResponse);

    const findArgs = mockSavedObjectsClient.find.mock.calls[0][0];
    expect(findArgs.search).toBe('monitoring');
    expect(findArgs.searchFields).toEqual(['name']);
  });

  it('does not pass search or searchFields when search param is absent', async () => {
    setupRoute();

    const mockRequest = httpServerMock.createKibanaRequest({ query: {} });
    const mockResponse = httpServerMock.createResponseFactory();

    await routeHandler({} as any, mockRequest, mockResponse);

    const findArgs = mockSavedObjectsClient.find.mock.calls[0][0];
    expect(findArgs.search).toBeUndefined();
    expect(findArgs.searchFields).toBeUndefined();
  });

  it('builds enabled filter when enabled param is "true"', async () => {
    setupRoute();

    const mockRequest = httpServerMock.createKibanaRequest({
      query: { enabled: 'true' },
    });
    const mockResponse = httpServerMock.createResponseFactory();

    await routeHandler({} as any, mockRequest, mockResponse);

    const findArgs = mockSavedObjectsClient.find.mock.calls[0][0];
    expect(findArgs.filter).toContain('osquery-pack.attributes.enabled: true');
  });

  it('builds enabled filter when enabled param is "false"', async () => {
    setupRoute();

    const mockRequest = httpServerMock.createKibanaRequest({
      query: { enabled: 'false' },
    });
    const mockResponse = httpServerMock.createResponseFactory();

    await routeHandler({} as any, mockRequest, mockResponse);

    const findArgs = mockSavedObjectsClient.find.mock.calls[0][0];
    expect(findArgs.filter).toContain('osquery-pack.attributes.enabled: false');
  });

  it('builds createdBy filter for a single user', async () => {
    setupRoute();

    const mockRequest = httpServerMock.createKibanaRequest({
      query: { createdBy: 'elastic' },
    });
    const mockResponse = httpServerMock.createResponseFactory();

    await routeHandler({} as any, mockRequest, mockResponse);

    const findArgs = mockSavedObjectsClient.find.mock.calls[0][0];
    expect(findArgs.filter).toContain('osquery-pack.attributes.created_by: "elastic"');
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
      '(osquery-pack.attributes.created_by: "elastic" OR osquery-pack.attributes.created_by: "admin")'
    );
  });

  it('combines enabled and createdBy filters with AND', async () => {
    setupRoute();

    const mockRequest = httpServerMock.createKibanaRequest({
      query: { enabled: 'true', createdBy: 'elastic' },
    });
    const mockResponse = httpServerMock.createResponseFactory();

    await routeHandler({} as any, mockRequest, mockResponse);

    const findArgs = mockSavedObjectsClient.find.mock.calls[0][0];
    expect(findArgs.filter).toContain('osquery-pack.attributes.enabled: true');
    expect(findArgs.filter).toContain('osquery-pack.attributes.created_by: "elastic"');
    expect(findArgs.filter).toContain(' AND ');
  });

  it('uses default pagination when no page/pageSize provided', async () => {
    setupRoute();

    const mockRequest = httpServerMock.createKibanaRequest({ query: {} });
    const mockResponse = httpServerMock.createResponseFactory();

    await routeHandler({} as any, mockRequest, mockResponse);

    const findArgs = mockSavedObjectsClient.find.mock.calls[0][0];
    expect(findArgs.page).toBe(1);
    expect(findArgs.perPage).toBe(20);
    expect(findArgs.sortField).toBe('updated_at');
    expect(findArgs.sortOrder).toBe('desc');
  });

  it('passes custom pagination and sort params', async () => {
    setupRoute();

    const mockRequest = httpServerMock.createKibanaRequest({
      query: { page: 2, pageSize: 10, sort: 'created_at', sortOrder: 'asc' },
    });
    const mockResponse = httpServerMock.createResponseFactory();

    await routeHandler({} as any, mockRequest, mockResponse);

    const findArgs = mockSavedObjectsClient.find.mock.calls[0][0];
    expect(findArgs.page).toBe(2);
    expect(findArgs.perPage).toBe(10);
    expect(findArgs.sortField).toBe('created_at');
    expect(findArgs.sortOrder).toBe('asc');
  });

  it('does not pass filter when no filter params provided', async () => {
    setupRoute();

    const mockRequest = httpServerMock.createKibanaRequest({ query: {} });
    const mockResponse = httpServerMock.createResponseFactory();

    await routeHandler({} as any, mockRequest, mockResponse);

    const findArgs = mockSavedObjectsClient.find.mock.calls[0][0];
    expect(findArgs.filter).toBeUndefined();
  });
});

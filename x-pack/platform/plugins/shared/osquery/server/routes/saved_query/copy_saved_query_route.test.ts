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
import { copySavedQueryRoute } from './copy_saved_query_route';
import { createInternalSavedObjectsClientForSpaceId } from '../../utils/get_internal_saved_object_client';
import { getUserInfo } from '../../lib/get_user_info';

jest.mock('../../utils/get_internal_saved_object_client', () => ({
  createInternalSavedObjectsClientForSpaceId: jest.fn(),
}));

jest.mock('../../lib/get_user_info', () => ({
  getUserInfo: jest.fn(),
}));

describe('copySavedQueryRoute', () => {
  let routeHandler: RequestHandler;
  let mockOsqueryContext: OsqueryAppContext;

  const createMockRouter = () => {
    const httpService = httpServiceMock.createSetupContract();

    return httpService.createRouter();
  };

  const sourceSavedQuery = {
    id: 'source-so-id',
    attributes: {
      id: 'my-query',
      description: 'Test query',
      query: 'select 1;',
      interval: 3600,
      platform: 'linux',
      version: '1.0.0',
      ecs_mapping: [{ key: 'host.name', value: { field: 'hostname' } }],
      snapshot: true,
      removed: false,
      timeout: 60,
      created_at: '2025-01-01T00:00:00.000Z',
      created_by: 'admin',
      updated_at: '2025-01-01T00:00:00.000Z',
      updated_by: 'admin',
      prebuilt: true,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockOsqueryContext = {
      logFactory: {
        get: jest.fn().mockReturnValue(loggingSystemMock.createLogger()),
      },
      security: {},
    } as unknown as OsqueryAppContext;
  });

  const setupRoute = () => {
    const mockRouter = createMockRouter();
    copySavedQueryRoute(mockRouter, mockOsqueryContext);

    const route = mockRouter.versioned.getRoute('post', '/api/osquery/saved_queries/{id}/copy');
    const routeVersion = route.versions[API_VERSIONS.public.v1];
    if (!routeVersion) {
      throw new Error(`Handler for version [${API_VERSIONS.public.v1}] not found!`);
    }

    routeHandler = routeVersion.handler;
  };

  it('successfully copies a saved query with all fields', async () => {
    const mockSavedObjectsClient = {
      get: jest.fn().mockResolvedValue(sourceSavedQuery),
      find: jest.fn().mockResolvedValue({ saved_objects: [] }),
      create: jest.fn().mockResolvedValue({
        id: 'new-so-id',
        attributes: {
          id: 'my-query_copy',
          description: 'Test query',
          query: 'select 1;',
          interval: 3600,
          platform: 'linux',
          ecs_mapping: [{ key: 'host.name', value: { field: 'hostname' } }],
          snapshot: true,
          removed: false,
          timeout: 60,
          created_at: '2025-06-01T00:00:00.000Z',
          created_by: 'tester',
          updated_at: '2025-06-01T00:00:00.000Z',
          updated_by: 'tester',
        },
      }),
    };

    (createInternalSavedObjectsClientForSpaceId as jest.Mock).mockResolvedValue(
      mockSavedObjectsClient
    );
    (getUserInfo as jest.Mock).mockResolvedValue({ username: 'tester' });

    setupRoute();

    const mockRequest = httpServerMock.createKibanaRequest({
      params: { id: 'source-so-id' },
    });
    const mockResponse = httpServerMock.createResponseFactory();

    await routeHandler({} as any, mockRequest, mockResponse);

    expect(mockResponse.ok).toHaveBeenCalled();
    const responseBody = mockResponse.ok.mock.calls[0][0]?.body as any;
    expect(responseBody.data.id).toBe('my-query_copy');
    expect(responseBody.data.saved_object_id).toBe('new-so-id');
    expect(responseBody.data.description).toBe('Test query');
    expect(responseBody.data.query).toBe('select 1;');

    // Verify prebuilt is stripped but version (min osquery version) is preserved
    const createArgs = mockSavedObjectsClient.create.mock.calls[0][1];
    expect(createArgs.prebuilt).toBeUndefined();
    expect(createArgs.version).toBe('1.0.0');
  });

  it('resolves name collision (_copy exists → _copy_2)', async () => {
    const mockSavedObjectsClient = {
      get: jest.fn().mockResolvedValue(sourceSavedQuery),
      find: jest.fn().mockResolvedValue({
        saved_objects: [{ attributes: { id: 'my-query_copy' } }],
      }),
      create: jest.fn().mockResolvedValue({
        id: 'new-so-id',
        attributes: {
          id: 'my-query_copy_2',
          description: 'Test query',
          query: 'select 1;',
          interval: 3600,
          created_at: '2025-06-01T00:00:00.000Z',
          created_by: 'tester',
          updated_at: '2025-06-01T00:00:00.000Z',
          updated_by: 'tester',
        },
      }),
    };

    (createInternalSavedObjectsClientForSpaceId as jest.Mock).mockResolvedValue(
      mockSavedObjectsClient
    );
    (getUserInfo as jest.Mock).mockResolvedValue({ username: 'tester' });

    setupRoute();

    const mockRequest = httpServerMock.createKibanaRequest({
      params: { id: 'source-so-id' },
    });
    const mockResponse = httpServerMock.createResponseFactory();

    await routeHandler({} as any, mockRequest, mockResponse);

    expect(mockResponse.ok).toHaveBeenCalled();
    const createArgs = mockSavedObjectsClient.create.mock.calls[0][1];
    expect(createArgs.id).toBe('my-query_copy_2');
  });

  it('returns 404 when source not found', async () => {
    const mockSavedObjectsClient = {
      get: jest.fn().mockRejectedValue(new Error('Not found')),
    };

    (createInternalSavedObjectsClientForSpaceId as jest.Mock).mockResolvedValue(
      mockSavedObjectsClient
    );

    setupRoute();

    const mockRequest = httpServerMock.createKibanaRequest({
      params: { id: 'non-existent' },
    });
    const mockResponse = httpServerMock.createResponseFactory();

    await routeHandler({} as any, mockRequest, mockResponse);

    expect(mockResponse.notFound).toHaveBeenCalledWith({
      body: 'Saved query with id "non-existent" not found.',
    });
  });

  it('preserves version but strips prebuilt from query copy', async () => {
    const mockSavedObjectsClient = {
      get: jest.fn().mockResolvedValue(sourceSavedQuery),
      find: jest.fn().mockResolvedValue({ saved_objects: [] }),
      create: jest.fn().mockResolvedValue({
        id: 'new-so-id',
        attributes: {
          id: 'my-query_copy',
          query: 'select 1;',
          interval: 3600,
          version: '1.0.0',
          created_at: '2025-06-01T00:00:00.000Z',
          created_by: 'tester',
          updated_at: '2025-06-01T00:00:00.000Z',
          updated_by: 'tester',
        },
      }),
    };

    (createInternalSavedObjectsClientForSpaceId as jest.Mock).mockResolvedValue(
      mockSavedObjectsClient
    );
    (getUserInfo as jest.Mock).mockResolvedValue({ username: 'tester' });

    setupRoute();

    const mockRequest = httpServerMock.createKibanaRequest({
      params: { id: 'source-so-id' },
    });
    const mockResponse = httpServerMock.createResponseFactory();

    await routeHandler({} as any, mockRequest, mockResponse);

    const createArgs = mockSavedObjectsClient.create.mock.calls[0][1];
    expect(createArgs.version).toBe('1.0.0');
    expect(createArgs.prebuilt).toBeUndefined();
  });
});

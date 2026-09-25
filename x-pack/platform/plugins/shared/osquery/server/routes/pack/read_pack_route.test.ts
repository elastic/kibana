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
import { readPackRoute } from './read_pack_route';
import { createInternalSavedObjectsClientForSpaceId } from '../../utils/get_internal_saved_object_client';

jest.mock('../../utils/get_internal_saved_object_client', () => ({
  createInternalSavedObjectsClientForSpaceId: jest.fn(),
}));

describe('readPackRoute', () => {
  let routeHandler: RequestHandler;
  let mockOsqueryContext: OsqueryAppContext;
  let mockSavedObjectsClient: { get: jest.Mock };

  const createMockRouter = () => {
    const httpService = httpServiceMock.createSetupContract();

    return httpService.createRouter();
  };

  const makePack = (overrides: Record<string, unknown> = {}) => ({
    id: 'pack-1',
    type: 'osquery-pack',
    namespaces: ['default'],
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
      experimentalFeatures: { rruleScheduling: false },
    } as unknown as OsqueryAppContext;

    mockSavedObjectsClient = {
      get: jest.fn().mockResolvedValue(makePack()),
    };

    (createInternalSavedObjectsClientForSpaceId as jest.Mock).mockResolvedValue(
      mockSavedObjectsClient
    );
  });

  const setupRoute = () => {
    const mockRouter = createMockRouter();
    readPackRoute(mockRouter, mockOsqueryContext);

    const route = mockRouter.versioned.getRoute('get', '/api/osquery/packs/{id}');
    const routeVersion = route.versions[API_VERSIONS.public.v1];
    if (!routeVersion) {
      throw new Error(`Handler for version [${API_VERSIONS.public.v1}] not found!`);
    }

    routeHandler = routeVersion.handler;
  };

  describe('V5: pack-level execution defaults', () => {
    it('returns min_osquery_version, result_type, and platform when set', async () => {
      mockSavedObjectsClient.get.mockResolvedValue(
        makePack({
          min_osquery_version: '5.10.0',
          result_type: 'differential',
          platform: 'linux',
        })
      );

      setupRoute();

      const mockRequest = httpServerMock.createKibanaRequest({ params: { id: 'pack-1' } });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler({} as any, mockRequest, mockResponse);

      expect(mockResponse.ok).toHaveBeenCalled();
      const body = mockResponse.ok.mock.calls[0][0]?.body as { data: Record<string, unknown> };
      expect(body.data.min_osquery_version).toBe('5.10.0');
      expect(body.data.result_type).toBe('differential');
      expect(body.data.platform).toBe('linux');
    });

    it('omits V5 fields when they are not set', async () => {
      setupRoute();

      const mockRequest = httpServerMock.createKibanaRequest({ params: { id: 'pack-1' } });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler({} as any, mockRequest, mockResponse);

      expect(mockResponse.ok).toHaveBeenCalled();
      const body = mockResponse.ok.mock.calls[0][0]?.body as { data: Record<string, unknown> };
      expect(body.data).not.toHaveProperty('min_osquery_version');
      expect(body.data).not.toHaveProperty('result_type');
      expect(body.data).not.toHaveProperty('platform');
    });
  });
});

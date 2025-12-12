/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, elasticsearchServiceMock, coreMock } from '@kbn/core/server/mocks';
import type { IRouter, RequestHandler } from '@kbn/core/server';
import type { DataRequestHandlerContext } from '@kbn/data-plugin/server';
import { closePitRoute } from './close_pit_route';
import { createMockOsqueryContext, createMockRouter } from './mocks';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';

describe('closePitRoute', () => {
  let mockOsqueryContext: ReturnType<typeof createMockOsqueryContext>;
  let mockRouter: ReturnType<typeof createMockRouter>;
  let routeHandler: RequestHandler;
  let mockEsClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;

  beforeEach(() => {
    mockOsqueryContext = createMockOsqueryContext();
    mockRouter = createMockRouter();
    mockEsClient = elasticsearchServiceMock.createElasticsearchClient();

    closePitRoute(
      mockRouter as unknown as IRouter<DataRequestHandlerContext>,
      mockOsqueryContext as unknown as OsqueryAppContext
    );

    const route = mockRouter.versioned.getRoute(
      'post',
      '/internal/osquery/live_queries/pit/close'
    );
    const routeVersion = route.versions['1'];
    if (!routeVersion) {
      throw new Error('Handler for version [1] not found!');
    }

    routeHandler = routeVersion.handler;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockContext = () => {
    const mockCoreContext = coreMock.createRequestHandlerContext();
    mockCoreContext.elasticsearch.client.asCurrentUser = mockEsClient;

    const context = {
      core: Promise.resolve(mockCoreContext),
      resolve: jest.fn(),
    };

    return context as unknown as Parameters<RequestHandler>[0];
  };

  describe('successful close', () => {
    it('should close PIT successfully', async () => {
      mockEsClient.closePointInTime.mockResolvedValue({ succeeded: true, num_freed: 1 });

      const mockContext = createMockContext();
      const mockRequest = httpServerMock.createKibanaRequest({
        body: { pitId: 'pit-to-close' },
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockEsClient.closePointInTime).toHaveBeenCalledWith({
        id: 'pit-to-close',
      });
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: { success: true },
      });
    });
  });

  describe('expired PIT handling', () => {
    it('should handle already-expired PIT gracefully', async () => {
      mockEsClient.closePointInTime.mockRejectedValue(new Error('Point-in-time not found'));

      const mockContext = createMockContext();
      const mockRequest = httpServerMock.createKibanaRequest({
        body: { pitId: 'expired-pit' },
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(mockContext, mockRequest, mockResponse);

      // Should return OK with success: false, not throw error
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: { success: false, error: expect.any(String) },
      });
    });

    it('should handle generic ES errors gracefully', async () => {
      mockEsClient.closePointInTime.mockRejectedValue(new Error('ES connection refused'));

      const mockContext = createMockContext();
      const mockRequest = httpServerMock.createKibanaRequest({
        body: { pitId: 'some-pit' },
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: {
          success: false,
          error: 'ES connection refused',
        },
      });
    });
  });

  describe('route registration', () => {
    it('should register the close PIT route', () => {
      // Verify the route is registered by confirming the handler exists
      const route = mockRouter.versioned.getRoute(
        'post',
        '/internal/osquery/live_queries/pit/close'
      );

      expect(route).toBeDefined();
      expect(route.versions['1']).toBeDefined();
      expect(route.versions['1'].handler).toBeDefined();
    });
  });
});

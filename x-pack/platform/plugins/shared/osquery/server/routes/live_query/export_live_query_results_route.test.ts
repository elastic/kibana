/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PassThrough } from 'stream';
import { httpServerMock, httpServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { RequestHandler } from '@kbn/core/server';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { exportLiveQueryResultsRoute } from './export_live_query_results_route';
import { API_VERSIONS } from '../../../common/constants';

jest.mock('../../utils/get_internal_saved_object_client', () => ({
  createInternalSavedObjectsClientForSpaceId: jest.fn(),
}));

jest.mock('../../lib/export_results_to_stream', () => ({
  exportResultsToStream: jest.fn(),
}));

jest.mock('../../lib/get_user_info', () => ({
  getUserInfo: jest.fn(),
}));

import { createInternalSavedObjectsClientForSpaceId } from '../../utils/get_internal_saved_object_client';
import { exportResultsToStream } from '../../lib/export_results_to_stream';
import { getUserInfo } from '../../lib/get_user_info';

const ROUTE_PATH = '/api/osquery/results/{actionId}/_export';
const ROUTE_VERSION = API_VERSIONS.public.v1;

const createMockRouter = () => {
  const httpService = httpServiceMock.createSetupContract();

  return httpService.createRouter();
};

const createMockOsqueryContext = (
  overrides: Partial<OsqueryAppContext> = {}
): OsqueryAppContext => {
  const logger = loggingSystemMock.createLogger();

  return {
    logFactory: {
      get: jest.fn().mockReturnValue(logger),
    },
    service: {
      getActiveSpace: jest.fn().mockResolvedValue({ id: 'default', name: 'Default' }),
      getIntegrationNamespaces: jest.fn().mockResolvedValue({}),
    },
    security: {
      authc: {
        getCurrentUser: jest.fn().mockReturnValue({ username: 'test-user' }),
      },
      userProfiles: {
        getCurrent: jest.fn().mockResolvedValue({
          uid: 'uid-1',
          user: { username: 'test-user', full_name: 'Test User', email: null },
        }),
      },
    },
    experimentalFeatures: {
      exportResults: true,
      queryHistoryRework: false,
      unifiedDataTable: false,
    },
    getStartServices: jest.fn().mockResolvedValue([{}, {}, {}]),
    ...overrides,
  } as unknown as OsqueryAppContext;
};

const createMockCoreContext = (esSearchOverride?: jest.Mock) => {
  const defaultEsSearch = jest.fn().mockResolvedValue({
    hits: { hits: [], total: { value: 0 } },
  });

  return {
    core: Promise.resolve({
      elasticsearch: {
        client: {
          asCurrentUser: {
            search: esSearchOverride ?? defaultEsSearch,
            openPointInTime: jest.fn().mockResolvedValue({ id: 'pit-id' }),
            closePointInTime: jest.fn().mockResolvedValue({}),
          },
        },
      },
    }),
  };
};

describe('exportLiveQueryResultsRoute', () => {
  let mockOsqueryContext: OsqueryAppContext;
  let mockRouter: ReturnType<typeof createMockRouter>;
  let routeHandler: RequestHandler;
  let mockExportResultsToStream: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockOsqueryContext = createMockOsqueryContext();
    mockRouter = createMockRouter();

    mockExportResultsToStream = exportResultsToStream as jest.Mock;
    mockExportResultsToStream.mockResolvedValue(new PassThrough());

    (getUserInfo as jest.Mock).mockResolvedValue({ username: 'test-user' });

    (createInternalSavedObjectsClientForSpaceId as jest.Mock).mockResolvedValue({
      find: jest.fn(),
      get: jest.fn(),
    });

    exportLiveQueryResultsRoute(mockRouter, mockOsqueryContext);

    const route = mockRouter.versioned.getRoute('post', ROUTE_PATH);
    const routeVersion = route.versions[ROUTE_VERSION];

    if (!routeVersion) {
      throw new Error(`Handler for version [${ROUTE_VERSION}] not found!`);
    }

    routeHandler = routeVersion.handler;
  });

  describe('route registration', () => {
    it('should register a versioned POST route at the correct path', () => {
      const route = mockRouter.versioned.getRoute('post', ROUTE_PATH);

      expect(route).toBeDefined();
    });

    it('should register with the correct API version', () => {
      const route = mockRouter.versioned.getRoute('post', ROUTE_PATH);

      expect(route.versions[ROUTE_VERSION]).toBeDefined();
    });

    it('should require osquery-readLiveQueries privilege', () => {
      const route = mockRouter.versioned.getRoute('post', ROUTE_PATH);

      expect(
        (route.config.security?.authz as { requiredPrivileges?: string[] })?.requiredPrivileges
      ).toContain('osquery-readLiveQueries');
    });

    it('should be a public access route', () => {
      const route = mockRouter.versioned.getRoute('post', ROUTE_PATH);

      expect(route.config.access).toBe('public');
    });
  });

  describe('handler', () => {
    describe('successful export', () => {
      it('should return streaming response with correct Content-Disposition header for ndjson', async () => {
        const mockStream = new PassThrough();
        mockExportResultsToStream.mockResolvedValue(mockStream);

        const mockEsSearch = jest.fn().mockResolvedValue({ hits: { hits: [] } });
        const mockContext = createMockCoreContext(mockEsSearch);

        const mockRequest = httpServerMock.createKibanaRequest({
          params: { actionId: 'action-123' },
          query: { format: 'ndjson' },
          body: undefined,
        });
        const mockResponse = httpServerMock.createResponseFactory();

        await routeHandler(mockContext as any, mockRequest, mockResponse);

        expect(mockResponse.ok).toHaveBeenCalledWith(
          expect.objectContaining({
            body: mockStream,
            headers: expect.objectContaining({
              'Content-Disposition': expect.stringMatching(/attachment; filename=".+\.ndjson"/),
              'Content-Type': expect.stringContaining('ndjson'),
            }),
          })
        );
      });

      it('should return streaming response with correct Content-Type for json format', async () => {
        const mockStream = new PassThrough();
        mockExportResultsToStream.mockResolvedValue(mockStream);

        const mockEsSearch = jest.fn().mockResolvedValue({ hits: { hits: [] } });
        const mockContext = createMockCoreContext(mockEsSearch);

        const mockRequest = httpServerMock.createKibanaRequest({
          params: { actionId: 'action-123' },
          query: { format: 'json' },
          body: undefined,
        });
        const mockResponse = httpServerMock.createResponseFactory();

        await routeHandler(mockContext as any, mockRequest, mockResponse);

        expect(mockResponse.ok).toHaveBeenCalledWith(
          expect.objectContaining({
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
            }),
          })
        );
      });

      it('should return streaming response with correct Content-Type for csv format', async () => {
        const mockStream = new PassThrough();
        mockExportResultsToStream.mockResolvedValue(mockStream);

        const mockEsSearch = jest.fn().mockResolvedValue({ hits: { hits: [] } });
        const mockContext = createMockCoreContext(mockEsSearch);

        const mockRequest = httpServerMock.createKibanaRequest({
          params: { actionId: 'action-123' },
          query: { format: 'csv' },
          body: undefined,
        });
        const mockResponse = httpServerMock.createResponseFactory();

        await routeHandler(mockContext as any, mockRequest, mockResponse);

        expect(mockResponse.ok).toHaveBeenCalledWith(
          expect.objectContaining({
            headers: expect.objectContaining({
              'Content-Type': 'text/csv',
            }),
          })
        );
      });

      it('should include actionId in the filename', async () => {
        const mockStream = new PassThrough();
        mockExportResultsToStream.mockResolvedValue(mockStream);

        const mockEsSearch = jest.fn().mockResolvedValue({ hits: { hits: [] } });
        const mockContext = createMockCoreContext(mockEsSearch);

        const mockRequest = httpServerMock.createKibanaRequest({
          params: { actionId: 'my-special-action' },
          query: { format: 'csv' },
          body: undefined,
        });
        const mockResponse = httpServerMock.createResponseFactory();

        await routeHandler(mockContext as any, mockRequest, mockResponse);

        const responseCall = (mockResponse.ok as jest.Mock).mock.calls[0][0];
        expect(responseCall.headers['Content-Disposition']).toContain('my-special-action');
      });
    });

    describe('max results exceeded', () => {
      it('should return 400 when exportResultsToStream returns an error object', async () => {
        mockExportResultsToStream.mockResolvedValue({
          statusCode: 400,
          message:
            'Export limited to 500,000 results. Found 600,000. Please add filters to narrow results.',
        });

        const mockEsSearch = jest.fn().mockResolvedValue({ hits: { hits: [] } });
        const mockContext = createMockCoreContext(mockEsSearch);

        const mockRequest = httpServerMock.createKibanaRequest({
          params: { actionId: 'action-123' },
          query: { format: 'ndjson' },
          body: undefined,
        });
        const mockResponse = httpServerMock.createResponseFactory();

        await routeHandler(mockContext as any, mockRequest, mockResponse);

        expect(mockResponse.badRequest).toHaveBeenCalledWith({
          body: {
            message: expect.stringContaining('500,000'),
          },
        });
      });

      it('should not return a stream when results exceed limit', async () => {
        mockExportResultsToStream.mockResolvedValue({
          statusCode: 400,
          message: 'Export limited to 500,000 results.',
        });

        const mockEsSearch = jest.fn().mockResolvedValue({ hits: { hits: [] } });
        const mockContext = createMockCoreContext(mockEsSearch);

        const mockRequest = httpServerMock.createKibanaRequest({
          params: { actionId: 'action-123' },
          query: { format: 'ndjson' },
          body: undefined,
        });
        const mockResponse = httpServerMock.createResponseFactory();

        await routeHandler(mockContext as any, mockRequest, mockResponse);

        expect(mockResponse.ok).not.toHaveBeenCalled();
      });
    });

    describe('query filter construction', () => {
      it('should filter by actionId', async () => {
        const mockStream = new PassThrough();
        mockExportResultsToStream.mockResolvedValue(mockStream);

        const mockEsSearch = jest.fn().mockResolvedValue({ hits: { hits: [] } });
        const mockContext = createMockCoreContext(mockEsSearch);

        const mockRequest = httpServerMock.createKibanaRequest({
          params: { actionId: 'target-action-id' },
          query: { format: 'ndjson' },
          body: undefined,
        });
        const mockResponse = httpServerMock.createResponseFactory();

        await routeHandler(mockContext as any, mockRequest, mockResponse);

        const exportCall = mockExportResultsToStream.mock.calls[0][0];
        // The query filter should include the actionId
        expect(JSON.stringify(exportCall.query)).toContain('target-action-id');
      });

      it('should include agentIds in filter when provided', async () => {
        const mockStream = new PassThrough();
        mockExportResultsToStream.mockResolvedValue(mockStream);

        const mockEsSearch = jest.fn().mockResolvedValue({ hits: { hits: [] } });
        const mockContext = createMockCoreContext(mockEsSearch);

        const mockRequest = httpServerMock.createKibanaRequest({
          params: { actionId: 'action-123' },
          query: { format: 'ndjson' },
          body: { agentIds: ['agent-a', 'agent-b'] },
        });
        const mockResponse = httpServerMock.createResponseFactory();

        await routeHandler(mockContext as any, mockRequest, mockResponse);

        const exportCall = mockExportResultsToStream.mock.calls[0][0];
        expect(JSON.stringify(exportCall.query)).toContain('agent-a');
        expect(JSON.stringify(exportCall.query)).toContain('agent-b');
      });

      it('should include kuery in filter when provided', async () => {
        const mockStream = new PassThrough();
        mockExportResultsToStream.mockResolvedValue(mockStream);

        const mockEsSearch = jest.fn().mockResolvedValue({ hits: { hits: [] } });
        const mockContext = createMockCoreContext(mockEsSearch);

        const mockRequest = httpServerMock.createKibanaRequest({
          params: { actionId: 'action-123' },
          query: { format: 'ndjson' },
          body: { kuery: 'osquery.exit_code: 0' },
        });
        const mockResponse = httpServerMock.createResponseFactory();

        await routeHandler(mockContext as any, mockRequest, mockResponse);

        const exportCall = mockExportResultsToStream.mock.calls[0][0];
        expect(JSON.stringify(exportCall.query)).toContain('exit_code');
      });
    });

    describe('space-aware index resolution', () => {
      it('should use default index pattern when integration namespaces are empty', async () => {
        const mockStream = new PassThrough();
        mockExportResultsToStream.mockResolvedValue(mockStream);

        (mockOsqueryContext.service.getIntegrationNamespaces as jest.Mock).mockResolvedValue({});

        const mockEsSearch = jest.fn().mockResolvedValue({ hits: { hits: [] } });
        const mockContext = createMockCoreContext(mockEsSearch);

        const mockRequest = httpServerMock.createKibanaRequest({
          params: { actionId: 'action-123' },
          query: { format: 'ndjson' },
          body: undefined,
        });
        const mockResponse = httpServerMock.createResponseFactory();

        await routeHandler(mockContext as any, mockRequest, mockResponse);

        const exportCall = mockExportResultsToStream.mock.calls[0][0];
        expect(exportCall.index).toBe('logs-osquery_manager.result*');
      });

      it('should use namespace-specific index pattern when integration namespaces are returned', async () => {
        const mockStream = new PassThrough();
        mockExportResultsToStream.mockResolvedValue(mockStream);

        (mockOsqueryContext.service.getIntegrationNamespaces as jest.Mock).mockResolvedValue({
          osquery_manager: ['custom-namespace'],
        });

        const mockEsSearch = jest.fn().mockResolvedValue({ hits: { hits: [] } });
        const mockContext = createMockCoreContext(mockEsSearch);

        const mockRequest = httpServerMock.createKibanaRequest({
          params: { actionId: 'action-123' },
          query: { format: 'ndjson' },
          body: undefined,
        });
        const mockResponse = httpServerMock.createResponseFactory();

        await routeHandler(mockContext as any, mockRequest, mockResponse);

        const exportCall = mockExportResultsToStream.mock.calls[0][0];
        expect(exportCall.index).toContain('custom-namespace');
      });

      it('should join multiple namespaces with a comma', async () => {
        const mockStream = new PassThrough();
        mockExportResultsToStream.mockResolvedValue(mockStream);

        (mockOsqueryContext.service.getIntegrationNamespaces as jest.Mock).mockResolvedValue({
          osquery_manager: ['ns-1', 'ns-2'],
        });

        const mockEsSearch = jest.fn().mockResolvedValue({ hits: { hits: [] } });
        const mockContext = createMockCoreContext(mockEsSearch);

        const mockRequest = httpServerMock.createKibanaRequest({
          params: { actionId: 'action-123' },
          query: { format: 'ndjson' },
          body: undefined,
        });
        const mockResponse = httpServerMock.createResponseFactory();

        await routeHandler(mockContext as any, mockRequest, mockResponse);

        const exportCall = mockExportResultsToStream.mock.calls[0][0];
        expect(exportCall.index).toContain(',');
      });
    });

    describe('query string lookup from actions index', () => {
      it('should pass the SQL query string in metadata when found in actions index', async () => {
        const mockStream = new PassThrough();
        mockExportResultsToStream.mockResolvedValue(mockStream);

        const mockEsSearch = jest
          .fn()
          // First call: actions index lookup
          .mockResolvedValueOnce({
            hits: {
              hits: [
                {
                  _source: {
                    queries: [{ action_id: 'action-123', query: 'SELECT * FROM processes' }],
                  },
                },
              ],
            },
          });

        const mockContext = createMockCoreContext(mockEsSearch);

        const mockRequest = httpServerMock.createKibanaRequest({
          params: { actionId: 'action-123' },
          query: { format: 'ndjson' },
          body: undefined,
        });
        const mockResponse = httpServerMock.createResponseFactory();

        await routeHandler(mockContext as any, mockRequest, mockResponse);

        const exportCall = mockExportResultsToStream.mock.calls[0][0];
        expect(exportCall.metadata.query).toBe('SELECT * FROM processes');
      });

      it('should pass undefined query in metadata when actions index lookup fails', async () => {
        const mockStream = new PassThrough();
        mockExportResultsToStream.mockResolvedValue(mockStream);

        const mockEsSearch = jest.fn().mockRejectedValueOnce(new Error('Index not available'));

        const mockContext = createMockCoreContext(mockEsSearch);

        const mockRequest = httpServerMock.createKibanaRequest({
          params: { actionId: 'action-123' },
          query: { format: 'ndjson' },
          body: undefined,
        });
        const mockResponse = httpServerMock.createResponseFactory();

        await routeHandler(mockContext as any, mockRequest, mockResponse);

        // Should not throw — falls back gracefully
        const exportCall = mockExportResultsToStream.mock.calls[0][0];
        expect(exportCall.metadata.query).toBeUndefined();
      });

      it('should pass undefined query when action has no matching query entry', async () => {
        const mockStream = new PassThrough();
        mockExportResultsToStream.mockResolvedValue(mockStream);

        const mockEsSearch = jest.fn().mockResolvedValueOnce({
          hits: {
            hits: [
              {
                _source: {
                  queries: [{ action_id: 'different-action', query: 'SELECT 1' }],
                },
              },
            ],
          },
        });

        const mockContext = createMockCoreContext(mockEsSearch);

        const mockRequest = httpServerMock.createKibanaRequest({
          params: { actionId: 'action-123' },
          query: { format: 'ndjson' },
          body: undefined,
        });
        const mockResponse = httpServerMock.createResponseFactory();

        await routeHandler(mockContext as any, mockRequest, mockResponse);

        const exportCall = mockExportResultsToStream.mock.calls[0][0];
        expect(exportCall.metadata.query).toBeUndefined();
      });
    });

    describe('user info in metadata', () => {
      it('should include username from user info in export metadata', async () => {
        const mockStream = new PassThrough();
        mockExportResultsToStream.mockResolvedValue(mockStream);

        (getUserInfo as jest.Mock).mockResolvedValue({
          username: 'alice',
          full_name: 'Alice Example',
          email: null,
        });

        const mockEsSearch = jest.fn().mockResolvedValue({ hits: { hits: [] } });
        const mockContext = createMockCoreContext(mockEsSearch);

        const mockRequest = httpServerMock.createKibanaRequest({
          params: { actionId: 'action-123' },
          query: { format: 'ndjson' },
          body: undefined,
        });
        const mockResponse = httpServerMock.createResponseFactory();

        await routeHandler(mockContext as any, mockRequest, mockResponse);

        const exportCall = mockExportResultsToStream.mock.calls[0][0];
        expect(exportCall.metadata.exported_by).toBe('alice');
      });

      it('should fall back to "unknown" when user info is unavailable', async () => {
        const mockStream = new PassThrough();
        mockExportResultsToStream.mockResolvedValue(mockStream);

        (getUserInfo as jest.Mock).mockResolvedValue(undefined);

        const mockEsSearch = jest.fn().mockResolvedValue({ hits: { hits: [] } });
        const mockContext = createMockCoreContext(mockEsSearch);

        const mockRequest = httpServerMock.createKibanaRequest({
          params: { actionId: 'action-123' },
          query: { format: 'ndjson' },
          body: undefined,
        });
        const mockResponse = httpServerMock.createResponseFactory();

        await routeHandler(mockContext as any, mockRequest, mockResponse);

        const exportCall = mockExportResultsToStream.mock.calls[0][0];
        expect(exportCall.metadata.exported_by).toBe('unknown');
      });
    });

    describe('error handling', () => {
      it('should return customError with statusCode when handler throws an ES error', async () => {
        mockExportResultsToStream.mockRejectedValue(
          Object.assign(new Error('Forbidden'), { statusCode: 403 })
        );

        const mockEsSearch = jest.fn().mockResolvedValue({ hits: { hits: [] } });
        const mockContext = createMockCoreContext(mockEsSearch);

        const mockRequest = httpServerMock.createKibanaRequest({
          params: { actionId: 'action-123' },
          query: { format: 'ndjson' },
          body: undefined,
        });
        const mockResponse = httpServerMock.createResponseFactory();

        await routeHandler(mockContext as any, mockRequest, mockResponse);

        expect(mockResponse.customError).toHaveBeenCalledWith({
          statusCode: 403,
          body: { message: 'Forbidden' },
        });
      });

      it('should return 500 customError when handler throws error without statusCode', async () => {
        mockExportResultsToStream.mockRejectedValue(new Error('Unexpected failure'));

        const mockEsSearch = jest.fn().mockResolvedValue({ hits: { hits: [] } });
        const mockContext = createMockCoreContext(mockEsSearch);

        const mockRequest = httpServerMock.createKibanaRequest({
          params: { actionId: 'action-123' },
          query: { format: 'ndjson' },
          body: undefined,
        });
        const mockResponse = httpServerMock.createResponseFactory();

        await routeHandler(mockContext as any, mockRequest, mockResponse);

        expect(mockResponse.customError).toHaveBeenCalledWith({
          statusCode: 500,
          body: { message: 'Unexpected failure' },
        });
      });
    });

    describe('metadata correctness', () => {
      it('should include action_id and format in metadata passed to exportResultsToStream', async () => {
        const mockStream = new PassThrough();
        mockExportResultsToStream.mockResolvedValue(mockStream);

        const mockEsSearch = jest.fn().mockResolvedValue({ hits: { hits: [] } });
        const mockContext = createMockCoreContext(mockEsSearch);

        const mockRequest = httpServerMock.createKibanaRequest({
          params: { actionId: 'my-action' },
          query: { format: 'csv' },
          body: undefined,
        });
        const mockResponse = httpServerMock.createResponseFactory();

        await routeHandler(mockContext as any, mockRequest, mockResponse);

        const exportCall = mockExportResultsToStream.mock.calls[0][0];
        expect(exportCall.metadata.action_id).toBe('my-action');
        expect(exportCall.metadata.format).toBe('csv');
        expect(exportCall.metadata.timestamp).toBeDefined();
      });

      it('should pass aborted$ observable from request events', async () => {
        const mockStream = new PassThrough();
        mockExportResultsToStream.mockResolvedValue(mockStream);

        const mockEsSearch = jest.fn().mockResolvedValue({ hits: { hits: [] } });
        const mockContext = createMockCoreContext(mockEsSearch);

        const mockRequest = httpServerMock.createKibanaRequest({
          params: { actionId: 'action-123' },
          query: { format: 'ndjson' },
          body: undefined,
        });
        const mockResponse = httpServerMock.createResponseFactory();

        await routeHandler(mockContext as any, mockRequest, mockResponse);

        const exportCall = mockExportResultsToStream.mock.calls[0][0];
        expect(exportCall.aborted$).toBeDefined();
      });
    });
  });
});

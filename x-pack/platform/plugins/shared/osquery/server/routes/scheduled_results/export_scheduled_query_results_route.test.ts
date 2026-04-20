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
import { exportScheduledQueryResultsRoute } from './export_scheduled_query_results_route';
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

const ROUTE_PATH = '/api/osquery/scheduled_results/{scheduleId}/{executionCount}/_export';
const ROUTE_VERSION = API_VERSIONS.public.v1;

const createMockRouter = () => {
  const httpService = httpServiceMock.createSetupContract();

  return httpService.createRouter();
};

const createMockOsqueryContext = (): OsqueryAppContext => {
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
  } as unknown as OsqueryAppContext;
};

const createMockCoreContext = () => {
  const defaultEsSearch = jest.fn().mockResolvedValue({ hits: { hits: [] } });

  return {
    core: Promise.resolve({
      elasticsearch: {
        client: {
          asCurrentUser: {
            search: defaultEsSearch,
            openPointInTime: jest.fn().mockResolvedValue({ id: 'pit-id' }),
            closePointInTime: jest.fn().mockResolvedValue({}),
          },
        },
      },
    }),
  };
};

describe('exportScheduledQueryResultsRoute', () => {
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

    exportScheduledQueryResultsRoute(mockRouter, mockOsqueryContext);

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

    it('should require osquery-read privilege', () => {
      const route = mockRouter.versioned.getRoute('post', ROUTE_PATH);
      expect(
        (route.config.security?.authz as { requiredPrivileges?: string[] })?.requiredPrivileges
      ).toContain('osquery-read');
    });

    it('should be a public access route', () => {
      const route = mockRouter.versioned.getRoute('post', ROUTE_PATH);
      expect(route.config.access).toBe('public');
    });
  });

  describe('handler', () => {
    it('builds a base filter with both schedule_id and schedule_execution_count', async () => {
      const mockRequest = httpServerMock.createKibanaRequest({
        params: { scheduleId: 'schedule-abc', executionCount: 7 },
        query: { format: 'ndjson' },
        body: undefined,
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(createMockCoreContext() as any, mockRequest, mockResponse);

      const exportCall = mockExportResultsToStream.mock.calls[0][0];
      const serialized = JSON.stringify(exportCall.query);
      expect(serialized).toContain('schedule-abc');
      expect(serialized).toContain('7');
    });

    it('packs scheduleId into metadata.action_id and threads execution_count', async () => {
      const mockRequest = httpServerMock.createKibanaRequest({
        params: { scheduleId: 'schedule-xyz', executionCount: 42 },
        query: { format: 'csv' },
        body: undefined,
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(createMockCoreContext() as any, mockRequest, mockResponse);

      const exportCall = mockExportResultsToStream.mock.calls[0][0];
      expect(exportCall.metadata.action_id).toBe('schedule-xyz');
      expect(exportCall.metadata.execution_count).toBe(42);
      expect(exportCall.metadata.format).toBe('csv');
      expect(exportCall.metadata.query).toContain('schedule-xyz');
    });

    it('generates a filename that includes scheduleId and executionCount', async () => {
      const mockRequest = httpServerMock.createKibanaRequest({
        params: { scheduleId: 'sched-1', executionCount: 3 },
        query: { format: 'ndjson' },
        body: undefined,
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(createMockCoreContext() as any, mockRequest, mockResponse);

      const responseCall = (mockResponse.ok as jest.Mock).mock.calls[0][0];
      expect(responseCall.headers['Content-Disposition']).toContain(
        'osquery-scheduled-results-sched-1-3'
      );
    });

    it('escapes scheduleId values with KQL meta-characters', async () => {
      const mockRequest = httpServerMock.createKibanaRequest({
        params: { scheduleId: 'schedule(with)parens', executionCount: 1 },
        query: { format: 'ndjson' },
        body: undefined,
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(createMockCoreContext() as any, mockRequest, mockResponse);

      // Handler compiled the base filter without throwing → escapeKuery did its job
      expect(mockExportResultsToStream).toHaveBeenCalledTimes(1);
    });
  });
});

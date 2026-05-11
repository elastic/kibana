/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NEVER } from 'rxjs';
import { escapeKuery } from '@kbn/es-query';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';

import { allowedExperimentalValues } from '../../../common';
import { API_VERSIONS } from '../../../common/constants';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { exportScheduledQueryResultsRoute } from './export_scheduled_query_results_route';

const SCHEDULED_EXPORT_PATH =
  '/api/osquery/scheduled_results/{scheduleId}/{executionCount}/_export';

jest.mock('../export/create_export_route_handler', () => ({
  createExportRouteHandler: jest.fn(),
}));

jest.mock('../../utils/get_internal_saved_object_client', () => ({
  createInternalSavedObjectsClientForSpaceId: jest.fn().mockResolvedValue({}),
}));

jest.mock('../unified_history/process_scheduled_history', () => ({
  getPacksForSpace: jest.fn().mockResolvedValue([]),
}));

import { createExportRouteHandler } from '../export/create_export_route_handler';
import { getPacksForSpace } from '../unified_history/process_scheduled_history';

const mockGetPacksForSpace = getPacksForSpace as jest.MockedFunction<typeof getPacksForSpace>;

const mockCreateExportRouteHandler = createExportRouteHandler as jest.MockedFunction<
  typeof createExportRouteHandler
>;

const createOsqueryContext = (): OsqueryAppContext =>
  ({
    logFactory: { get: () => loggingSystemMock.createLogger() },
    experimentalFeatures: { ...allowedExperimentalValues, exportResults: true },
    security: {} as OsqueryAppContext['security'],
    service: {
      getActiveSpace: jest.fn().mockResolvedValue({ id: 'default' }),
      getIntegrationNamespaces: undefined,
    },
    getStartServices: jest.fn(),
    config: jest.fn(),
    telemetryEventsSender: {},
    licensing: {},
  } as unknown as OsqueryAppContext);

describe('exportScheduledQueryResultsRoute', () => {
  let mockHandler: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockHandler = jest.fn().mockResolvedValue({ status: 200 });
    mockCreateExportRouteHandler.mockReturnValue(mockHandler);
    mockGetPacksForSpace.mockResolvedValue([]);
  });

  it('registers a POST route at the correct path', () => {
    const router = httpServiceMock.createRouter();
    exportScheduledQueryResultsRoute(router as never, createOsqueryContext());

    expect(router.versioned.post).toHaveBeenCalledWith(
      expect.objectContaining({
        path: SCHEDULED_EXPORT_PATH,
      })
    );
  });

  it('requires osquery-read privilege', () => {
    const router = httpServiceMock.createRouter();
    exportScheduledQueryResultsRoute(router as never, createOsqueryContext());

    const route = router.versioned.getRoute('post', SCHEDULED_EXPORT_PATH);

    expect(
      (route.config.security?.authz as { requiredPrivileges?: string[] })?.requiredPrivileges
    ).toContain('osquery-read');
  });

  it('registers the handler for the public API version', () => {
    const router = httpServiceMock.createRouter();
    exportScheduledQueryResultsRoute(router as never, createOsqueryContext());

    const route = router.versioned.getRoute('post', SCHEDULED_EXPORT_PATH);
    const routeVersion = route.versions[API_VERSIONS.public.v1];

    expect(routeVersion).toBeDefined();
    expect(typeof routeVersion.handler).toBe('function');
  });

  it('builds the correct baseFilter and metadata', async () => {
    const router = httpServiceMock.createRouter();
    exportScheduledQueryResultsRoute(router as never, createOsqueryContext());

    const registeredHandler = (router.versioned.post as jest.Mock).mock.results[0].value.addVersion
      .mock.calls[0][1];

    const request = {
      ...httpServerMock.createKibanaRequest({
        params: { scheduleId: 'sched-uuid-123', executionCount: 7 },
        query: { format: 'csv' },
        body: {},
      }),
      events: { aborted$: NEVER, completed$: NEVER },
    };

    const context = { core: Promise.resolve({}) };
    const response = httpServerMock.createResponseFactory();

    await registeredHandler(context, request, response);

    expect(mockHandler).toHaveBeenCalledWith(
      context,
      request,
      response,
      expect.objectContaining({
        baseFilter: 'schedule_id: "sched-uuid-123" AND osquery_meta.schedule_execution_count: 7',
        metadata: expect.objectContaining({
          action_id: 'sched-uuid-123',
          execution_count: 7,
        }),
        fileNamePrefix: 'osquery-scheduled-results-sched-uuid-123-7',
      })
    );
  });

  it('escapes special characters in scheduleId', async () => {
    const router = httpServiceMock.createRouter();
    exportScheduledQueryResultsRoute(router as never, createOsqueryContext());

    const registeredHandler = (router.versioned.post as jest.Mock).mock.results[0].value.addVersion
      .mock.calls[0][1];

    const request = {
      ...httpServerMock.createKibanaRequest({
        params: { scheduleId: 'sched "special"', executionCount: 1 },
        query: { format: 'ndjson' },
        body: {},
      }),
      events: { aborted$: NEVER, completed$: NEVER },
    };

    const context = { core: Promise.resolve({}) };
    const response = httpServerMock.createResponseFactory();

    await registeredHandler(context, request, response);

    const expectedEscaped = escapeKuery('sched "special"');
    expect(mockHandler.mock.calls[0][3]).toEqual(
      expect.objectContaining({
        baseFilter: `schedule_id: "${expectedEscaped}" AND osquery_meta.schedule_execution_count: 1`,
      })
    );
  });

  it('passes query text and ecsMapping to the handler when a matching pack query is found', async () => {
    mockGetPacksForSpace.mockResolvedValue([
      {
        id: 'pack-1',
        attributes: {
          name: 'my_pack',
          queries: [
            {
              id: 'q1',
              name: 'q1',
              query: 'SELECT pid FROM processes',
              interval: 60,
              schedule_id: 'sched-uuid-123',
              ecs_mapping: [
                { key: 'process.pid', result: { type: 'field', value: 'pid' } },
              ] as unknown as Record<string, unknown>,
            },
          ],
        },
      } as never,
    ]);

    const router = httpServiceMock.createRouter();
    exportScheduledQueryResultsRoute(router as never, createOsqueryContext());

    const registeredHandler = (router.versioned.post as jest.Mock).mock.results[0].value.addVersion
      .mock.calls[0][1];

    const request = {
      ...httpServerMock.createKibanaRequest({
        params: { scheduleId: 'sched-uuid-123', executionCount: 2 },
        query: { format: 'csv' },
        body: {},
      }),
      events: { aborted$: NEVER, completed$: NEVER },
    };

    const context = { core: Promise.resolve({}) };
    const response = httpServerMock.createResponseFactory();

    await registeredHandler(context, request, response);

    expect(mockHandler).toHaveBeenCalledWith(
      context,
      request,
      response,
      expect.objectContaining({
        metadata: expect.objectContaining({
          action_id: 'sched-uuid-123',
          execution_count: 2,
          query: 'SELECT pid FROM processes',
        }),
        ecsMapping: { 'process.pid': { field: 'pid' } },
      })
    );
  });

  it('calls the handler with undefined ecsMapping and query when no matching pack is found', async () => {
    mockGetPacksForSpace.mockResolvedValue([]);

    const router = httpServiceMock.createRouter();
    exportScheduledQueryResultsRoute(router as never, createOsqueryContext());

    const registeredHandler = (router.versioned.post as jest.Mock).mock.results[0].value.addVersion
      .mock.calls[0][1];

    const request = {
      ...httpServerMock.createKibanaRequest({
        params: { scheduleId: 'unknown-sched', executionCount: 1 },
        query: { format: 'ndjson' },
        body: {},
      }),
      events: { aborted$: NEVER, completed$: NEVER },
    };

    const context = { core: Promise.resolve({}) };
    const response = httpServerMock.createResponseFactory();

    await registeredHandler(context, request, response);

    expect(mockHandler).toHaveBeenCalledWith(
      context,
      request,
      response,
      expect.objectContaining({
        metadata: expect.objectContaining({
          action_id: 'unknown-sched',
        }),
        ecsMapping: undefined,
      })
    );
  });

  it('calls the handler successfully even when getPacksForSpace throws', async () => {
    mockGetPacksForSpace.mockRejectedValue(new Error('saved objects unavailable'));

    const router = httpServiceMock.createRouter();
    exportScheduledQueryResultsRoute(router as never, createOsqueryContext());

    const registeredHandler = (router.versioned.post as jest.Mock).mock.results[0].value.addVersion
      .mock.calls[0][1];

    const request = {
      ...httpServerMock.createKibanaRequest({
        params: { scheduleId: 'sched-1', executionCount: 5 },
        query: { format: 'json' },
        body: {},
      }),
      events: { aborted$: NEVER, completed$: NEVER },
    };

    const context = { core: Promise.resolve({}) };
    const response = httpServerMock.createResponseFactory();

    await registeredHandler(context, request, response);

    expect(mockHandler).toHaveBeenCalledWith(
      context,
      request,
      response,
      expect.objectContaining({
        baseFilter: expect.stringContaining('sched-1'),
        ecsMapping: undefined,
      })
    );
  });

  it('passes a null body without error', async () => {
    const router = httpServiceMock.createRouter();
    exportScheduledQueryResultsRoute(router as never, createOsqueryContext());

    const registeredHandler = (router.versioned.post as jest.Mock).mock.results[0].value.addVersion
      .mock.calls[0][1];

    const request = {
      ...httpServerMock.createKibanaRequest({
        params: { scheduleId: 'sched-1', executionCount: 3 },
        query: { format: 'json' },
        body: {},
      }),
      events: { aborted$: NEVER, completed$: NEVER },
    };

    const context = { core: Promise.resolve({}) };
    const response = httpServerMock.createResponseFactory();

    await registeredHandler(context, request, response);

    expect(mockHandler).toHaveBeenCalled();
  });
});

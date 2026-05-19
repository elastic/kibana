/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NEVER, of, throwError } from 'rxjs';
import { escapeKuery } from '@kbn/es-query';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';

import { allowedExperimentalValues } from '../../../common';
import { API_VERSIONS } from '../../../common/constants';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { exportLiveQueryResultsRoute } from './export_live_query_results_route';

const LIVE_EXPORT_PATH = '/api/osquery/live_queries/{id}/results/{actionId}/_export';

// Mock createExportRouteHandler so we can assert on the params it receives
jest.mock('../export/create_export_route_handler', () => ({
  createExportRouteHandler: jest.fn(),
}));

import { createExportRouteHandler } from '../export/create_export_route_handler';

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

const buildSearchMock = (
  queries?: Array<{ action_id: string; query: string; ecs_mapping?: Record<string, string> }>
) =>
  jest.fn().mockReturnValue(
    of({
      actionDetails: {
        _source: {
          queries: queries ?? [],
        },
      },
    })
  );

describe('exportLiveQueryResultsRoute', () => {
  let mockHandler: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockHandler = jest.fn().mockResolvedValue({ status: 200 });
    mockCreateExportRouteHandler.mockReturnValue(mockHandler);
  });

  it('registers a POST route at the correct path', () => {
    const router = httpServiceMock.createRouter();
    exportLiveQueryResultsRoute(router as never, createOsqueryContext());

    expect(router.versioned.post).toHaveBeenCalledWith(
      expect.objectContaining({
        path: LIVE_EXPORT_PATH,
      })
    );
  });

  it('requires osquery-readLiveQueries privilege', () => {
    const router = httpServiceMock.createRouter();
    exportLiveQueryResultsRoute(router as never, createOsqueryContext());

    const route = router.versioned.getRoute('post', LIVE_EXPORT_PATH);

    expect(
      (route.config.security?.authz as { requiredPrivileges?: string[] })?.requiredPrivileges
    ).toContain('osquery-readLiveQueries');
  });

  it('calls createExportRouteHandler with the correct baseFilter and metadata', async () => {
    const router = httpServiceMock.createRouter();
    const osqueryContext = createOsqueryContext();

    exportLiveQueryResultsRoute(router as never, osqueryContext);

    // Retrieve the registered handler function
    const registeredHandler = (router.versioned.post as jest.Mock).mock.results[0].value.addVersion
      .mock.calls[0][1];

    const request = {
      ...httpServerMock.createKibanaRequest({
        params: { id: 'live-query-1', actionId: 'action-abc' },
        query: { format: 'csv' },
        body: { kuery: 'host.name: "test"' },
      }),
      events: { aborted$: NEVER, completed$: NEVER },
    };

    const context = {
      core: Promise.resolve({}),
      search: Promise.resolve({
        search: buildSearchMock([{ action_id: 'action-abc', query: 'SELECT 1' }]),
      }),
    };

    const response = httpServerMock.createResponseFactory();

    await registeredHandler(context, request, response);

    expect(mockHandler).toHaveBeenCalledWith(
      context,
      request,
      response,
      expect.objectContaining({
        baseFilter: 'action_id: "action-abc"',
        metadata: expect.objectContaining({ action_id: 'action-abc' }),
        fileNamePrefix: 'osquery-results-action-abc',
      })
    );
  });

  it('populates query and ecsMapping from action details when found', async () => {
    const router = httpServiceMock.createRouter();
    const osqueryContext = createOsqueryContext();

    exportLiveQueryResultsRoute(router as never, osqueryContext);

    const registeredHandler = (router.versioned.post as jest.Mock).mock.results[0].value.addVersion
      .mock.calls[0][1];

    const searchMock = buildSearchMock([{ action_id: 'action-abc', query: 'SELECT * FROM users' }]);

    const context = {
      core: Promise.resolve({}),
      search: Promise.resolve({ search: searchMock }),
    };

    const request = {
      ...httpServerMock.createKibanaRequest({
        params: { id: 'live-query-1', actionId: 'action-abc' },
        query: { format: 'csv' },
        body: {},
      }),
      events: { aborted$: NEVER, completed$: NEVER },
    };

    const response = httpServerMock.createResponseFactory();
    await registeredHandler(context, request, response);

    expect(mockHandler).toHaveBeenCalledWith(
      context,
      request,
      response,
      expect.objectContaining({
        metadata: expect.objectContaining({
          action_id: 'action-abc',
          query: 'SELECT * FROM users',
        }),
      })
    );
  });

  it('populates ecsMapping from action details when the matching query defines ecs_mapping', async () => {
    const router = httpServiceMock.createRouter();
    exportLiveQueryResultsRoute(router as never, createOsqueryContext());

    const registeredHandler = (router.versioned.post as jest.Mock).mock.results[0].value.addVersion
      .mock.calls[0][1];

    const ecsMap = { custom: { field: 'host.name' } };
    const searchMock = buildSearchMock([
      {
        action_id: 'action-abc',
        query: 'SELECT * FROM users',
        ecs_mapping: ecsMap as unknown as Record<string, string>,
      },
    ]);

    const context = {
      core: Promise.resolve({}),
      search: Promise.resolve({ search: searchMock }),
    };

    const request = {
      ...httpServerMock.createKibanaRequest({
        params: { id: 'live-query-1', actionId: 'action-abc' },
        query: { format: 'csv' },
        body: {},
      }),
      events: { aborted$: NEVER, completed$: NEVER },
    };

    const response = httpServerMock.createResponseFactory();
    await registeredHandler(context, request, response);

    expect(mockHandler).toHaveBeenCalledWith(
      context,
      request,
      response,
      expect.objectContaining({
        ecsMapping: ecsMap,
      })
    );
  });

  it('returns 404 when actionDetails is found but does not contain the requested actionId', async () => {
    const router = httpServiceMock.createRouter();
    const osqueryContext = createOsqueryContext();

    exportLiveQueryResultsRoute(router as never, osqueryContext);

    const registeredHandler = (router.versioned.post as jest.Mock).mock.results[0].value.addVersion
      .mock.calls[0][1];

    // actionDetails returns successfully but with a different action_id — mismatch
    const searchMock = buildSearchMock([{ action_id: 'something-else', query: 'SELECT 1' }]);

    const context = {
      core: Promise.resolve({}),
      search: Promise.resolve({ search: searchMock }),
    };

    const request = {
      ...httpServerMock.createKibanaRequest({
        params: { id: 'live-query-1', actionId: 'action-abc' },
        query: { format: 'ndjson' },
        body: {},
      }),
      events: { aborted$: NEVER, completed$: NEVER },
    };

    const response = httpServerMock.createResponseFactory();
    await registeredHandler(context, request, response);

    expect(response.notFound).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({ message: 'Live query action not found' }),
      })
    );
    expect(mockHandler).not.toHaveBeenCalled();
  });

  it('proceeds without metadata enrichment when action details lookup fails', async () => {
    const router = httpServiceMock.createRouter();
    const osqueryContext = createOsqueryContext();

    exportLiveQueryResultsRoute(router as never, osqueryContext);

    const registeredHandler = (router.versioned.post as jest.Mock).mock.results[0].value.addVersion
      .mock.calls[0][1];

    const context = {
      core: Promise.resolve({}),
      search: Promise.resolve({
        search: jest.fn().mockReturnValue(throwError(() => new Error('search error'))),
      }),
    };

    const request = {
      ...httpServerMock.createKibanaRequest({
        params: { id: 'live-query-1', actionId: 'action-abc' },
        query: { format: 'csv' },
        body: {},
      }),
      events: { aborted$: NEVER, completed$: NEVER },
    };

    const response = httpServerMock.createResponseFactory();
    await registeredHandler(context, request, response);

    // Handler should still be called (graceful degradation)
    expect(mockHandler).toHaveBeenCalledWith(
      context,
      request,
      response,
      expect.objectContaining({
        metadata: expect.objectContaining({ action_id: 'action-abc' }),
      })
    );
  });

  it('escapes special characters in actionId for the base filter', async () => {
    const router = httpServiceMock.createRouter();
    const osqueryContext = createOsqueryContext();

    exportLiveQueryResultsRoute(router as never, osqueryContext);

    const registeredHandler = (router.versioned.post as jest.Mock).mock.results[0].value.addVersion
      .mock.calls[0][1];

    const context = {
      core: Promise.resolve({}),
      search: Promise.resolve({
        search: buildSearchMock([{ action_id: 'action-with-"quotes"', query: 'SELECT 1' }]),
      }),
    };

    const request = {
      ...httpServerMock.createKibanaRequest({
        params: { id: 'live-query-1', actionId: 'action-with-"quotes"' },
        query: { format: 'ndjson' },
        body: {},
      }),
      events: { aborted$: NEVER, completed$: NEVER },
    };

    const response = httpServerMock.createResponseFactory();
    await registeredHandler(context, request, response);

    const expectedEscaped = escapeKuery('action-with-"quotes"');
    expect(mockHandler).toHaveBeenCalledWith(
      context,
      request,
      response,
      expect.objectContaining({
        baseFilter: `action_id: "${expectedEscaped}"`,
      })
    );
  });

  it('registers the handler for the public API version', () => {
    const router = httpServiceMock.createRouter();
    exportLiveQueryResultsRoute(router as never, createOsqueryContext());

    const route = router.versioned.getRoute('post', LIVE_EXPORT_PATH);
    const routeVersion = route.versions[API_VERSIONS.public.v1];

    expect(routeVersion).toBeDefined();
    expect(typeof routeVersion.handler).toBe('function');
  });
});

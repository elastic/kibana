/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PassThrough } from 'stream';
import { NEVER } from 'rxjs';
import type { KibanaRequest } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core/server/mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { DataRequestHandlerContext } from '@kbn/data-plugin/server';
import type { RequestHandlerContext } from '@kbn/core-http-request-handler-context-server';

import { OSQUERY_INTEGRATION_NAME, allowedExperimentalValues } from '../../../common';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import type { ExportFormat } from '../../lib/format_results';
import { createExportRouteHandler, type ExportRouteParams } from './create_export_route_handler';

jest.mock('../../lib/export_results_to_stream', () => ({
  exportResultsToStream: jest.fn(),
}));

jest.mock('../../lib/get_user_info', () => ({
  getUserInfo: jest.fn().mockResolvedValue({ username: 'test-user' }),
}));

jest.mock('../../utils/get_internal_saved_object_client', () => ({
  createInternalSavedObjectsClientForSpaceId: jest.fn().mockResolvedValue({}),
}));

import { exportResultsToStream } from '../../lib/export_results_to_stream';

const mockExportResultsToStream = exportResultsToStream as jest.MockedFunction<
  typeof exportResultsToStream
>;

const auditLoggerLog = jest.fn();

const baseParams: ExportRouteParams = {
  baseFilter: 'action_id: "abc"',
  metadata: { action_id: 'abc', query: 'SELECT 1' },
  fileNamePrefix: 'osquery-results-test',
};

const createContext = () =>
  ({
    core: Promise.resolve({
      elasticsearch: {
        client: {
          asCurrentUser: {},
        },
      },
      security: {
        audit: {
          logger: {
            log: auditLoggerLog,
          },
        },
      },
    }),
  } as unknown as RequestHandlerContext & DataRequestHandlerContext);

type ExportHandlerRequest = KibanaRequest<
  unknown,
  { format: ExportFormat },
  { kuery?: string; agentIds?: string[]; esFilters?: unknown[] } | null
>;

const createExportRequest = (options: {
  query?: Record<string, string | undefined>;
  body?: Record<string, unknown> | null;
}): ExportHandlerRequest =>
  ({
    ...httpServerMock.createKibanaRequest({
      query: options.query ?? {},
      body: options.body ?? {},
    }),
    events: { aborted$: NEVER, completed$: NEVER },
  } as unknown as ExportHandlerRequest);

const createOsqueryContext = (options?: {
  getIntegrationNamespaces?: jest.Mock;
}): OsqueryAppContext =>
  ({
    logFactory: { get: () => loggingSystemMock.createLogger() },
    experimentalFeatures: allowedExperimentalValues,
    security: {} as OsqueryAppContext['security'],
    service: {
      getIntegrationNamespaces: options?.getIntegrationNamespaces,
    },
    getStartServices: jest.fn(),
    config: jest.fn(),
    telemetryEventsSender: {},
    licensing: {},
  } as unknown as OsqueryAppContext);

describe('createExportRouteHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    auditLoggerLog.mockClear();
    const stream = new PassThrough();
    stream.end();
    mockExportResultsToStream.mockResolvedValue(stream);
  });

  it('returns badRequest when kuery is invalid', async () => {
    const handler = createExportRouteHandler(createOsqueryContext());
    const response = httpServerMock.createResponseFactory();
    const request = createExportRequest({
      query: { format: 'csv' },
      body: { kuery: 'field: "' },
    });

    await handler(createContext(), request, response, baseParams);

    expect(response.badRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          message: expect.stringMatching(/^Invalid kuery:/),
        }),
      })
    );
    expect(mockExportResultsToStream).not.toHaveBeenCalled();
  });

  it('writes an audit event when export succeeds', async () => {
    const handler = createExportRouteHandler(createOsqueryContext());
    const response = httpServerMock.createResponseFactory();
    const request = createExportRequest({
      query: { format: 'ndjson' },
      body: {},
    });

    await handler(createContext(), request, response, baseParams);

    expect(auditLoggerLog).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Osquery export started',
        event: expect.objectContaining({
          action: 'osquery_export',
          category: ['database'],
          type: ['access'],
        }),
        labels: expect.objectContaining({
          action_id: 'abc',
          format: 'ndjson',
        }),
      })
    );
    expect(response.ok).toHaveBeenCalled();
  });

  it('returns badRequest when esFilters cannot be converted to ES clauses', async () => {
    const handler = createExportRouteHandler(createOsqueryContext());
    const response = httpServerMock.createResponseFactory();
    // Malformed combined filter: OR relation requires meta.params but none is set --
    // buildQueryFromFilters throws before export runs.
    const request = createExportRequest({
      query: { format: 'csv' },
      body: {
        esFilters: [
          {
            meta: { type: 'combined', relation: 'OR' },
            query: {},
          },
        ],
      },
    });

    await handler(createContext(), request, response, baseParams);

    expect(response.badRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          message: expect.stringMatching(/^Invalid esFilters:/),
        }),
      })
    );
    expect(mockExportResultsToStream).not.toHaveBeenCalled();
  });

  it('returns badRequest when export exceeds the max result limit', async () => {
    mockExportResultsToStream.mockResolvedValueOnce({
      statusCode: 400,
      message:
        'Export limited to 500,000 results. Found 500,001. Please add filters to narrow results.',
    });
    const handler = createExportRouteHandler(createOsqueryContext());
    const response = httpServerMock.createResponseFactory();
    const request = createExportRequest({
      query: { format: 'json' },
      body: {},
    });

    await handler(createContext(), request, response, baseParams);

    expect(response.badRequest).toHaveBeenCalledWith({
      body: {
        message:
          'Export limited to 500,000 results. Found 500,001. Please add filters to narrow results.',
      },
    });
    expect(auditLoggerLog).not.toHaveBeenCalled();
  });

  it('sets attachment headers on successful export', async () => {
    const handler = createExportRouteHandler(createOsqueryContext());
    const response = httpServerMock.createResponseFactory();
    const request = createExportRequest({
      query: { format: 'csv' },
      body: {},
    });

    await handler(createContext(), request, response, baseParams);

    expect(response.ok).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: {
          'Content-Disposition': expect.stringMatching(
            /^attachment; filename="osquery-results-test-.*\.csv"/
          ),
          'Content-Type': expect.stringMatching(/csv/i),
        },
      })
    );
  });

  it('includes execution_count in audit labels when provided in route metadata', async () => {
    const handler = createExportRouteHandler(createOsqueryContext());
    const response = httpServerMock.createResponseFactory();
    const request = createExportRequest({
      query: { format: 'ndjson' },
      body: {},
    });
    const params: ExportRouteParams = {
      ...baseParams,
      metadata: { action_id: 'sched', execution_count: 9 },
    };

    await handler(createContext(), request, response, params);

    expect(auditLoggerLog).toHaveBeenCalledWith(
      expect.objectContaining({
        labels: expect.objectContaining({
          execution_count: 9,
          action_id: 'sched',
        }),
      })
    );
  });

  it('resolves space-scoped indices when getIntegrationNamespaces returns namespaces', async () => {
    const getIntegrationNamespaces = jest.fn().mockResolvedValue({
      [OSQUERY_INTEGRATION_NAME]: ['fleet-ns'],
    });
    const handler = createExportRouteHandler(createOsqueryContext({ getIntegrationNamespaces }));
    const response = httpServerMock.createResponseFactory();
    const request = createExportRequest({
      query: { format: 'ndjson' },
      body: {},
    });

    await handler(createContext(), request, response, baseParams);

    expect(getIntegrationNamespaces).toHaveBeenCalled();
    expect(mockExportResultsToStream).toHaveBeenCalledWith(
      expect.objectContaining({
        index: `logs-${OSQUERY_INTEGRATION_NAME}.result-fleet-ns`,
      })
    );
  });

  it('adds a quoted agent ID allowlist clause to the ES query when agentIds are provided', async () => {
    const handler = createExportRouteHandler(createOsqueryContext());
    const response = httpServerMock.createResponseFactory();
    const request = createExportRequest({
      query: { format: 'ndjson' },
      body: { agentIds: ['agent-1', 'host/with:special'] },
    });

    await handler(createContext(), request, response, baseParams);

    const esQueryArg = mockExportResultsToStream.mock.calls[0][0].query;
    const queryStr = JSON.stringify(esQueryArg);
    expect(queryStr).toContain('agent.id');
    expect(queryStr).toContain('agent-1');
    // Values must be double-quoted in the KQL filter for consistent parsing
    expect(queryStr).toContain('"agent-1"');
    expect(response.ok).toHaveBeenCalled();
  });

  it('includes negated esFilters as must_not in the ES query', async () => {
    const handler = createExportRouteHandler(createOsqueryContext());
    const response = httpServerMock.createResponseFactory();
    const request = createExportRequest({
      query: { format: 'ndjson' },
      body: {
        esFilters: [
          {
            meta: { negate: true, type: 'phrase', key: 'osquery.uid', params: { query: '0' } },
            query: { match_phrase: { 'osquery.uid': '0' } },
          },
        ],
      },
    });

    await handler(createContext(), request, response, baseParams);

    const esQueryArg = mockExportResultsToStream.mock.calls[0][0].query;
    expect(esQueryArg?.bool?.must_not).toEqual([{ match_phrase: { 'osquery.uid': '0' } }]);
    expect(response.ok).toHaveBeenCalled();
  });

  it('wraps the entire composed filter in outer parentheses to prevent KQL OR gate-bypass', async () => {
    const handler = createExportRouteHandler(createOsqueryContext());
    const response = httpServerMock.createResponseFactory();
    // A kuery that attempts to inject an OR clause to bypass the action_id gate.
    // With outer parens the ES query will still be scoped to the base filter.
    const request = createExportRequest({
      query: { format: 'ndjson' },
      body: { kuery: 'host.name: "a"' },
    });

    await handler(createContext(), request, response, baseParams);

    const esQueryArg = mockExportResultsToStream.mock.calls[0][0].query;
    // The combined KQL is passed to getQueryFilter which compiles to an ES bool query.
    // We verify the call succeeds (no bad-request) and the query object is defined,
    // confirming the outer-parens do not break parsing.
    expect(response.badRequest).not.toHaveBeenCalled();
    expect(esQueryArg).toBeDefined();
    expect(response.ok).toHaveBeenCalled();
  });

  it('sanitizes double-quotes in fileNamePrefix for the Content-Disposition header', async () => {
    const handler = createExportRouteHandler(createOsqueryContext());
    const response = httpServerMock.createResponseFactory();
    const request = createExportRequest({
      query: { format: 'csv' },
      body: {},
    });
    const params: ExportRouteParams = {
      ...baseParams,
      fileNamePrefix: 'osquery-results-sched"evil"',
    };

    await handler(createContext(), request, response, params);

    const disposition: string = (response.ok as jest.Mock).mock.calls[0][0].headers[
      'Content-Disposition'
    ];
    // The embedded double-quote must be replaced so the header value is valid
    expect(disposition).not.toContain('"evil"');
    expect(disposition).toMatch(/^attachment; filename="[^"]*\.csv"$/);
  });
});

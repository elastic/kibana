/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PassThrough } from 'stream';
import { NEVER, of } from 'rxjs';
import type { KibanaRequest } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core/server/mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { DataRequestHandlerContext } from '@kbn/data-plugin/server';
import type { RequestHandlerContext } from '@kbn/core-http-request-handler-context-server';

import { allowedExperimentalValues } from '../../../common';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
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
  { format?: string },
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
    events: { aborted$: of(), completed$: NEVER },
  } as unknown as ExportHandlerRequest);

const createOsqueryContext = (exportResults: boolean): OsqueryAppContext =>
  ({
    logFactory: { get: () => loggingSystemMock.createLogger() },
    experimentalFeatures: { ...allowedExperimentalValues, exportResults },
    security: {} as OsqueryAppContext['security'],
    service: {
      getIntegrationNamespaces: undefined,
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

  it('returns forbidden when exportResults experimental flag is disabled', async () => {
    const handler = createExportRouteHandler(createOsqueryContext(false));
    const response = httpServerMock.createResponseFactory();
    const request = createExportRequest({
      query: { format: 'csv' },
      body: {},
    });

    await handler(createContext(), request, response, baseParams);

    expect(response.forbidden).toHaveBeenCalledWith({
      body: { message: 'Export results feature is not enabled' },
    });
    expect(mockExportResultsToStream).not.toHaveBeenCalled();
  });

  it('returns badRequest when kuery is invalid', async () => {
    const handler = createExportRouteHandler(createOsqueryContext(true));
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
    const handler = createExportRouteHandler(createOsqueryContext(true));
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
});

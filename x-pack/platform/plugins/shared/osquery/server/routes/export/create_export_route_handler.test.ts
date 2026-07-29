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
import type { IScopedSearchClient } from '@kbn/data-plugin/server';

import { OSQUERY_INTEGRATION_NAME, allowedExperimentalValues } from '../../../common';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import type { ExportFormat } from '../../lib/format_results';
import { createExportRouteHandler, type ExportRouteParams } from './create_export_route_handler';
import { OsqueryQueries } from '../../../common/search_strategy/osquery';

jest.mock('../../lib/export_results_to_stream', () => ({
  exportResultsToStream: jest.fn(),
}));

jest.mock('../../lib/get_user_info', () => ({
  getUserInfo: jest.fn().mockResolvedValue({ username: 'test-user' }),
}));

jest.mock('../../utils/get_internal_saved_object_client', () => ({
  createInternalSavedObjectsClientForSpaceId: jest.fn().mockResolvedValue({}),
}));

jest.mock('../../utils/ccs_utils', () => {
  const actual = jest.requireActual('../../utils/ccs_utils');

  return {
    ...actual,
    hasConnectedRemoteClusters: jest.fn().mockResolvedValue(false),
  };
});

jest.mock('../../lib/format_results', () => {
  const actual = jest.requireActual('../../lib/format_results');

  return {
    ...actual,
    createFormatter: jest.fn(actual.createFormatter),
  };
});

import { exportResultsToStream } from '../../lib/export_results_to_stream';
import { getUserInfo } from '../../lib/get_user_info';
import { createFormatter } from '../../lib/format_results';

const mockExportResultsToStream = exportResultsToStream as jest.MockedFunction<
  typeof exportResultsToStream
>;
const mockGetUserInfo = getUserInfo as jest.MockedFunction<typeof getUserInfo>;
const mockCreateFormatter = createFormatter as jest.MockedFunction<typeof createFormatter>;

const auditLoggerLog = jest.fn();

const baseParams: ExportRouteParams = {
  baseFilter: 'action_id: "abc"',
  metadata: { action_id: 'abc', query: 'SELECT 1' },
  fileNamePrefix: 'osquery-results-test',
};

const mockOpenPointInTime = jest.fn().mockResolvedValue({ id: 'mock-pit-id' });
const mockClosePointInTime = jest.fn().mockResolvedValue({});
const mockSearchSearch = jest.fn();
const mockSearch: jest.Mocked<IScopedSearchClient> = {
  search: mockSearchSearch,
} as unknown as jest.Mocked<IScopedSearchClient>;

const createContext = () =>
  ({
    core: Promise.resolve({
      elasticsearch: {
        client: {
          asInternalUser: {
            openPointInTime: mockOpenPointInTime,
            closePointInTime: mockClosePointInTime,
          },
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
    search: Promise.resolve(mockSearch),
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

const createSecurityMock = (options?: { useRbac?: boolean; authorizedPrivileges?: string[] }) => {
  const useRbac = options?.useRbac ?? false;
  const authorizedActions = new Set(
    (options?.authorizedPrivileges ?? []).map((privilege) => `api:${privilege}`)
  );

  return {
    authz: {
      mode: { useRbacForRequest: jest.fn().mockReturnValue(useRbac) },
      actions: { api: { get: (privilege: string) => `api:${privilege}` } },
      checkPrivilegesDynamicallyWithRequest: jest.fn().mockReturnValue(
        jest.fn(({ kibana }: { kibana: string[] }) =>
          Promise.resolve({
            privileges: {
              kibana: kibana.map((privilege) => ({
                privilege,
                authorized: authorizedActions.has(privilege),
              })),
            },
          })
        )
      ),
    },
  } as unknown as OsqueryAppContext['security'];
};

const createOsqueryContext = (options?: {
  getIntegrationNamespaces?: jest.Mock;
  useRbac?: boolean;
  authorizedPrivileges?: string[];
}): OsqueryAppContext =>
  ({
    logFactory: { get: () => loggingSystemMock.createLogger() },
    experimentalFeatures: allowedExperimentalValues,
    security: createSecurityMock(options),
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
    mockOpenPointInTime.mockResolvedValue({ id: 'mock-pit-id' });
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

  it('passes integrationNamespaces to baseRequest when getIntegrationNamespaces returns namespaces', async () => {
    const getIntegrationNamespaces = jest.fn().mockResolvedValue({
      [OSQUERY_INTEGRATION_NAME]: ['team.a'],
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
        baseRequest: expect.objectContaining({
          integrationNamespaces: ['team.a'],
        }),
      })
    );
  });

  it('passes agentIds to baseRequest when agentIds are provided', async () => {
    const handler = createExportRouteHandler(createOsqueryContext());
    const response = httpServerMock.createResponseFactory();
    const request = createExportRequest({
      query: { format: 'ndjson' },
      body: { agentIds: ['agent-1', 'host/with:special'] },
    });

    await handler(createContext(), request, response, baseParams);

    expect(mockExportResultsToStream).toHaveBeenCalledWith(
      expect.objectContaining({
        baseRequest: expect.objectContaining({
          agentIds: ['agent-1', 'host/with:special'],
        }),
      })
    );
    expect(response.ok).toHaveBeenCalled();
  });

  it('passes validated esFilters to baseRequest', async () => {
    const handler = createExportRouteHandler(createOsqueryContext());
    const response = httpServerMock.createResponseFactory();
    const esFilter = {
      meta: { negate: true, type: 'phrase', key: 'osquery.uid', params: { query: '0' } },
      query: { match_phrase: { 'osquery.uid': '0' } },
    };
    const request = createExportRequest({
      query: { format: 'ndjson' },
      body: { esFilters: [esFilter] },
    });

    await handler(createContext(), request, response, baseParams);

    expect(mockExportResultsToStream).toHaveBeenCalledWith(
      expect.objectContaining({
        baseRequest: expect.objectContaining({
          esFilters: [esFilter],
        }),
      })
    );
    expect(response.ok).toHaveBeenCalled();
  });

  it('forwards a user kuery unchanged and preserves baseFilter scoping', async () => {
    const handler = createExportRouteHandler(createOsqueryContext());
    const response = httpServerMock.createResponseFactory();
    // A user kuery containing a top-level OR. The handler validates the composed
    // filter `(${baseFilter}) AND (${kuery})`, which is syntactically valid, so no 400
    // is returned and the raw kuery is forwarded unchanged to the factory, which wraps
    // each part in its own parentheses when composing the final query.
    const request = createExportRequest({
      query: { format: 'ndjson' },
      body: { kuery: 'host.name: "a" OR action_id: "other"' },
    });

    await handler(createContext(), request, response, baseParams);

    expect(response.badRequest).not.toHaveBeenCalled();
    expect(response.ok).toHaveBeenCalled();

    const baseRequest = mockExportResultsToStream.mock.calls[0][0].baseRequest;
    // The base filter is passed unchanged; the factory composes it into the query.
    expect(baseRequest?.baseFilter).toBe('action_id: "abc"');
    // The raw user kuery is forwarded; the factory wraps it in its own parentheses.
    expect(baseRequest?.kuery).toBe('host.name: "a" OR action_id: "other"');
  });

  it('opens PIT via asInternalUser and passes it to exportResultsToStream', async () => {
    const handler = createExportRouteHandler(createOsqueryContext());
    const response = httpServerMock.createResponseFactory();
    const request = createExportRequest({
      query: { format: 'ndjson' },
      body: {},
    });

    await handler(createContext(), request, response, baseParams);

    // Handler opens PIT with the broad index pattern (array shape) when no
    // integration namespaces are resolved.
    expect(mockOpenPointInTime).toHaveBeenCalledWith(
      expect.objectContaining({
        index: [`logs-${OSQUERY_INTEGRATION_NAME}.result*`],
        keep_alive: '5m',
        ignore_unavailable: true,
      })
    );

    // PIT id is forwarded to the stream module
    expect(mockExportResultsToStream).toHaveBeenCalledWith(
      expect.objectContaining({
        pit: { id: 'mock-pit-id', keep_alive: '5m' },
      })
    );
  });

  it('scopes the PIT to resolved integration namespaces (matches the factory targets)', async () => {
    const getIntegrationNamespaces = jest.fn().mockResolvedValue({
      [OSQUERY_INTEGRATION_NAME]: ['team.a', 'team.b'],
    });
    const handler = createExportRouteHandler(createOsqueryContext({ getIntegrationNamespaces }));
    const response = httpServerMock.createResponseFactory();
    const request = createExportRequest({
      query: { format: 'ndjson' },
      body: {},
    });

    await handler(createContext(), request, response, baseParams);

    // The PIT must scan the same namespace-scoped targets the factory sets on the
    // search body — ES ignores the body `index` once a PIT is present.
    expect(mockOpenPointInTime).toHaveBeenCalledWith(
      expect.objectContaining({
        index: [
          `logs-${OSQUERY_INTEGRATION_NAME}.result-team.a`,
          `logs-${OSQUERY_INTEGRATION_NAME}.result-team.b`,
        ],
        ignore_unavailable: true,
      })
    );
  });

  it('returns a 400 (not 500) and opens no PIT when a resolved namespace is invalid', async () => {
    const getIntegrationNamespaces = jest.fn().mockResolvedValue({
      // A colon is not valid in a namespace; the index builder rejects it and
      // the route surfaces a 400 rather than a masked 500.
      [OSQUERY_INTEGRATION_NAME]: ['bad:namespace'],
    });
    const handler = createExportRouteHandler(createOsqueryContext({ getIntegrationNamespaces }));
    const response = httpServerMock.createResponseFactory();
    const request = createExportRequest({
      query: { format: 'ndjson' },
      body: {},
    });

    await handler(createContext(), request, response, baseParams);

    expect(response.customError).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        body: { message: 'Invalid integration namespace' },
      })
    );
    expect(mockOpenPointInTime).not.toHaveBeenCalled();
    expect(mockExportResultsToStream).not.toHaveBeenCalled();
  });

  it('returns 403 and never opens a PIT when the caller lacks osquery read access', async () => {
    const handler = createExportRouteHandler(
      createOsqueryContext({ useRbac: true, authorizedPrivileges: [] })
    );
    const response = httpServerMock.createResponseFactory();
    const request = createExportRequest({
      query: { format: 'ndjson' },
      body: {},
    });

    await handler(createContext(), request, response, baseParams);

    expect(response.forbidden).toHaveBeenCalled();
    // No PIT is allocated when the caller lacks read access.
    expect(mockOpenPointInTime).not.toHaveBeenCalled();
    expect(mockClosePointInTime).not.toHaveBeenCalled();
    expect(mockExportResultsToStream).not.toHaveBeenCalled();
    expect(auditLoggerLog).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Osquery export failed',
        event: expect.objectContaining({ outcome: 'failure' }),
      })
    );
  });

  it('opens the PIT when the caller holds only osquery-readLiveQueries', async () => {
    const handler = createExportRouteHandler(
      createOsqueryContext({ useRbac: true, authorizedPrivileges: ['osquery-readLiveQueries'] })
    );
    const response = httpServerMock.createResponseFactory();
    const request = createExportRequest({
      query: { format: 'ndjson' },
      body: {},
    });

    await handler(createContext(), request, response, baseParams);

    expect(response.forbidden).not.toHaveBeenCalled();
    expect(mockOpenPointInTime).toHaveBeenCalled();
    expect(response.ok).toHaveBeenCalled();
  });

  it('passes context.search client to exportResultsToStream', async () => {
    const handler = createExportRouteHandler(createOsqueryContext());
    const response = httpServerMock.createResponseFactory();
    const request = createExportRequest({
      query: { format: 'ndjson' },
      body: {},
    });

    await handler(createContext(), request, response, baseParams);

    expect(mockExportResultsToStream).toHaveBeenCalledWith(
      expect.objectContaining({ search: mockSearch })
    );
  });

  it('passes baseRequest with factoryQueryType exportResults', async () => {
    const handler = createExportRouteHandler(createOsqueryContext());
    const response = httpServerMock.createResponseFactory();
    const request = createExportRequest({
      query: { format: 'ndjson' },
      body: {},
    });

    await handler(createContext(), request, response, baseParams);

    expect(mockExportResultsToStream).toHaveBeenCalledWith(
      expect.objectContaining({
        baseRequest: expect.objectContaining({
          factoryQueryType: OsqueryQueries.exportResults,
        }),
      })
    );
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

  it('returns badRequest when esFilters is not a filters array shape', async () => {
    const handler = createExportRouteHandler(createOsqueryContext());
    const response = httpServerMock.createResponseFactory();
    const request = createExportRequest({
      query: { format: 'csv' },
      body: {
        esFilters: [{ foo: 'bar' }],
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

  it('closes PIT and returns 500 when getUserInfo throws after PIT is opened', async () => {
    mockGetUserInfo.mockRejectedValueOnce(new Error('Auth backend failure'));
    const handler = createExportRouteHandler(createOsqueryContext());
    const response = httpServerMock.createResponseFactory();
    const request = createExportRequest({
      query: { format: 'ndjson' },
      body: {},
    });

    await handler(createContext(), request, response, baseParams);

    expect(mockClosePointInTime).toHaveBeenCalledWith({ id: 'mock-pit-id' });
    expect(response.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 500 }));
    expect(mockExportResultsToStream).not.toHaveBeenCalled();
  });

  it('closes PIT and returns 500 when createFormatter throws after PIT is opened', async () => {
    mockCreateFormatter.mockImplementationOnce(() => {
      throw new Error('Formatter init failure');
    });
    const handler = createExportRouteHandler(createOsqueryContext());
    const response = httpServerMock.createResponseFactory();
    const request = createExportRequest({
      query: { format: 'ndjson' },
      body: {},
    });

    await handler(createContext(), request, response, baseParams);

    expect(mockClosePointInTime).toHaveBeenCalledWith({ id: 'mock-pit-id' });
    expect(response.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 500 }));
    expect(mockExportResultsToStream).not.toHaveBeenCalled();
  });

  it('closes PIT and returns 500 when context.search rejects after PIT is opened', async () => {
    const context = {
      ...createContext(),
      search: Promise.reject(new Error('Search context unavailable')),
    } as unknown as ReturnType<typeof createContext>;

    const handler = createExportRouteHandler(createOsqueryContext());
    const response = httpServerMock.createResponseFactory();
    const request = createExportRequest({
      query: { format: 'ndjson' },
      body: {},
    });

    await handler(context, request, response, baseParams);

    expect(mockClosePointInTime).toHaveBeenCalledWith({ id: 'mock-pit-id' });
    expect(response.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 500 }));
    expect(mockExportResultsToStream).not.toHaveBeenCalled();
  });

  it('returns 500 when openPointInTime throws (no closePit needed)', async () => {
    mockOpenPointInTime.mockRejectedValueOnce(
      Object.assign(new Error('ES cluster unavailable'), { statusCode: 503 })
    );
    const handler = createExportRouteHandler(createOsqueryContext());
    const response = httpServerMock.createResponseFactory();
    const request = createExportRequest({
      query: { format: 'ndjson' },
      body: {},
    });

    await handler(createContext(), request, response, baseParams);

    expect(mockClosePointInTime).not.toHaveBeenCalled();
    expect(response.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 503 }));
  });

  it('audits a failure event when the export fails after PIT open', async () => {
    mockGetUserInfo.mockRejectedValueOnce(new Error('Auth failure'));
    const handler = createExportRouteHandler(createOsqueryContext());
    const response = httpServerMock.createResponseFactory();
    const request = createExportRequest({
      query: { format: 'csv' },
      body: {},
    });

    await handler(createContext(), request, response, baseParams);

    expect(auditLoggerLog).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Osquery export failed',
        event: expect.objectContaining({
          action: 'osquery_export',
          outcome: 'failure',
        }),
        labels: expect.objectContaining({
          action_id: 'abc',
        }),
      })
    );
  });
});

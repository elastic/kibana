/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { httpServerMock } from '@kbn/core/server/mocks';
import { SortDirection } from '@kbn/data-plugin/common';
import type { KibanaRequest } from '@kbn/core/server';
import type { SavedReport } from '@kbn/reporting-plugin/server/lib/store';

import { FleetError } from '../../errors';
import { appContextService } from '../../services/app_context';
import { buildAgentStatusRuntimeField } from '../../services/agents/build_status_runtime_field';
import { isSpaceAwarenessEnabled } from '../../services/spaces/helpers';
import type {
  FleetRequestHandlerContext,
  PostGenerateAgentsReportRequestSchema,
} from '../../types';
import { xpackMocks, createAppContextStartContractMock } from '../../mocks';

import { generateReportHandler, getSortFieldForAPI } from './generate_report_handler';

jest.mock('../../services/agents/build_status_runtime_field');
jest.mock('../../services/spaces/helpers');

const mockBuildAgentStatusRuntimeField = buildAgentStatusRuntimeField as jest.Mock;
const baseRequestBodyMock = {
  agents: ['agent1', 'agent2'],
  fields: ['id', 'status', 'enrolled_at'],
  timezone: 'UTC',
  sort: { field: 'enrolled_at', direction: 'desc' },
};

const expectedNamespacesFilterQuery = {
  bool: {
    should: [
      {
        bool: {
          should: [
            {
              match_phrase: {
                namespaces: 'default',
              },
            },
          ],
          minimum_should_match: 1,
        },
      },
      {
        bool: {
          should: [
            {
              match_phrase: {
                namespaces: '*',
              },
            },
          ],
          minimum_should_match: 1,
        },
      },
      {
        bool: {
          must_not: {
            bool: {
              should: [
                {
                  exists: {
                    field: 'namespaces',
                  },
                },
              ],
              minimum_should_match: 1,
            },
          },
        },
      },
    ],
    minimum_should_match: 1,
  },
};

const expectedAgentIdFilterQuery = {
  bool: {
    filter: [
      {
        bool: {
          should: [
            {
              bool: {
                should: [
                  {
                    match: {
                      'agent.id': 'agent1',
                    },
                  },
                ],
                minimum_should_match: 1,
              },
            },
            {
              bool: {
                should: [
                  {
                    match: {
                      'agent.id': 'agent2',
                    },
                  },
                ],
                minimum_should_match: 1,
              },
            },
          ],
          minimum_should_match: 1,
        },
      },
      expectedNamespacesFilterQuery,
    ],
  },
};

const expectedKueryFilterQuery = {
  bool: {
    filter: [
      {
        bool: {
          should: [
            {
              match: {
                status: 'online',
              },
            },
          ],
          minimum_should_match: 1,
        },
      },
      {
        bool: {
          should: [
            {
              match: {
                policy_id: 'policy1',
              },
            },
          ],
          minimum_should_match: 1,
        },
      },
      expectedNamespacesFilterQuery,
    ],
  },
};

describe('generateReportHandler', () => {
  let mockResponse: ReturnType<typeof httpServerMock.createResponseFactory>;
  let mockRequest: jest.Mocked<
    KibanaRequest<
      Record<string, string>,
      null,
      TypeOf<typeof PostGenerateAgentsReportRequestSchema.body>
    >
  >;
  let mockContext: FleetRequestHandlerContext;

  beforeEach(() => {
    mockResponse = httpServerMock.createResponseFactory();
    mockRequest = httpServerMock.createKibanaRequest({
      body: baseRequestBodyMock,
    });

    mockContext = xpackMocks.createRequestHandlerContext() as unknown as FleetRequestHandlerContext;
    appContextService.start(createAppContextStartContractMock());

    jest
      .mocked(appContextService.getReportingStart()?.handleGenerateSystemReportRequest)
      ?.mockImplementation(async (path, config, handleResponse) => {
        return handleResponse({
          report: {} as SavedReport,
          downloadUrl: 'http://example.com/report.csv',
        });
      });

    mockBuildAgentStatusRuntimeField.mockResolvedValue({
      status: {
        script: {
          source: 'emit("online")',
        },
      },
    });

    jest.mocked(isSpaceAwarenessEnabled).mockResolvedValue(true);
  });

  afterEach(() => {
    appContextService.stop();
    jest.clearAllMocks();
  });

  describe('successful report generation', () => {
    it('should generate report with array of agent IDs', async () => {
      await generateReportHandler(mockContext, mockRequest, mockResponse);

      expect(
        appContextService.getReportingStart()?.handleGenerateSystemReportRequest
      ).toHaveBeenCalledWith(
        '/internal/fleet/agents/reporting/generate',
        expect.objectContaining({
          request: mockRequest,
          response: mockResponse,
          context: mockContext,
          reportParams: expect.objectContaining({
            title: 'Agent List',
            timezone: 'UTC',
            searchSource: expect.objectContaining({
              fields: ['id', 'status', 'enrolled_at'],
              filter: expect.arrayContaining([
                expect.objectContaining({
                  meta: expect.objectContaining({
                    index: 'fleet-agents',
                  }),
                  query: expect.objectContaining(expectedAgentIdFilterQuery),
                }),
              ]),
            }),
          }),
        }),
        expect.any(Function)
      );

      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: { url: 'http://example.com/report.csv' },
      });
    });

    it('should generate report with kuery string', async () => {
      mockRequest = httpServerMock.createKibanaRequest({
        body: {
          ...baseRequestBodyMock,
          agents: 'status:online AND policy_id:policy1',
        },
      });

      await generateReportHandler(mockContext, mockRequest, mockResponse);

      expect(
        appContextService.getReportingStart()?.handleGenerateSystemReportRequest
      ).toHaveBeenCalledWith(
        '/internal/fleet/agents/reporting/generate',
        expect.objectContaining({
          request: mockRequest,
          response: mockResponse,
          context: mockContext,
          reportParams: expect.objectContaining({
            title: 'Agent List',
            timezone: 'UTC',
            searchSource: expect.objectContaining({
              fields: ['id', 'status', 'enrolled_at'],
              filter: expect.arrayContaining([
                expect.objectContaining({
                  meta: expect.objectContaining({
                    index: 'fleet-agents',
                  }),
                  query: expect.objectContaining(expectedKueryFilterQuery),
                }),
              ]),
            }),
          }),
        }),
        expect.any(Function)
      );
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: { url: 'http://example.com/report.csv' },
      });
    });

    it('should use default sort when sort options not provided', async () => {
      mockRequest = httpServerMock.createKibanaRequest({
        body: {
          ...baseRequestBodyMock,
          sort: undefined,
        },
      });

      await generateReportHandler(mockContext, mockRequest, mockResponse);

      expect(
        appContextService.getReportingStart()?.handleGenerateSystemReportRequest
      ).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          reportParams: expect.objectContaining({
            searchSource: expect.objectContaining({
              sort: expect.arrayContaining([{ enrolled_at: { order: SortDirection.desc } }]),
            }),
          }),
        }),
        expect.any(Function)
      );
    });

    it('should handle custom sort field and direction', async () => {
      mockRequest = httpServerMock.createKibanaRequest({
        body: {
          ...baseRequestBodyMock,
          sort: { field: 'local_metadata.host.hostname', direction: 'asc' },
        },
      });

      await generateReportHandler(mockContext, mockRequest, mockResponse);

      expect(
        appContextService.getReportingStart()?.handleGenerateSystemReportRequest
      ).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          reportParams: expect.objectContaining({
            searchSource: expect.objectContaining({
              sort: expect.arrayContaining([
                { 'local_metadata.host.hostname.keyword': { order: SortDirection.asc } },
              ]),
            }),
          }),
        }),
        expect.any(Function)
      );
    });

    it('should include runtime fields for agent status', async () => {
      const mockRuntimeScript = 'if (doc["last_checkin"].size() > 0) { emit("online") }';
      mockBuildAgentStatusRuntimeField.mockResolvedValue({
        status: {
          script: {
            source: mockRuntimeScript,
          },
        },
      });

      await generateReportHandler(mockContext, mockRequest, mockResponse);

      expect(
        appContextService.getReportingStart()?.handleGenerateSystemReportRequest
      ).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          reportParams: expect.objectContaining({
            searchSource: expect.objectContaining({
              index: expect.objectContaining({
                runtimeFieldMap: expect.objectContaining({
                  status: expect.objectContaining({
                    script: expect.objectContaining({
                      source: mockRuntimeScript,
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
        expect.any(Function)
      );
    });
  });

  describe('error handling', () => {
    it('should throw FleetError when report generation fails', async () => {
      const errorMessage = 'Report generation failed!';
      jest
        .mocked(appContextService.getReportingStart()!.handleGenerateSystemReportRequest)
        .mockRejectedValue(new Error(errorMessage));

      await expect(generateReportHandler(mockContext, mockRequest, mockResponse)).rejects.toThrow(
        new FleetError(`Failed to generate report: ${errorMessage}`)
      );

      expect(appContextService.getLogger().error).toHaveBeenCalledWith(
        `Failed to generate report: ${errorMessage}`
      );
    });

    it('should handle reporting callback with error', async () => {
      const callbackError = new Error('Callback error');
      jest
        .mocked(appContextService.getReportingStart()!.handleGenerateSystemReportRequest)
        .mockImplementation(async (path, config, handleResponse) => {
          return handleResponse(null, callbackError);
        });

      await expect(generateReportHandler(mockContext, mockRequest, mockResponse)).rejects.toThrow(
        new FleetError(`Failed to generate report: ${callbackError.message}`)
      );
      expect(appContextService.getLogger().error).toHaveBeenCalledWith(
        `Failed to generate report: ${callbackError.message}`
      );
    });

    it('should throw FleetError when reporting callback returns no result', async () => {
      jest
        .mocked(appContextService.getReportingStart()!.handleGenerateSystemReportRequest)
        .mockImplementation(async (path, config, handleResponse) => {
          return handleResponse(null);
        });
      await expect(generateReportHandler(mockContext, mockRequest, mockResponse)).rejects.toThrow(
        new FleetError('Failed to generate report: Report generation encountered an unknown error')
      );
      expect(appContextService.getLogger().error).toHaveBeenCalledWith(
        'Failed to generate report: Report generation encountered an unknown error'
      );
    });
  });
});

describe('getSortFieldForAPI', () => {
  it('should append .keyword suffix for version field', () => {
    expect(getSortFieldForAPI('local_metadata.elastic.agent.version')).toBe(
      'local_metadata.elastic.agent.version.keyword'
    );
  });

  it('should append .keyword suffix for hostname field', () => {
    expect(getSortFieldForAPI('local_metadata.host.hostname')).toBe(
      'local_metadata.host.hostname.keyword'
    );
  });

  it('should return field as-is for other fields', () => {
    expect(getSortFieldForAPI('enrolled_at')).toBe('enrolled_at');
    expect(getSortFieldForAPI('status')).toBe('status');
    expect(getSortFieldForAPI('policy_id')).toBe('policy_id');
  });
});

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
      // Space filter comes first (spaceFilter is prepended to the _joinFilters array)
      expectedNamespacesFilterQuery,
      {
        bool: {
          should: [
            {
              bool: {
                should: [
                  {
                    // Quoted agent ids compile to match_phrase (not match)
                    match_phrase: {
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
                    match_phrase: {
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
    ],
  },
};

// _joinFilters parses each input string into its own AST node before AND-joining them.
// 'status:online AND policy_id:policy1' is parsed as a single and-node, so the outer
// bool.filter has exactly 2 members: [namespaceFilter, andNode(status, policy_id)].
const expectedKueryFilterQuery = {
  bool: {
    filter: [
      // Space filter comes first (spaceFilter is prepended to the _joinFilters array)
      expectedNamespacesFilterQuery,
      // The user kuery 'status:online AND policy_id:policy1' is parsed as one AST node
      // whose inner AND is represented as a nested bool.filter.
      {
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
          ],
        },
      },
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

  describe('space awareness filter injection (security regression)', () => {
    // Helper: extract the ES DSL query from the first reporting call.
    const getFilterQuery = () => {
      const mock = jest.mocked(
        appContextService.getReportingStart()!.handleGenerateSystemReportRequest
      );
      const reportParams = mock.mock.calls[0][1].reportParams as {
        searchSource: { filter: Array<{ query: unknown }> };
      };
      return reportParams.searchSource.filter[0].query as {
        bool?: { filter?: unknown[]; should?: unknown[] };
      };
    };

    it('OR-leading kuery cannot bypass the space filter (string branch)', async () => {
      mockRequest = httpServerMock.createKibanaRequest({
        body: { ...baseRequestBodyMock, agents: 'namespaces:* OR agent.id:no-such-agent' },
      });

      await generateReportHandler(mockContext, mockRequest, mockResponse);

      const query = getFilterQuery();
      // Top-level must be bool.filter (AND), never bool.should (OR).
      expect(query.bool?.should).toBeUndefined();
      expect(Array.isArray(query.bool?.filter)).toBe(true);
      expect((query.bool?.filter as unknown[]).length).toBe(2);
      // The space (namespace) filter must be present and be the first member.
      expect((query.bool?.filter as unknown[])[0]).toEqual(expectedNamespacesFilterQuery);
    });

    it('OR-leading kuery cannot bypass the space filter when space awareness is disabled', async () => {
      jest.mocked(isSpaceAwarenessEnabled).mockResolvedValue(false);
      mockRequest = httpServerMock.createKibanaRequest({
        body: { ...baseRequestBodyMock, agents: 'namespaces:* OR agent.id:no-such-agent' },
      });

      await generateReportHandler(mockContext, mockRequest, mockResponse);

      const query = getFilterQuery();
      // When space awareness is off, _joinFilters receives only the user kuery (no space filter),
      // and returns it as a single node. The result must not be wrapped in a bool.filter
      // (which would indicate a spurious extra filter was applied), and the query must be
      // defined (i.e. the handler did not short-circuit).
      expect(query).toBeDefined();
      // Without a space filter the top-level node is the raw OR node from the user kuery:
      // bool.should with 2 members (namespaces:* compiles to exists, agent.id:... to match_phrase).
      // There must be no outer bool.filter wrapping it — that would only exist if a space filter
      // had been AND-joined around it.
      expect(query.bool?.filter).toBeUndefined();
      expect(Array.isArray(query.bool?.should)).toBe(true);
      expect((query.bool?.should as unknown[]).length).toBe(2);
    });

    it('KQL metacharacters in array agent ids are escaped, not injected', async () => {
      mockRequest = httpServerMock.createKibanaRequest({
        body: {
          ...baseRequestBodyMock,
          agents: ['a) or namespaces:* or (b', 'agent"quoted', 'back\\slash'],
        },
      });

      await generateReportHandler(mockContext, mockRequest, mockResponse);

      const query = getFilterQuery();
      // Must be a bool.filter (AND), not a bool.should (OR leak).
      expect(query.bool?.should).toBeUndefined();
      expect(Array.isArray(query.bool?.filter)).toBe(true);
      // First member: space filter. Second member: the agent id OR-list.
      expect((query.bool?.filter as unknown[]).length).toBe(2);
      const agentsPart = (query.bool?.filter as Array<{ bool: { should: unknown[] } }>)[1];
      // The agent ids should produce exactly 3 match_phrase clauses (one per id), not more.
      expect(agentsPart.bool.should.length).toBe(3);
      // The cross-space leak field must not appear outside the namespace filter subtree.
      const agentsStr = JSON.stringify(agentsPart);
      expect(agentsStr).not.toContain('"namespaces"');
    });

    it('bare KQL keywords used as agent ids are treated as literals when quoted', async () => {
      mockRequest = httpServerMock.createKibanaRequest({
        body: { ...baseRequestBodyMock, agents: ['and', 'or', 'not', 'agent one'] },
      });

      // Should not throw (keywords become literals inside quotes)
      await expect(
        generateReportHandler(mockContext, mockRequest, mockResponse)
      ).resolves.not.toThrow();

      const query = getFilterQuery();
      const agentsPart = (query.bool?.filter as Array<{ bool: { should: unknown[] } }>)[1];
      expect(agentsPart.bool.should.length).toBe(4);
    });

    it('space awareness disabled — no space filter applied for kuery', async () => {
      jest.mocked(isSpaceAwarenessEnabled).mockResolvedValue(false);
      mockRequest = httpServerMock.createKibanaRequest({
        body: { ...baseRequestBodyMock, agents: 'status:online' },
      });

      await generateReportHandler(mockContext, mockRequest, mockResponse);

      const query = getFilterQuery();
      const queryStr = JSON.stringify(query);
      // No namespace constraint should appear in the DSL.
      expect(queryStr).not.toContain('namespaces');
    });

    it('empty agents array throws FleetError with a clear message before touching reporting', async () => {
      mockRequest = httpServerMock.createKibanaRequest({
        body: { ...baseRequestBodyMock, agents: [] },
      });

      await expect(generateReportHandler(mockContext, mockRequest, mockResponse)).rejects.toThrow(
        new FleetError('At least one agent id must be provided')
      );
      expect(
        appContextService.getReportingStart()?.handleGenerateSystemReportRequest
      ).not.toHaveBeenCalled();
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

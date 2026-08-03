/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, httpServerMock } from '@kbn/core/server/mocks';
import { errors } from '@elastic/elasticsearch';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';

import { appContextService } from '../../services';

import {
  getAgentStatusForAgentPolicy,
  getIncomingDataByAgentsId,
  getIncomingDataByDataStreams,
} from '../../services/agents/status';
import { agentPolicyService } from '../../services/agent_policy';
import { fetchAndAssignAgentMetrics } from '../../services/agents/agent_metrics';
import { getPackageInfo } from '../../services/epm/packages';

import { getAgentEffectiveConfigHandler, getAgentDataHandler } from './handlers';

import {
  getAgentStatusForAgentPolicyHandler,
  getAvailableVersionsHandler,
  getAgentsHandler,
} from './handlers';

jest.mock('../../services/agents/versions', () => {
  return {
    getAvailableVersions: jest.fn().mockReturnValue(['8.1.0', '8.0.0', '7.17.0']),
  };
});

jest.mock('../../services/app_context', () => {
  const { loggerMock } = jest.requireActual('@kbn/logging-mocks');
  return {
    appContextService: {
      getLogger: () => loggerMock.create(),
      getInternalUserESClient: jest.fn(),
      getExperimentalFeatures: jest.fn(),
    },
  };
});

jest.mock('../../services/spaces/helpers', () => ({
  isSpaceAwarenessEnabled: jest.fn().mockReturnValue(true),
}));

jest.mock('../../services/agents/status', () => ({
  getAgentStatusForAgentPolicy: jest.fn(),
  getIncomingDataByAgentsId: jest.fn(),
  getIncomingDataByDataStreams: jest.fn(),
}));

jest.mock('../../services/agent_policy', () => ({
  agentPolicyService: {
    getByIds: jest.fn(),
  },
}));

jest.mock('../../services/agents/agent_metrics', () => ({
  fetchAndAssignAgentMetrics: jest.fn(),
}));

jest.mock('../../services/epm/packages', () => ({
  getPackageInfo: jest.fn(),
}));

describe('Handlers', () => {
  // Helper function to create mock Elasticsearch errors
  const createMockESError = (errorBody: any, statusCode: number = 400) => {
    const error = new Error('ResponseError') as any;
    error.meta = {
      body: errorBody,
      statusCode,
    };
    Object.setPrototypeOf(error, errors.ResponseError.prototype);
    return error;
  };

  describe('getAgentsHandler', () => {
    let mockAgentClient: any;
    let mockContext: any;
    let mockResponse: any;

    beforeEach(() => {
      mockAgentClient = {
        asCurrentUser: {
          listAgents: jest.fn(),
        },
      };

      mockContext = {
        core: Promise.resolve(coreMock.createRequestHandlerContext()),
        fleet: Promise.resolve({
          agentClient: mockAgentClient,
        }),
      };

      mockResponse = httpServerMock.createResponseFactory();
      (fetchAndAssignAgentMetrics as jest.Mock).mockClear();
    });

    it('should handle successful agent listing', async () => {
      const mockAgents = [
        { id: 'agent1', enrolled_at: '2023-01-01' },
        { id: 'agent2', enrolled_at: '2023-01-02' },
      ];

      mockAgentClient.asCurrentUser.listAgents.mockResolvedValue({
        agents: mockAgents,
        total: 2,
        page: 1,
        perPage: 20,
      });

      const request = {
        query: {
          page: 1,
          perPage: 20,
          sortField: 'enrolled_at',
          sortOrder: 'desc',
        },
      };

      await getAgentsHandler(mockContext, request as any, mockResponse);

      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: {
          items: mockAgents,
          total: 2,
          page: 1,
          perPage: 20,
        },
      });
    });

    it('should let ES parsing errors bubble up to global error handler', async () => {
      const elasticsearchError = createMockESError({
        error: {
          type: 'parsing_exception',
          reason: 'Invalid query syntax',
        },
      });

      mockAgentClient.asCurrentUser.listAgents.mockRejectedValue(elasticsearchError);

      const request = {
        query: {
          sortField: 'invalid_field',
        },
      };

      await expect(getAgentsHandler(mockContext, request as any, mockResponse)).rejects.toEqual(
        elasticsearchError
      );
    });

    it('should let ES argument errors bubble up to global error handler', async () => {
      const elasticsearchError = createMockESError({
        error: {
          type: 'illegal_argument_exception',
          reason: 'No mapping found for [non_existent_field] in order to sort on',
        },
      });

      mockAgentClient.asCurrentUser.listAgents.mockRejectedValue(elasticsearchError);

      const request = {
        query: {
          sortField: 'non_existent_field',
        },
      };

      await expect(getAgentsHandler(mockContext, request as any, mockResponse)).rejects.toEqual(
        elasticsearchError
      );
    });

    it('should let search_phase_execution_exception errors bubble up to global error handler', async () => {
      const elasticsearchError = createMockESError({
        error: {
          type: 'search_phase_execution_exception',
          reason: 'Unknown field [bad_field]',
        },
      });

      mockAgentClient.asCurrentUser.listAgents.mockRejectedValue(elasticsearchError);

      const request = {
        query: {
          sortField: 'bad_field',
        },
      };

      await expect(getAgentsHandler(mockContext, request as any, mockResponse)).rejects.toEqual(
        elasticsearchError
      );
    });

    it('should let field mapping errors bubble up to global error handler', async () => {
      const elasticsearchError = createMockESError({
        error: {
          type: 'some_error_type',
          reason: 'No mapping found for field [invalid_field]',
        },
      });

      mockAgentClient.asCurrentUser.listAgents.mockRejectedValue(elasticsearchError);

      const request = {
        query: {
          sortField: 'invalid_field',
        },
      };

      await expect(getAgentsHandler(mockContext, request as any, mockResponse)).rejects.toEqual(
        elasticsearchError
      );
    });

    it('should let unknown field errors bubble up to global error handler', async () => {
      const elasticsearchError = createMockESError({
        error: {
          type: 'some_error_type',
          reason: 'Unknown field [mystery_field] in sort criteria',
        },
      });

      mockAgentClient.asCurrentUser.listAgents.mockRejectedValue(elasticsearchError);

      const request = {
        query: {
          sortField: 'mystery_field',
        },
      };

      await expect(getAgentsHandler(mockContext, request as any, mockResponse)).rejects.toEqual(
        elasticsearchError
      );
    });

    it('should re-throw non-validation errors', async () => {
      const systemError = new Error('System error');

      mockAgentClient.asCurrentUser.listAgents.mockRejectedValue(systemError);

      const request = {
        query: {
          sortField: 'enrolled_at',
        },
      };

      await expect(getAgentsHandler(mockContext, request as any, mockResponse)).rejects.toThrow(
        'System error'
      );
    });

    it('should re-throw elasticsearch errors that are not validation errors', async () => {
      const elasticsearchError = createMockESError({
        error: {
          type: 'cluster_block_exception',
          reason: 'Cluster is read-only',
        },
      });

      mockAgentClient.asCurrentUser.listAgents.mockRejectedValue(elasticsearchError);

      const request = {
        query: {
          sortField: 'enrolled_at',
        },
      };

      await expect(getAgentsHandler(mockContext, request as any, mockResponse)).rejects.toEqual(
        elasticsearchError
      );
    });

    it('should let root_cause errors bubble up to global error handler', async () => {
      const elasticsearchError = createMockESError({
        error: {
          type: 'search_phase_execution_exception',
          reason: 'all shards failed',
          root_cause: [
            {
              type: 'illegal_argument_exception',
              reason: 'No mapping found for [hostname] in order to sort on',
            },
          ],
        },
      });

      mockAgentClient.asCurrentUser.listAgents.mockRejectedValue(elasticsearchError);

      const request = {
        query: {
          sortField: 'hostname',
        },
      };

      await expect(getAgentsHandler(mockContext, request as any, mockResponse)).rejects.toEqual(
        elasticsearchError
      );
    });

    it('should let errors with missing reasons bubble up to global error handler', async () => {
      const elasticsearchError = createMockESError({
        error: {
          type: 'parsing_exception',
          // no reason provided
        },
      });

      mockAgentClient.asCurrentUser.listAgents.mockRejectedValue(elasticsearchError);

      const request = {
        query: {
          sortField: 'invalid_field',
        },
      };

      await expect(getAgentsHandler(mockContext, request as any, mockResponse)).rejects.toEqual(
        elasticsearchError
      );
    });
  });

  describe('getAgentStatusForAgentPolicyHandler', () => {
    it.each([
      { requested: 'policy-id-1', called: ['policy-id-1'] },
      { requested: ['policy-id-2'], called: ['policy-id-2'] },
      { requested: ['policy-id-3', 'policy-id-4'], called: ['policy-id-3', 'policy-id-4'] },
      ...[undefined, '', []].map((requested) => ({ requested, called: undefined })),
    ])('calls getAgentStatusForAgentPolicy with correct parameters', async (item) => {
      const request = {
        query: {
          policyId: 'policy-id',
          kuery: 'kuery',
          policyIds: item.requested,
        },
      };
      const response = httpServerMock.createResponseFactory();

      await getAgentStatusForAgentPolicyHandler(
        {
          core: coreMock.createRequestHandlerContext(),
          fleet: { internalSoClient: {} },
        } as any,
        request as any,
        response
      );

      expect(getAgentStatusForAgentPolicy).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        'policy-id',
        'kuery',
        undefined,
        item.called
      );
    });
  });

  describe('getAvailableVersionsHandler', () => {
    it('should return the value from getAvailableVersions', async () => {
      const ctx = coreMock.createCustomRequestHandlerContext(
        coreMock.createRequestHandlerContext()
      );
      const response = httpServerMock.createResponseFactory();

      await getAvailableVersionsHandler(ctx, httpServerMock.createKibanaRequest(), response);

      expect(response.ok).toBeCalled();
      expect(response.ok.mock.calls[0][0]?.body).toEqual({
        items: ['8.1.0', '8.0.0', '7.17.0'],
      });
    });
  });

  describe('getAgentEffectiveConfigHandler', () => {
    let mockContext: any;
    let mockResponse: any;
    let mockEsClient: any;
    let mockSoClient: any;
    let mockGetInternalUserESClient: jest.Mock;

    beforeEach(() => {
      mockEsClient = {
        get: jest.fn(),
      };
      mockSoClient = {
        getCurrentNamespace: jest.fn().mockReturnValue('default'),
      };
      mockGetInternalUserESClient = jest.fn().mockReturnValue(mockEsClient);
      mockResponse = httpServerMock.createResponseFactory();
      mockContext = {
        core: Promise.resolve({
          savedObjects: { client: mockSoClient },
        }),
        fleet: Promise.resolve({}),
      };
      jest
        .spyOn(appContextService, 'getInternalUserESClient')
        .mockReturnValue(mockGetInternalUserESClient());
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('returns effective_config on success', async () => {
      mockEsClient.get.mockResolvedValue({
        _source: { effective_config: { foo: 'bar' }, namespaces: ['default'] },
      });
      const request = { params: { agentId: 'agent-1' }, query: {} };
      await getAgentEffectiveConfigHandler(mockContext, request as any, mockResponse);
      expect(mockResponse.ok).toHaveBeenCalledWith({ body: { effective_config: { foo: 'bar' } } });
    });

    it('returns notFound if SavedObjectsErrorHelpers.isNotFoundError', async () => {
      const error = new Error('not found');
      jest.spyOn(SavedObjectsErrorHelpers, 'isNotFoundError').mockReturnValue(true);
      mockEsClient.get.mockRejectedValue(error);
      const request = { params: { agentId: 'agent-404' }, query: {} };
      await getAgentEffectiveConfigHandler(mockContext, request as any, mockResponse);
      expect(mockResponse.notFound).toHaveBeenCalledWith({
        body: { message: 'Agent agent-404 not found' },
      });
    });

    it('throw error if agent not matches namespace', async () => {
      mockEsClient.get.mockResolvedValue({
        _source: { effective_config: { foo: 'bar' }, namespaces: ['other-namespace'] },
      });
      const request = { params: { agentId: 'agent-1' }, query: {} };
      await expect(
        getAgentEffectiveConfigHandler(mockContext, request as any, mockResponse)
      ).rejects.toThrow('agent-1 not found in namespace');
    });
  });

  describe('getAgentDataHandler', () => {
    let mockResponse: any;
    let mockContext: any;
    let mockGetByIds: jest.Mock;

    beforeEach(() => {
      (getIncomingDataByAgentsId as jest.Mock).mockResolvedValue({ items: [], dataPreview: [] });
      (getIncomingDataByDataStreams as jest.Mock).mockResolvedValue({ items: [], dataPreview: [] });
      // Not found by default, so the identity-free gate falls back unless a test opts an agent in.
      mockGetByIds = jest.fn().mockResolvedValue([]);
      (agentPolicyService.getByIds as jest.Mock).mockResolvedValue([]);
      mockResponse = httpServerMock.createResponseFactory();
      mockContext = {
        core: Promise.resolve({
          elasticsearch: { client: { asCurrentUser: {} } },
          savedObjects: { client: { getCurrentNamespace: jest.fn().mockReturnValue('default') } },
        }),
        fleet: Promise.resolve({
          agentClient: { asCurrentUser: { getByIds: mockGetByIds } },
          internalSoClient: {},
        }),
      };
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('passes dataStreamPattern: undefined when the package has empty data_streams (prevents empty string reaching hasPrivileges)', async () => {
      (getPackageInfo as jest.Mock).mockResolvedValue({ data_streams: [] });

      await getAgentDataHandler(
        mockContext,
        {
          query: {
            agentsIds: ['agent-1'],
            pkgName: 'aws_cloudwatch_input_otel',
            pkgVersion: '0.5.0',
            previewData: false,
          },
        } as any,
        mockResponse
      );

      expect(getIncomingDataByAgentsId).toHaveBeenCalledWith(
        expect.objectContaining({ dataStreamPattern: undefined })
      );
    });

    it('passes dataStreamPattern: undefined when data_streams is absent from the package info', async () => {
      (getPackageInfo as jest.Mock).mockResolvedValue({});

      await getAgentDataHandler(
        mockContext,
        {
          query: {
            agentsIds: ['agent-1'],
            pkgName: 'aws_cloudwatch_input_otel',
            pkgVersion: '0.5.0',
            previewData: false,
          },
        } as any,
        mockResponse
      );

      expect(getIncomingDataByAgentsId).toHaveBeenCalledWith(
        expect.objectContaining({ dataStreamPattern: undefined })
      );
    });

    it('passes a non-empty dataStreamPattern when the package has data_streams', async () => {
      (getPackageInfo as jest.Mock).mockResolvedValue({
        data_streams: [{ type: 'logs', dataset: 'aws.cloudwatch' }],
      });

      await getAgentDataHandler(
        mockContext,
        {
          query: {
            agentsIds: ['agent-1'],
            pkgName: 'aws',
            pkgVersion: '1.0.0',
            previewData: false,
          },
        } as any,
        mockResponse
      );

      const [[{ dataStreamPattern }]] = (getIncomingDataByAgentsId as jest.Mock).mock.calls;
      expect(dataStreamPattern).toBeDefined();
      expect(dataStreamPattern).not.toBe('');
    });

    it('appends the .otel dataset suffix only for data streams on the OTel input', async () => {
      (appContextService.getExperimentalFeatures as jest.Mock).mockReturnValue({
        enableOtelIntegrations: true,
      });
      (getPackageInfo as jest.Mock).mockResolvedValue({
        policy_templates: [{ name: 'supabase', inputs: [{ type: 'otelcol' }] }],
        data_streams: [
          {
            type: 'metrics',
            dataset: 'supabase.metrics',
            path: 'metrics',
            streams: [{ input: 'otelcol' }],
          },
          {
            type: 'logs',
            dataset: 'supabase.logs',
            path: 'logs',
            streams: [{ input: 'logfile' }],
          },
        ],
      });

      await getAgentDataHandler(
        mockContext,
        {
          query: {
            agentsIds: ['agent-1'],
            pkgName: 'supabase',
            pkgVersion: '1.0.0',
            previewData: false,
          },
        } as any,
        mockResponse
      );

      const [[{ dataStreamPattern }]] = (getIncomingDataByAgentsId as jest.Mock).mock.calls;
      expect(dataStreamPattern).toBe('metrics-supabase.metrics.otel-*,logs-supabase.logs-*');
    });

    describe('identity-free gate for agentless OTel', () => {
      const otelPackageInfo = {
        policy_templates: [{ name: 'supabase', inputs: [{ type: 'otelcol' }] }],
        data_streams: [
          {
            type: 'metrics',
            dataset: 'supabase.metrics',
            path: 'metrics',
            streams: [{ input: 'otelcol' }],
          },
        ],
      };

      beforeEach(() => {
        (appContextService.getExperimentalFeatures as jest.Mock).mockReturnValue({
          enableOtelIntegrations: true,
        });
      });

      it('uses getIncomingDataByDataStreams with a namespace-scoped pattern for one agentless agent', async () => {
        (getPackageInfo as jest.Mock).mockResolvedValue(otelPackageInfo);
        mockGetByIds.mockResolvedValue([{ id: 'agent-1', policy_id: 'policy-1' }]);
        (agentPolicyService.getByIds as jest.Mock).mockResolvedValue([
          {
            id: 'policy-1',
            namespace: 'default',
            supports_agentless: true,
            package_policies: [
              { package: { name: 'supabase', version: '1.0.0' }, namespace: 'production' },
            ],
          },
        ]);

        await getAgentDataHandler(
          mockContext,
          {
            query: {
              agentsIds: ['agent-1'],
              pkgName: 'supabase',
              pkgVersion: '1.0.0',
              previewData: false,
            },
          } as any,
          mockResponse
        );

        expect(getIncomingDataByAgentsId).not.toHaveBeenCalled();
        expect(getIncomingDataByDataStreams).toHaveBeenCalledWith(
          expect.objectContaining({
            agentId: 'agent-1',
            dataStreamPattern: 'metrics-supabase.metrics.otel-production',
          })
        );
      });

      it('falls back to getIncomingDataByAgentsId for a non-agentless agent', async () => {
        (getPackageInfo as jest.Mock).mockResolvedValue(otelPackageInfo);
        mockGetByIds.mockResolvedValue([{ id: 'agent-1', policy_id: 'policy-1' }]);
        (agentPolicyService.getByIds as jest.Mock).mockResolvedValue([
          { id: 'policy-1', namespace: 'default', supports_agentless: false },
        ]);

        await getAgentDataHandler(
          mockContext,
          {
            query: {
              agentsIds: ['agent-1'],
              pkgName: 'supabase',
              pkgVersion: '1.0.0',
              previewData: false,
            },
          } as any,
          mockResponse
        );

        expect(getIncomingDataByDataStreams).not.toHaveBeenCalled();
        expect(getIncomingDataByAgentsId).toHaveBeenCalled();
      });

      it('falls back for a regular (non-OTel) package even with an agentless agent', async () => {
        (getPackageInfo as jest.Mock).mockResolvedValue({
          data_streams: [{ type: 'logs', dataset: 'aws.cloudwatch', path: 'logs' }],
        });
        mockGetByIds.mockResolvedValue([{ id: 'agent-1', policy_id: 'policy-1' }]);
        (agentPolicyService.getByIds as jest.Mock).mockResolvedValue([
          { id: 'policy-1', namespace: 'default', supports_agentless: true },
        ]);

        await getAgentDataHandler(
          mockContext,
          {
            query: {
              agentsIds: ['agent-1'],
              pkgName: 'aws',
              pkgVersion: '1.0.0',
              previewData: false,
            },
          } as any,
          mockResponse
        );

        expect(getIncomingDataByDataStreams).not.toHaveBeenCalled();
        expect(mockGetByIds).not.toHaveBeenCalled();
      });

      it('falls back and skips agent/policy lookups when no pkgName or pkgVersion is given', async () => {
        await getAgentDataHandler(
          mockContext,
          {
            query: {
              agentsIds: ['agent-1'],
              previewData: false,
            },
          } as any,
          mockResponse
        );

        expect(getIncomingDataByDataStreams).not.toHaveBeenCalled();
        expect(mockGetByIds).not.toHaveBeenCalled();
        expect(agentPolicyService.getByIds).not.toHaveBeenCalled();
        expect(getIncomingDataByAgentsId).toHaveBeenCalled();
      });

      it('falls back for more than one requested id, even with an OTel package and agentless agents', async () => {
        (getPackageInfo as jest.Mock).mockResolvedValue(otelPackageInfo);

        await getAgentDataHandler(
          mockContext,
          {
            query: {
              agentsIds: ['agent-1', 'agent-2'],
              pkgName: 'supabase',
              pkgVersion: '1.0.0',
              previewData: false,
            },
          } as any,
          mockResponse
        );

        expect(getIncomingDataByDataStreams).not.toHaveBeenCalled();
        expect(mockGetByIds).not.toHaveBeenCalled();
        expect(getIncomingDataByAgentsId).toHaveBeenCalled();
      });

      it('falls back for an agent that is notFound', async () => {
        (getPackageInfo as jest.Mock).mockResolvedValue(otelPackageInfo);
        mockGetByIds.mockResolvedValue([]);

        await getAgentDataHandler(
          mockContext,
          {
            query: {
              agentsIds: ['agent-1'],
              pkgName: 'supabase',
              pkgVersion: '1.0.0',
              previewData: false,
            },
          } as any,
          mockResponse
        );

        expect(getIncomingDataByDataStreams).not.toHaveBeenCalled();
        expect(agentPolicyService.getByIds).not.toHaveBeenCalled();
        expect(getIncomingDataByAgentsId).toHaveBeenCalled();
      });

      it('falls back for an agent whose policy cannot be resolved', async () => {
        (getPackageInfo as jest.Mock).mockResolvedValue(otelPackageInfo);
        mockGetByIds.mockResolvedValue([{ id: 'agent-1', policy_id: 'policy-1' }]);
        (agentPolicyService.getByIds as jest.Mock).mockResolvedValue([]);

        await getAgentDataHandler(
          mockContext,
          {
            query: {
              agentsIds: ['agent-1'],
              pkgName: 'supabase',
              pkgVersion: '1.0.0',
              previewData: false,
            },
          } as any,
          mockResponse
        );

        expect(getIncomingDataByDataStreams).not.toHaveBeenCalled();
        expect(getIncomingDataByAgentsId).toHaveBeenCalled();
      });

      it('scopes the pattern to the namespace of the agent whose policy is silent, so a healthy sibling does not mask it', async () => {
        (getPackageInfo as jest.Mock).mockResolvedValue(otelPackageInfo);
        mockGetByIds.mockResolvedValue([{ id: 'agent-2', policy_id: 'policy-2' }]);
        (agentPolicyService.getByIds as jest.Mock).mockResolvedValue([
          {
            id: 'policy-2',
            namespace: 'staging',
            supports_agentless: true,
            package_policies: [
              { package: { name: 'supabase', version: '1.0.0' }, namespace: 'staging' },
            ],
          },
        ]);

        await getAgentDataHandler(
          mockContext,
          {
            query: {
              agentsIds: ['agent-2'],
              pkgName: 'supabase',
              pkgVersion: '1.0.0',
              previewData: false,
            },
          } as any,
          mockResponse
        );

        const [[{ dataStreamPattern }]] = (getIncomingDataByDataStreams as jest.Mock).mock.calls;
        expect(dataStreamPattern).toBe('metrics-supabase.metrics.otel-staging');
        expect(dataStreamPattern).not.toContain('*');
      });

      it('falls back for an agentless agent whose policy has no package policy matching pkgName', async () => {
        (getPackageInfo as jest.Mock).mockResolvedValue(otelPackageInfo);
        mockGetByIds.mockResolvedValue([{ id: 'agent-1', policy_id: 'policy-1' }]);
        (agentPolicyService.getByIds as jest.Mock).mockResolvedValue([
          {
            id: 'policy-1',
            namespace: 'default',
            supports_agentless: true,
            // Attached package policy is for a different integration, so a caller-supplied
            // pkgName cannot be used to attribute this policy's data to it.
            package_policies: [{ package: { name: 'other-package' }, namespace: 'production' }],
          },
        ]);

        await getAgentDataHandler(
          mockContext,
          {
            query: {
              agentsIds: ['agent-1'],
              pkgName: 'supabase',
              pkgVersion: '1.0.0',
              previewData: false,
            },
          } as any,
          mockResponse
        );

        expect(getIncomingDataByDataStreams).not.toHaveBeenCalled();
        expect(getIncomingDataByAgentsId).toHaveBeenCalled();
      });

      it('falls back for an agentless agent whose attached package policy runs a different version', async () => {
        (getPackageInfo as jest.Mock).mockResolvedValue(otelPackageInfo);
        mockGetByIds.mockResolvedValue([{ id: 'agent-1', policy_id: 'policy-1' }]);
        (agentPolicyService.getByIds as jest.Mock).mockResolvedValue([
          {
            id: 'policy-1',
            namespace: 'default',
            supports_agentless: true,
            // Attached package policy runs version 2.0.0, but the request asks about
            // version 1.0.0's OTel streams. Those manifests can differ, so a name-only
            // match would attribute this policy's data to a version it does not run.
            package_policies: [
              { package: { name: 'supabase', version: '2.0.0' }, namespace: 'production' },
            ],
          },
        ]);

        await getAgentDataHandler(
          mockContext,
          {
            query: {
              agentsIds: ['agent-1'],
              pkgName: 'supabase',
              pkgVersion: '1.0.0',
              previewData: false,
            },
          } as any,
          mockResponse
        );

        expect(getIncomingDataByDataStreams).not.toHaveBeenCalled();
        expect(getIncomingDataByAgentsId).toHaveBeenCalled();
      });

      it('passes ignoreMissing so a deleted agent policy falls back instead of throwing', async () => {
        (getPackageInfo as jest.Mock).mockResolvedValue(otelPackageInfo);
        mockGetByIds.mockResolvedValue([{ id: 'agent-1', policy_id: 'policy-1' }]);
        (agentPolicyService.getByIds as jest.Mock).mockResolvedValue([]);

        await getAgentDataHandler(
          mockContext,
          {
            query: {
              agentsIds: ['agent-1'],
              pkgName: 'supabase',
              pkgVersion: '1.0.0',
              previewData: false,
            },
          } as any,
          mockResponse
        );

        expect(agentPolicyService.getByIds).toHaveBeenCalledWith(
          expect.anything(),
          ['policy-1'],
          expect.objectContaining({ ignoreMissing: true })
        );
        expect(getIncomingDataByAgentsId).toHaveBeenCalled();
      });

      it('combines the identity-free OTel answer with the identity answer for a mixed package', async () => {
        (getPackageInfo as jest.Mock).mockResolvedValue({
          policy_templates: [{ name: 'supabase', inputs: [{ type: 'otelcol' }] }],
          data_streams: [
            {
              type: 'metrics',
              dataset: 'supabase.metrics',
              path: 'metrics',
              streams: [{ input: 'otelcol' }],
            },
            {
              type: 'logs',
              dataset: 'supabase.logs',
              path: 'logs',
              streams: [{ input: 'logfile' }],
            },
          ],
        });
        mockGetByIds.mockResolvedValue([{ id: 'agent-1', policy_id: 'policy-1' }]);
        (agentPolicyService.getByIds as jest.Mock).mockResolvedValue([
          {
            id: 'policy-1',
            namespace: 'default',
            supports_agentless: true,
            package_policies: [
              { package: { name: 'supabase', version: '1.0.0' }, namespace: 'production' },
            ],
          },
        ]);
        (getIncomingDataByDataStreams as jest.Mock).mockResolvedValue({
          items: [{ 'agent-1': { data: false } }],
          dataPreview: [{ _index: 'otel-preview' }],
        });
        (getIncomingDataByAgentsId as jest.Mock).mockResolvedValue({
          items: [{ 'agent-1': { data: true } }],
          dataPreview: [{ _index: 'regular-preview' }],
        });

        await getAgentDataHandler(
          mockContext,
          {
            query: {
              agentsIds: ['agent-1'],
              pkgName: 'supabase',
              pkgVersion: '1.0.0',
              previewData: true,
            },
          } as any,
          mockResponse
        );

        // Only the non-OTel stream is queried through the identity path, not the OTel one.
        expect(getIncomingDataByAgentsId).toHaveBeenCalledWith(
          expect.objectContaining({ dataStreamPattern: 'logs-supabase.logs-*' })
        );
        expect(mockResponse.ok).toHaveBeenCalledWith({
          body: {
            items: [{ 'agent-1': { data: true } }],
            dataPreview: [{ _index: 'otel-preview' }, { _index: 'regular-preview' }],
          },
        });
      });

      it('allows an ordinary Fleet reader through the agent client, not the raw ES client', async () => {
        (getPackageInfo as jest.Mock).mockResolvedValue(otelPackageInfo);
        mockGetByIds.mockResolvedValue([{ id: 'agent-1', policy_id: 'policy-1' }]);
        (agentPolicyService.getByIds as jest.Mock).mockResolvedValue([
          {
            id: 'policy-1',
            namespace: 'default',
            supports_agentless: true,
            package_policies: [
              { package: { name: 'supabase', version: '1.0.0' }, namespace: 'default' },
            ],
          },
        ]);

        await getAgentDataHandler(
          mockContext,
          {
            query: {
              agentsIds: ['agent-1'],
              pkgName: 'supabase',
              pkgVersion: '1.0.0',
              previewData: false,
            },
          } as any,
          mockResponse
        );

        // The agent lookup went through fleetContext.agentClient, which runs its own authz
        // preflight, rather than a direct query against the hidden .fleet-agents index.
        expect(mockGetByIds).toHaveBeenCalledWith(['agent-1'], { ignoreMissing: true });
      });
    });
  });
});

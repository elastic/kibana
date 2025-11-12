/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, httpServerMock } from '@kbn/core/server/mocks';
import { errors } from '@elastic/elasticsearch';

import { getAgentStatusForAgentPolicy } from '../../services/agents/status';
import { fetchAndAssignAgentMetrics } from '../../services/agents/agent_metrics';
import { appContextService } from '../../services/app_context';
import { createAppContextStartContractMock } from '../../mocks';

import {
  getAgentStatusForAgentPolicyHandler,
  getAvailableVersionsHandler,
  getAgentsHandler,
  postAgentReassignHandler,
  postBulkAgentReassignHandler,
} from './handlers';

jest.mock('../../services/agents/versions', () => {
  return {
    getAvailableVersions: jest.fn().mockReturnValue(['8.1.0', '8.0.0', '7.17.0']),
  };
});

jest.mock('../../services/app_context');

jest.mock('../../services/agents/status', () => ({
  getAgentStatusForAgentPolicy: jest.fn(),
}));

jest.mock('../../services/agents/agent_metrics', () => ({
  fetchAndAssignAgentMetrics: jest.fn(),
}));

jest.mock('../../services/agents', () => {
  const statusModule = jest.requireMock('../../services/agents/status');
  const versionsModule = jest.requireMock('../../services/agents/versions');
  return {
    getAgentStatusForAgentPolicy: statusModule.getAgentStatusForAgentPolicy,
    getAvailableVersions: versionsModule.getAvailableVersions,
    getAgentById: jest.fn(),
    getAgentsById: jest.fn(),
    getAgentsByKuery: jest.fn(),
    reassignAgent: jest.fn(),
    reassignAgents: jest.fn(),
  };
});

jest.mock('../../services/agent_policy', () => ({
  agentPolicyService: {
    get: jest.fn(),
  },
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

  describe('postAgentReassignHandler', () => {
    const { getAgentById, reassignAgent } = jest.requireMock('../../services/agents');
    const { agentPolicyService } = jest.requireMock('../../services/agent_policy');
    const { getPackageInfo } = jest.requireMock('../../services/epm/packages');

    let mockContext: any;
    let mockResponse: any;
    let mockSoClient: any;
    let mockEsClient: any;

    const mockAgent = {
      id: 'agent-1',
      agent: { id: 'agent-1', version: '8.11.0' },
      local_metadata: {
        elastic: { agent: { version: '8.11.0' } },
      },
      policy_id: 'policy-1',
      packages: [],
      type: 'PERMANENT',
      active: true,
      enrolled_at: '2023-01-01T00:00:00Z',
    };

    beforeEach(() => {
      jest.clearAllMocks();
      mockSoClient = {};
      mockEsClient = {};

      const coreContext = coreMock.createRequestHandlerContext();
      coreContext.savedObjects.client = mockSoClient;
      coreContext.elasticsearch.client.asInternalUser = mockEsClient;

      mockContext = {
        core: Promise.resolve(coreContext),
      };

      mockResponse = httpServerMock.createResponseFactory();

      // Initialize appContextService for agentPolicyService
      appContextService.start(
        createAppContextStartContractMock({}, false, {
          internal: mockSoClient,
          withoutSpaceExtensions: mockSoClient,
        })
      );
    });

    afterEach(() => {
      appContextService.stop();
    });

    it('should allow reassign when target policy has no package policies', async () => {
      agentPolicyService.get.mockResolvedValue({
        id: 'policy-2',
        package_policies: [],
      });

      getAgentById.mockResolvedValue(mockAgent);
      reassignAgent.mockResolvedValue(undefined);

      const request = httpServerMock.createKibanaRequest({
        params: { agentId: 'agent-1' },
        body: { policy_id: 'policy-2' },
      });

      await postAgentReassignHandler(mockContext, request, mockResponse);

      expect(reassignAgent).toHaveBeenCalled();
      expect(mockResponse.ok).toHaveBeenCalled();
    });

    it('should allow reassign when package policies have no agent version requirements', async () => {
      agentPolicyService.get.mockResolvedValue({
        id: 'policy-2',
        package_policies: [
          {
            id: 'pp-1',
            package: { name: 'test-package', version: '1.0.0' },
          },
        ],
      });

      getPackageInfo.mockResolvedValue({
        name: 'test-package',
        version: '1.0.0',
        conditions: {},
      });

      getAgentById.mockResolvedValue(mockAgent);
      reassignAgent.mockResolvedValue(undefined);

      const request = httpServerMock.createKibanaRequest({
        params: { agentId: 'agent-1' },
        body: { policy_id: 'policy-2' },
      });

      await postAgentReassignHandler(mockContext, request, mockResponse);

      expect(reassignAgent).toHaveBeenCalled();
      expect(mockResponse.ok).toHaveBeenCalled();
    });

    it('should reject reassign when agent version is below required version and force is false', async () => {
      agentPolicyService.get.mockResolvedValue({
        id: 'policy-2',
        package_policies: [
          {
            id: 'pp-1',
            package: { name: 'test-package', version: '1.0.0' },
          },
        ],
      });

      getPackageInfo.mockResolvedValue({
        name: 'test-package',
        version: '1.0.0',
        conditions: { agent: { version: '8.12.0' } },
      });

      getAgentById.mockResolvedValue(mockAgent);

      const request = httpServerMock.createKibanaRequest({
        params: { agentId: 'agent-1' },
        body: { policy_id: 'policy-2', force: false },
      });

      await expect(() =>
        postAgentReassignHandler(mockContext, request, mockResponse)
      ).rejects.toThrow(/does not satisfy required version range/i);

      expect(reassignAgent).not.toHaveBeenCalled();
    });

    it('should allow reassign when agent version meets requirement', async () => {
      const agentWithHigherVersion = {
        ...mockAgent,
        agent: { id: 'agent-1', version: '8.12.0' },
        local_metadata: {
          elastic: { agent: { version: '8.12.0' } },
        },
      };

      agentPolicyService.get.mockResolvedValue({
        id: 'policy-2',
        package_policies: [
          {
            id: 'pp-1',
            package: { name: 'test-package', version: '1.0.0' },
          },
        ],
      });

      getPackageInfo.mockResolvedValue({
        name: 'test-package',
        version: '1.0.0',
        conditions: { agent: { version: '8.12.0' } },
      });

      getAgentById.mockResolvedValue(agentWithHigherVersion);
      reassignAgent.mockResolvedValue(undefined);

      const request = httpServerMock.createKibanaRequest({
        params: { agentId: 'agent-1' },
        body: { policy_id: 'policy-2' },
      });

      await postAgentReassignHandler(mockContext, request, mockResponse);

      expect(reassignAgent).toHaveBeenCalled();
      expect(mockResponse.ok).toHaveBeenCalled();
    });

    it('should allow reassign with force:true even if agent version is below required', async () => {
      agentPolicyService.get.mockResolvedValue({
        id: 'policy-2',
        package_policies: [
          {
            id: 'pp-1',
            package: { name: 'test-package', version: '1.0.0' },
          },
        ],
      });

      getPackageInfo.mockResolvedValue({
        name: 'test-package',
        version: '1.0.0',
        conditions: { agent: { version: '8.12.0' } },
      });

      getAgentById.mockResolvedValue(mockAgent);
      reassignAgent.mockResolvedValue(undefined);

      const request = httpServerMock.createKibanaRequest({
        params: { agentId: 'agent-1' },
        body: { policy_id: 'policy-2', force: true },
      });

      await postAgentReassignHandler(mockContext, request, mockResponse);

      expect(reassignAgent).toHaveBeenCalled();
      expect(mockResponse.ok).toHaveBeenCalled();
      // Should not have called getPackageInfo since force is true
      expect(getPackageInfo).not.toHaveBeenCalled();
    });

    it('should check highest version requirement when multiple package policies have different requirements', async () => {
      const agentWithVersion = {
        ...mockAgent,
        agent: { id: 'agent-1', version: '8.12.0' },
        local_metadata: {
          elastic: { agent: { version: '8.12.0' } },
        },
      };

      agentPolicyService.get.mockResolvedValue({
        id: 'policy-2',
        package_policies: [
          {
            id: 'pp-1',
            package: { name: 'test-package-1', version: '1.0.0' },
          },
          {
            id: 'pp-2',
            package: { name: 'test-package-2', version: '2.0.0' },
          },
        ],
      });

      getPackageInfo
        .mockResolvedValueOnce({
          name: 'test-package-1',
          version: '1.0.0',
          conditions: { agent: { version: '8.11.0' } },
        })
        .mockResolvedValueOnce({
          name: 'test-package-2',
          version: '2.0.0',
          conditions: { agent: { version: '8.13.0' } },
        });

      getAgentById.mockResolvedValue(agentWithVersion);
      reassignAgent.mockResolvedValue(undefined);

      const request = httpServerMock.createKibanaRequest({
        params: { agentId: 'agent-1' },
        body: { policy_id: 'policy-2' },
      });

      await expect(() =>
        postAgentReassignHandler(mockContext, request, mockResponse)
      ).rejects.toThrow(/does not satisfy required version range/i);
    });
  });

  describe('postBulkAgentReassignHandler', () => {
    const { reassignAgents } = jest.requireMock('../../services/agents');

    let mockContext: any;
    let mockResponse: any;
    let mockSoClient: any;
    let mockEsClient: any;

    beforeEach(() => {
      jest.clearAllMocks();
      mockSoClient = {};
      mockEsClient = {};

      const coreContext = coreMock.createRequestHandlerContext();
      coreContext.savedObjects.client = mockSoClient;
      coreContext.elasticsearch.client.asInternalUser = mockEsClient;

      mockContext = {
        core: Promise.resolve(coreContext),
      };

      mockResponse = httpServerMock.createResponseFactory();
    });

    it('should call reassignAgents with agentIds when agents is an array', async () => {
      reassignAgents.mockResolvedValue({ actionId: 'action-1' });

      const request = httpServerMock.createKibanaRequest({
        body: {
          policy_id: 'policy-2',
          agents: ['agent-1', 'agent-2'],
        },
      });

      await postBulkAgentReassignHandler(mockContext, request, mockResponse);

      expect(reassignAgents).toHaveBeenCalledWith(
        mockSoClient,
        mockEsClient,
        {
          agentIds: ['agent-1', 'agent-2'],
          force: undefined,
          batchSize: undefined,
        },
        'policy-2'
      );
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: { actionId: 'action-1' },
      });
    });

    it('should call reassignAgents with kuery when agents is a string', async () => {
      reassignAgents.mockResolvedValue({ actionId: 'action-1' });

      const request = httpServerMock.createKibanaRequest({
        body: {
          policy_id: 'policy-2',
          agents: 'policy_id:policy-1',
          includeInactive: true,
        },
      });

      await postBulkAgentReassignHandler(mockContext, request, mockResponse);

      expect(reassignAgents).toHaveBeenCalledWith(
        mockSoClient,
        mockEsClient,
        {
          kuery: 'policy_id:policy-1',
          showInactive: true,
          force: undefined,
          batchSize: undefined,
        },
        'policy-2'
      );
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: { actionId: 'action-1' },
      });
    });

    it('should pass force flag to reassignAgents', async () => {
      reassignAgents.mockResolvedValue({ actionId: 'action-1' });

      const request = httpServerMock.createKibanaRequest({
        body: {
          policy_id: 'policy-2',
          agents: ['agent-1'],
          force: true,
        },
      });

      await postBulkAgentReassignHandler(mockContext, request, mockResponse);

      expect(reassignAgents).toHaveBeenCalledWith(
        mockSoClient,
        mockEsClient,
        expect.objectContaining({
          force: true,
        }),
        'policy-2'
      );
    });

    it('should pass batchSize to reassignAgents', async () => {
      reassignAgents.mockResolvedValue({ actionId: 'action-1' });

      const request = httpServerMock.createKibanaRequest({
        body: {
          policy_id: 'policy-2',
          agents: ['agent-1'],
          batchSize: 100,
        },
      });

      await postBulkAgentReassignHandler(mockContext, request, mockResponse);

      expect(reassignAgents).toHaveBeenCalledWith(
        mockSoClient,
        mockEsClient,
        expect.objectContaining({
          batchSize: 100,
        }),
        'policy-2'
      );
    });
  });
});

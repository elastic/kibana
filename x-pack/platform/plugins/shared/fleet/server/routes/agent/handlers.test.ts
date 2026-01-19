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
    },
  };
});

jest.mock('../../services/agents/status', () => ({
  getAgentStatusForAgentPolicy: jest.fn(),
}));

jest.mock('../../services/agents/agent_metrics', () => ({
  fetchAndAssignAgentMetrics: jest.fn(),
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
});

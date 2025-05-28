/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  httpServerMock,
  elasticsearchServiceMock,
  savedObjectsClientMock,
} from '@kbn/core/server/mocks';
import type {
  KibanaResponseFactory,
  ElasticsearchClient,
  SavedObjectsClientContract,
} from '@kbn/core/server';

import * as AgentService from '../../services/agents';

import { AgentNotFoundError, FleetUnauthorizedError } from '../../errors';

import { migrateSingleAgentHandler } from './migrate_handlers';

// Mock the agent service functions
jest.mock('../../services/agents', () => {
  return {
    getAgentById: jest.fn(),
    getAgentPolicyForAgent: jest.fn(),
    migrateSingleAgent: jest.fn(),
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

describe('Migrate handlers', () => {
  describe('migrateSingleAgentHandler', () => {
    let mockResponse: jest.Mocked<KibanaResponseFactory>;

    let mockRequest: any;
    let mockSavedObjectsClient: jest.Mocked<SavedObjectsClientContract>;
    let mockElasticsearchClient: jest.Mocked<ElasticsearchClient>;
    let mockContext: any;

    const agentId = 'agent-id';
    const mockAgent = { id: agentId, components: [] };
    const mockAgentPolicy = { id: 'policy-id', is_protected: false };
    const mockSettings = { enrollment_token: 'token123', uri: 'https://example.com' };
    const mockActionResponse = { id: 'action-id' };

    beforeEach(() => {
      jest.clearAllMocks();

      mockResponse = httpServerMock.createResponseFactory();
      mockSavedObjectsClient = savedObjectsClientMock.create();
      mockElasticsearchClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      mockRequest = {
        params: { agentId },
        body: mockSettings,
      };

      // Setup the context with correct structure
      mockContext = {
        core: {
          elasticsearch: {
            client: {
              asInternalUser: mockElasticsearchClient,
            },
          },
          savedObjects: {
            client: mockSavedObjectsClient,
          },
        },
        fleet: {},
      };

      // Default mock returns
      (AgentService.getAgentById as jest.Mock).mockResolvedValue(mockAgent);
      (AgentService.getAgentPolicyForAgent as jest.Mock).mockResolvedValue(mockAgentPolicy);
      (AgentService.migrateSingleAgent as jest.Mock).mockResolvedValue({
        actionId: mockActionResponse.id,
      });
    });

    it('calls migrateSingleAgent with correct parameters and returns success', async () => {
      await migrateSingleAgentHandler(mockContext, mockRequest, mockResponse);

      // Verify services were called with correct parameters
      expect(AgentService.getAgentById).toHaveBeenCalledWith(
        mockElasticsearchClient,
        mockSavedObjectsClient,
        agentId
      );

      expect(AgentService.getAgentPolicyForAgent).toHaveBeenCalledWith(
        mockSavedObjectsClient,
        mockElasticsearchClient,
        agentId
      );

      expect(AgentService.migrateSingleAgent).toHaveBeenCalledWith(
        mockElasticsearchClient,
        agentId,
        mockAgentPolicy,
        mockAgent,
        {
          ...mockSettings,
          policyId: mockAgentPolicy.id,
        }
      );

      // Verify response was returned correctly
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: { actionId: mockActionResponse.id },
      });
    });

    it('returns error when agent belongs to a protected policy', async () => {
      // Mock agent policy as protected
      (AgentService.getAgentPolicyForAgent as jest.Mock).mockResolvedValue({
        ...mockAgentPolicy,
        is_protected: true,
      });
      // Change the migrateSingleAgent mock to be an error
      (AgentService.migrateSingleAgent as jest.Mock).mockRejectedValue(
        new FleetUnauthorizedError('Agent is protected and cannot be migrated')
      );
      await expect(
        migrateSingleAgentHandler(mockContext, mockRequest, mockResponse)
      ).rejects.toThrow('Agent is protected and cannot be migrated');
    });

    it('returns error when agent is a fleet-server agent', async () => {
      // Mock agent as fleet-server agent
      (AgentService.getAgentById as jest.Mock).mockResolvedValue({
        ...mockAgent,
        components: [{ type: 'fleet-server' }],
      });
      // Change the migrateSingleAgent mock to be an error
      (AgentService.migrateSingleAgent as jest.Mock).mockRejectedValue(
        new FleetUnauthorizedError('Agent is protected and cannot be migrated')
      );
      await expect(
        migrateSingleAgentHandler(mockContext, mockRequest, mockResponse)
      ).rejects.toThrow('Agent is protected and cannot be migrated');
    });

    it('returns error when agent is not found', async () => {
      const agentError = new AgentNotFoundError('Agent not found');
      (AgentService.getAgentById as jest.Mock).mockRejectedValue(agentError);
      await expect(
        migrateSingleAgentHandler(mockContext, mockRequest, mockResponse)
      ).rejects.toThrow(agentError.message);
    });
  });
});

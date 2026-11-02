/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ElasticsearchClient,
  KibanaResponseFactory,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import {
  elasticsearchServiceMock,
  httpServerMock,
  savedObjectsClientMock,
} from '@kbn/core/server/mocks';

import { getAgentById } from '../../services/agents';
import * as AgentService from '../../services/agents';
import { AgentRollbackError } from '../../errors';
import type { Agent } from '../../../common/types';

import { rollbackAgentHandler, bulkRollbackAgentHandler } from './rollback_handlers';

jest.mock('../../../common', () => {
  const actual = jest.requireActual('../../../common');
  return {
    ...actual,
    getFileMetadataIndexName: jest.fn((integration: string) => `.fleet-fileds-${integration}-meta`),
    getFileDataIndexName: jest.fn((integration: string) => `.fleet-fileds-${integration}-data`),
  };
});

jest.mock('../../services/agents', () => ({
  getAgentById: jest.fn(),
  sendRollbackAgentAction: jest.fn(),
  sendRollbackAgentsActions: jest.fn(),
}));

describe('Rollback handlers', () => {
  let esClientMock: jest.Mocked<ElasticsearchClient>;
  let soClientMock: jest.Mocked<SavedObjectsClientContract>;
  let mockContext: any;
  let mockRequest: any;
  let mockResponse: jest.Mocked<KibanaResponseFactory>;

  const mockAgentId = 'agent-id-1';
  const mockActionId = 'action-id-123';

  beforeEach(() => {
    jest.clearAllMocks();

    esClientMock = elasticsearchServiceMock.createClusterClient().asInternalUser;
    soClientMock = savedObjectsClientMock.create();
    mockContext = {
      core: Promise.resolve({
        elasticsearch: {
          client: {
            asInternalUser: esClientMock,
          },
        },
        savedObjects: {
          client: soClientMock,
        },
      }),
      fleet: {},
    };
    mockRequest = {
      params: { agentId: mockAgentId },
    };
    mockResponse = httpServerMock.createResponseFactory();
  });

  describe('rollbackAgentHandler', () => {
    it('should successfully roll back an agent', async () => {
      const mockAgent: Partial<Agent> = {
        id: mockAgentId,
        unenrollment_started_at: undefined,
        unenrolled_at: undefined,
        upgrade_started_at: undefined,
        upgraded_at: '2023-01-01T00:00:00Z',
      };

      (getAgentById as jest.Mock).mockResolvedValue(mockAgent);
      (AgentService.sendRollbackAgentAction as jest.Mock).mockResolvedValue(mockActionId);

      await rollbackAgentHandler(mockContext, mockRequest, mockResponse);

      expect(getAgentById).toHaveBeenCalledWith(esClientMock, soClientMock, mockAgentId);
      expect(AgentService.sendRollbackAgentAction).toHaveBeenCalledWith(
        soClientMock,
        esClientMock,
        mockAgent
      );
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: { actionId: mockActionId },
      });
    });

    it('should propagate errors from sendRollbackAgentAction', async () => {
      const mockAgent: Partial<Agent> = {
        id: mockAgentId,
        unenrollment_started_at: undefined,
        unenrolled_at: undefined,
      };
      const serviceError = new AgentRollbackError('No rollback available');

      (getAgentById as jest.Mock).mockResolvedValue(mockAgent);
      (AgentService.sendRollbackAgentAction as jest.Mock).mockRejectedValue(serviceError);

      await expect(rollbackAgentHandler(mockContext, mockRequest, mockResponse)).rejects.toThrow(
        serviceError
      );

      expect(AgentService.sendRollbackAgentAction).toHaveBeenCalled();
      expect(mockResponse.ok).not.toHaveBeenCalled();
    });
  });

  describe('bulkRollbackAgentHandler', () => {
    it('should successfully roll back agents with agent IDs array', async () => {
      const agentIds = ['agent-id-1', 'agent-id-2'];
      const mockActionIds = ['action-id-1', 'action-id-2'];
      mockRequest = {
        body: {
          agents: agentIds,
          batchSize: 100,
          includeInactive: false,
        },
      };

      (AgentService.sendRollbackAgentsActions as jest.Mock).mockResolvedValue({
        actionIds: mockActionIds,
      });

      await bulkRollbackAgentHandler(mockContext, mockRequest, mockResponse);

      expect(AgentService.sendRollbackAgentsActions).toHaveBeenCalledWith(
        soClientMock,
        esClientMock,
        {
          agentIds,
          batchSize: 100,
          includeInactive: false,
        }
      );
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: { actionIds: mockActionIds },
      });
    });

    it('should successfully roll back agents with kuery string', async () => {
      const kuery = 'status:online';
      const mockActionIds = ['action-id-1'];
      mockRequest = {
        body: {
          agents: kuery,
          batchSize: 50,
          includeInactive: true,
        },
      };

      (AgentService.sendRollbackAgentsActions as jest.Mock).mockResolvedValue({
        actionIds: mockActionIds,
      });

      await bulkRollbackAgentHandler(mockContext, mockRequest, mockResponse);

      expect(AgentService.sendRollbackAgentsActions).toHaveBeenCalledWith(
        soClientMock,
        esClientMock,
        {
          kuery,
          showInactive: true,
          batchSize: 50,
          includeInactive: true,
        }
      );
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: { actionIds: mockActionIds },
      });
    });

    it('should handle bulk rollback with minimal options', async () => {
      const agentIds = ['agent-id-1'];
      const mockActionIds = ['action-id-1'];
      mockRequest = {
        body: {
          agents: agentIds,
        },
      };

      (AgentService.sendRollbackAgentsActions as jest.Mock).mockResolvedValue({
        actionIds: mockActionIds,
      });

      await bulkRollbackAgentHandler(mockContext, mockRequest, mockResponse);

      expect(AgentService.sendRollbackAgentsActions).toHaveBeenCalledWith(
        soClientMock,
        esClientMock,
        {
          agentIds,
          batchSize: undefined,
          includeInactive: undefined,
        }
      );
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: { actionIds: mockActionIds },
      });
    });

    it('should propagate errors from sendRollbackAgentsActions', async () => {
      const agentIds = ['agent-id-1'];
      const serviceError = new AgentRollbackError('Bulk rollback failed');
      mockRequest = {
        body: {
          agents: agentIds,
        },
      };

      (AgentService.sendRollbackAgentsActions as jest.Mock).mockRejectedValue(serviceError);

      await expect(
        bulkRollbackAgentHandler(mockContext, mockRequest, mockResponse)
      ).rejects.toThrow(serviceError);

      expect(AgentService.sendRollbackAgentsActions).toHaveBeenCalled();
      expect(mockResponse.ok).not.toHaveBeenCalled();
    });

    it('should handle empty actionIds array', async () => {
      const agentIds = ['agent-id-1'];
      mockRequest = {
        body: {
          agents: agentIds,
        },
      };

      (AgentService.sendRollbackAgentsActions as jest.Mock).mockResolvedValue({
        actionIds: [],
      });

      await bulkRollbackAgentHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: { actionIds: [] },
      });
    });
  });
});

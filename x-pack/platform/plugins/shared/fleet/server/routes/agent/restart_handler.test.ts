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

import * as AgentService from '../../services/agents';
import { FleetError, HostedAgentPolicyRestrictionRelatedError } from '../../errors';

import { restartAgentHandler, bulkRestartAgentsHandler } from './restart_handler';

jest.mock('../../services/agents', () => ({
  restartAgent: jest.fn(),
  bulkRestartAgents: jest.fn(),
}));

describe('restart handlers', () => {
  let esClientMock: jest.Mocked<ElasticsearchClient>;
  let soClientMock: jest.Mocked<SavedObjectsClientContract>;
  let mockContext: any;
  let mockResponse: jest.Mocked<KibanaResponseFactory>;

  beforeEach(() => {
    jest.clearAllMocks();
    esClientMock = elasticsearchServiceMock.createClusterClient().asInternalUser;
    soClientMock = savedObjectsClientMock.create();
    mockContext = {
      core: Promise.resolve({
        elasticsearch: { client: { asInternalUser: esClientMock } },
        savedObjects: { client: soClientMock },
      }),
    };
    mockResponse = httpServerMock.createResponseFactory();
  });

  describe('restartAgentHandler', () => {
    it('returns actionId on success', async () => {
      (AgentService.restartAgent as jest.Mock).mockResolvedValue({ actionId: 'action-abc' });

      await restartAgentHandler(
        mockContext,
        { params: { agentId: 'agent-1' } } as any,
        mockResponse
      );

      expect(AgentService.restartAgent).toHaveBeenCalledWith(esClientMock, soClientMock, 'agent-1');
      expect(mockResponse.ok).toHaveBeenCalledWith({ body: { actionId: 'action-abc' } });
    });

    it('propagates FleetError (version unsupported) to the fleet router error handler', async () => {
      (AgentService.restartAgent as jest.Mock).mockRejectedValue(
        new FleetError('Agent does not support the restart action')
      );

      await expect(
        restartAgentHandler(mockContext, { params: { agentId: 'agent-1' } } as any, mockResponse)
      ).rejects.toThrow(FleetError);

      expect(mockResponse.ok).not.toHaveBeenCalled();
    });

    it('propagates HostedAgentPolicyRestrictionRelatedError to the fleet router error handler', async () => {
      (AgentService.restartAgent as jest.Mock).mockRejectedValue(
        new HostedAgentPolicyRestrictionRelatedError('hosted')
      );

      await expect(
        restartAgentHandler(mockContext, { params: { agentId: 'agent-1' } } as any, mockResponse)
      ).rejects.toThrow(HostedAgentPolicyRestrictionRelatedError);

      expect(mockResponse.ok).not.toHaveBeenCalled();
    });
  });

  describe('bulkRestartAgentsHandler', () => {
    it('returns single actionId for agentIds array — response shape is { actionId: string }', async () => {
      (AgentService.bulkRestartAgents as jest.Mock).mockResolvedValue({
        actionId: 'bulk-action-1',
      });

      await bulkRestartAgentsHandler(
        mockContext,
        { body: { agents: ['agent-1', 'agent-2'], batchSize: 100, includeInactive: false } } as any,
        mockResponse
      );

      expect(AgentService.bulkRestartAgents).toHaveBeenCalledWith(esClientMock, soClientMock, {
        agentIds: ['agent-1', 'agent-2'],
        batchSize: 100,
        includeInactive: false,
      });
      expect(mockResponse.ok).toHaveBeenCalledWith({ body: { actionId: 'bulk-action-1' } });
    });

    it('returns single actionId for kuery string — response shape is { actionId: string }', async () => {
      (AgentService.bulkRestartAgents as jest.Mock).mockResolvedValue({
        actionId: 'bulk-action-2',
      });

      await bulkRestartAgentsHandler(
        mockContext,
        { body: { agents: 'status:online', batchSize: 50, includeInactive: true } } as any,
        mockResponse
      );

      expect(AgentService.bulkRestartAgents).toHaveBeenCalledWith(esClientMock, soClientMock, {
        kuery: 'status:online',
        showInactive: true,
        batchSize: 50,
        includeInactive: true,
      });
      const call = (mockResponse.ok as jest.Mock).mock.calls[0][0];
      expect(call.body).toEqual({ actionId: 'bulk-action-2' });
      expect(call.body).not.toHaveProperty('actionIds');
    });
  });
});

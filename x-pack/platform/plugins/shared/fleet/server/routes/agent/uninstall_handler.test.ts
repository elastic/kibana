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
import { PostAgentUninstallRequestSchema, PostBulkAgentUninstallRequestSchema } from '../../types';
import { UNINSTALL_DELAY_MAX_SECONDS, UNINSTALL_DELAY_MIN_SECONDS } from '../../../common/services';

import { bulkUninstallAgentsHandler, uninstallAgentHandler } from './uninstall_handler';

jest.mock('../../services/agents', () => ({
  uninstallAgent: jest.fn(),
  bulkUninstallAgents: jest.fn(),
}));

describe('uninstall handlers', () => {
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

  describe('uninstallAgentHandler', () => {
    it('returns actionId and passes the delay on success', async () => {
      (AgentService.uninstallAgent as jest.Mock).mockResolvedValue({ actionId: 'action-abc' });

      await uninstallAgentHandler(
        mockContext,
        { params: { agentId: 'agent-1' }, body: { delay_seconds: 7200 } } as any,
        mockResponse
      );

      expect(AgentService.uninstallAgent).toHaveBeenCalledWith(
        esClientMock,
        soClientMock,
        'agent-1',
        { delaySeconds: 7200 }
      );
      expect(mockResponse.ok).toHaveBeenCalledWith({ body: { actionId: 'action-abc' } });
    });

    it('works without a request body', async () => {
      (AgentService.uninstallAgent as jest.Mock).mockResolvedValue({ actionId: 'action-abc' });

      await uninstallAgentHandler(
        mockContext,
        { params: { agentId: 'agent-1' }, body: null } as any,
        mockResponse
      );

      expect(AgentService.uninstallAgent).toHaveBeenCalledWith(
        esClientMock,
        soClientMock,
        'agent-1',
        { delaySeconds: undefined }
      );
    });

    it('propagates FleetError to the fleet router error handler', async () => {
      (AgentService.uninstallAgent as jest.Mock).mockRejectedValue(
        new FleetError('Agent must be unenrolled')
      );

      await expect(
        uninstallAgentHandler(
          mockContext,
          { params: { agentId: 'agent-1' }, body: null } as any,
          mockResponse
        )
      ).rejects.toThrow(FleetError);
      expect(mockResponse.ok).not.toHaveBeenCalled();
    });

    it('propagates HostedAgentPolicyRestrictionRelatedError', async () => {
      (AgentService.uninstallAgent as jest.Mock).mockRejectedValue(
        new HostedAgentPolicyRestrictionRelatedError('hosted')
      );

      await expect(
        uninstallAgentHandler(
          mockContext,
          { params: { agentId: 'agent-1' }, body: null } as any,
          mockResponse
        )
      ).rejects.toThrow(HostedAgentPolicyRestrictionRelatedError);
    });
  });

  describe('bulkUninstallAgentsHandler', () => {
    it('passes agent ids and delay, and returns a single actionId', async () => {
      (AgentService.bulkUninstallAgents as jest.Mock).mockResolvedValue({
        actionId: 'bulk-action-1',
      });

      await bulkUninstallAgentsHandler(
        mockContext,
        {
          body: {
            agents: ['agent-1', 'agent-2'],
            delay_seconds: 7200,
            batchSize: 100,
            includeInactive: false,
          },
        } as any,
        mockResponse
      );

      expect(AgentService.bulkUninstallAgents).toHaveBeenCalledWith(esClientMock, soClientMock, {
        agentIds: ['agent-1', 'agent-2'],
        delaySeconds: 7200,
        batchSize: 100,
        includeInactive: false,
      });
      expect(mockResponse.ok).toHaveBeenCalledWith({ body: { actionId: 'bulk-action-1' } });
    });

    it('passes a kuery string as kuery options', async () => {
      (AgentService.bulkUninstallAgents as jest.Mock).mockResolvedValue({
        actionId: 'bulk-action-2',
      });

      await bulkUninstallAgentsHandler(
        mockContext,
        { body: { agents: 'status:online', batchSize: 50, includeInactive: true } } as any,
        mockResponse
      );

      expect(AgentService.bulkUninstallAgents).toHaveBeenCalledWith(esClientMock, soClientMock, {
        kuery: 'status:online',
        showInactive: true,
        delaySeconds: undefined,
        batchSize: 50,
        includeInactive: true,
      });
      const call = (mockResponse.ok as jest.Mock).mock.calls[0][0];
      expect(call.body).toEqual({ actionId: 'bulk-action-2' });
    });
  });

  describe('request schemas', () => {
    it.each([UNINSTALL_DELAY_MIN_SECONDS, UNINSTALL_DELAY_MAX_SECONDS, 7200])(
      'accepts delay_seconds %p',
      (delay) => {
        expect(() =>
          PostAgentUninstallRequestSchema.body.validate({ delay_seconds: delay })
        ).not.toThrow();
        expect(() =>
          PostBulkAgentUninstallRequestSchema.body.validate({ agents: ['a'], delay_seconds: delay })
        ).not.toThrow();
      }
    );

    it.each([0, 1, UNINSTALL_DELAY_MIN_SECONDS - 1, UNINSTALL_DELAY_MAX_SECONDS + 1, -3600])(
      'rejects delay_seconds %p',
      (delay) => {
        expect(() =>
          PostAgentUninstallRequestSchema.body.validate({ delay_seconds: delay })
        ).toThrow();
        expect(() =>
          PostBulkAgentUninstallRequestSchema.body.validate({ agents: ['a'], delay_seconds: delay })
        ).toThrow();
      }
    );

    it('allows an empty or null single-agent body', () => {
      expect(() => PostAgentUninstallRequestSchema.body.validate(null)).not.toThrow();
      expect(() => PostAgentUninstallRequestSchema.body.validate({})).not.toThrow();
    });

    it('bounds the agent id length', () => {
      expect(() =>
        PostAgentUninstallRequestSchema.params.validate({ agentId: 'a'.repeat(513) })
      ).toThrow();
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { loggingSystemMock } from '@kbn/core/server/mocks';

import { createAppContextStartContractMock } from '../../mocks';
import { appContextService } from '../app_context';
import { agentPolicyService } from '../agent_policy';
import type { AgentPolicy } from '../../types';

import { syncAgentlessDeployments } from './deployment_sync';

jest.mock('../agent_policy');

function mockDependencies() {
  const logger = loggingSystemMock.createLogger();
  const agentlessAgentService = {
    listAgentlessDeployments: jest.fn(),
    createAgentlessAgent: jest.fn().mockResolvedValue({}),
    deleteAgentlessAgent: jest.fn().mockResolvedValue({}),
  };

  jest.mocked(agentPolicyService.getByIds).mockImplementation(async (_, ids) => {
    ids = ids.filter((id) => (id as string).match(/^policy[0-9]+$/));

    return ids.map((id) => ({
      id,
      name: `Agentless policy ${id}`,
      is_managed: true,
      revision: 10,
      keep_monitoring_alive: true,
    })) as unknown as AgentPolicy[];
  });

  jest.mocked(agentPolicyService.list).mockResolvedValueOnce({
    items: [
      { id: 'policy1', revision: 10, keep_monitoring_alive: true },
      { id: 'policy2', revision: 10, keep_monitoring_alive: true },
      { id: 'policy3', revision: 10, keep_monitoring_alive: true },
      { id: 'policy4', revision: 10, keep_monitoring_alive: true },
      { id: 'policy5', revision: 10, keep_monitoring_alive: true },
      { id: 'policy6', revision: 10, keep_monitoring_alive: true },
      { id: 'policy7', revision: 10, keep_monitoring_alive: true },
      { id: 'policy8', revision: 10, keep_monitoring_alive: true },
    ] as AgentPolicy[],
    total: 0,
    page: 10,
    perPage: 100,
  });

  appContextService.start(createAppContextStartContractMock());

  return { logger, agentlessAgentService };
}

describe('Agentless Deployment Sync', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });
  describe('no action needed', () => {
    it('retrieve all deployments through multiple pages and does nothing if there is nothing to sync', async () => {
      const { logger, agentlessAgentService } = mockDependencies();
      agentlessAgentService.listAgentlessDeployments.mockResolvedValueOnce({
        deployments: [
          { policy_id: 'policy1', revision_idx: 10 },
          { policy_id: 'policy2', revision_idx: 10 },
          { policy_id: 'policy3', revision_idx: 10 },
          { policy_id: 'policy4', revision_idx: 10 },
        ],
        next_token: 'token10',
      });
      agentlessAgentService.listAgentlessDeployments.mockResolvedValueOnce({
        deployments: [
          { policy_id: 'policy4', revision_idx: 10 },
          { policy_id: 'policy5', revision_idx: 10 },
          { policy_id: 'policy6', revision_idx: 10 },
          { policy_id: 'policy7', revision_idx: 10 },
        ],
        next_token: 'token2',
      });
      agentlessAgentService.listAgentlessDeployments.mockResolvedValueOnce({
        deployments: [{ policy_id: 'policy8', revision_idx: 10 }],
      });

      await syncAgentlessDeployments({
        logger,
        agentlessAgentService,
      });

      expect(agentlessAgentService.listAgentlessDeployments).toHaveBeenCalledTimes(3);
      expect(agentlessAgentService.createAgentlessAgent).toHaveBeenCalledTimes(0);
      expect(agentlessAgentService.deleteAgentlessAgent).toHaveBeenCalledTimes(0);
    });
  });

  describe('delete', () => {
    it('delete deployments that does not corespond to any agent policy anymore', async () => {
      const { logger, agentlessAgentService } = mockDependencies();
      agentlessAgentService.listAgentlessDeployments.mockResolvedValueOnce({
        deployments: [
          { policy_id: 'policy1', revision_idx: 10 },
          { policy_id: 'policy2', revision_idx: 10 },
          { policy_id: 'policy3', revision_idx: 10 },
          { policy_id: 'policy4', revision_idx: 10 },
        ],
        next_token: 'token10',
      });
      agentlessAgentService.listAgentlessDeployments.mockResolvedValueOnce({
        deployments: [
          { policy_id: 'policy4', revision_idx: 10 },
          { policy_id: 'policy5', revision_idx: 10 },
          { policy_id: 'policy6', revision_idx: 10 },
          { policy_id: 'policy7', revision_idx: 10 },
        ],
        next_token: 'token2',
      });
      agentlessAgentService.listAgentlessDeployments.mockResolvedValueOnce({
        deployments: [
          { policy_id: 'policy8', revision_idx: 10 },
          { policy_id: 'policyIdoNotExists', revision_idx: 10 },
        ],
      });

      await syncAgentlessDeployments({
        logger,
        agentlessAgentService,
      });

      expect(agentlessAgentService.listAgentlessDeployments).toHaveBeenCalledTimes(3);
      expect(agentlessAgentService.createAgentlessAgent).toHaveBeenCalledTimes(0);
      expect(agentlessAgentService.deleteAgentlessAgent).toHaveBeenCalledTimes(1);
    });
    it('log only deployments that does not corespond to any agent policy anymore in dry run mode', async () => {
      const { logger, agentlessAgentService } = mockDependencies();
      agentlessAgentService.listAgentlessDeployments.mockResolvedValueOnce({
        deployments: [
          { policy_id: 'policy1', revision_idx: 10 },
          { policy_id: 'policy2', revision_idx: 10 },
          { policy_id: 'policy3', revision_idx: 10 },
          { policy_id: 'policy4', revision_idx: 10 },
        ],
        next_token: 'token10',
      });
      agentlessAgentService.listAgentlessDeployments.mockResolvedValueOnce({
        deployments: [
          { policy_id: 'policy4', revision_idx: 10 },
          { policy_id: 'policy5', revision_idx: 10 },
          { policy_id: 'policy6', revision_idx: 10 },
          { policy_id: 'policy7', revision_idx: 10 },
        ],
        next_token: 'token2',
      });
      agentlessAgentService.listAgentlessDeployments.mockResolvedValueOnce({
        deployments: [
          { policy_id: 'policy8', revision_idx: 10 },
          { policy_id: 'policyIdoNotExists', revision_idx: 10 },
        ],
      });

      await syncAgentlessDeployments(
        {
          logger,
          agentlessAgentService,
        },
        {
          dryRun: true,
        }
      );

      expect(agentlessAgentService.listAgentlessDeployments).toHaveBeenCalledTimes(3);
      expect(agentlessAgentService.createAgentlessAgent).toHaveBeenCalledTimes(0);
      expect(agentlessAgentService.deleteAgentlessAgent).toHaveBeenCalledTimes(0);
      expect(logger.info).toHaveBeenCalledWith(
        `[Agentless Deployment Sync][Dry Run] Deleting deployment policyIdoNotExists`
      );
    });
    it('log error when deleting deployments that does not corespond to any agent policy anymore', async () => {
      const { logger, agentlessAgentService } = mockDependencies();
      agentlessAgentService.deleteAgentlessAgent.mockRejectedValueOnce(
        new Error('Deletion failed')
      );
      agentlessAgentService.listAgentlessDeployments.mockResolvedValueOnce({
        deployments: [
          { policy_id: 'policy1', revision_idx: 10 },
          { policy_id: 'policy2', revision_idx: 10 },
          { policy_id: 'policy3', revision_idx: 10 },
          { policy_id: 'policy4', revision_idx: 10 },
        ],
        next_token: 'token10',
      });
      agentlessAgentService.listAgentlessDeployments.mockResolvedValueOnce({
        deployments: [
          { policy_id: 'policy4', revision_idx: 10 },
          { policy_id: 'policy5', revision_idx: 10 },
          { policy_id: 'policy6', revision_idx: 10 },
          { policy_id: 'policy7', revision_idx: 10 },
        ],
        next_token: 'token2',
      });
      agentlessAgentService.listAgentlessDeployments.mockResolvedValueOnce({
        deployments: [
          { policy_id: 'policy8', revision_idx: 10 },
          { policy_id: 'policyIdoNotExists', revision_idx: 10 },
        ],
      });

      await syncAgentlessDeployments({
        logger,
        agentlessAgentService,
      });

      expect(agentlessAgentService.listAgentlessDeployments).toHaveBeenCalledTimes(3);
      expect(agentlessAgentService.createAgentlessAgent).toHaveBeenCalledTimes(0);
      expect(agentlessAgentService.deleteAgentlessAgent).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith(
        `[Agentless Deployment Sync] Failed to delete deployment policyIdoNotExists`,
        expect.anything()
      );
    });
  });

  describe('update', () => {
    it('update deployments without revision', async () => {
      const { logger, agentlessAgentService } = mockDependencies();
      agentlessAgentService.listAgentlessDeployments.mockResolvedValueOnce({
        deployments: [
          { policy_id: 'policy1', revision_idx: 10 },
          { policy_id: 'policy2', revision_idx: 10 },
          { policy_id: 'policy3', revision_idx: 10 },
          { policy_id: 'policy4', revision_idx: 10 },
        ],
        next_token: 'token10',
      });
      agentlessAgentService.listAgentlessDeployments.mockResolvedValueOnce({
        deployments: [
          { policy_id: 'policy4', revision_idx: 10 },
          { policy_id: 'policy5', revision_idx: 10 },
          { policy_id: 'policy6', revision_idx: 10 },
          { policy_id: 'policy7', revision_idx: 10 },
        ],
        next_token: 'token2',
      });
      agentlessAgentService.listAgentlessDeployments.mockResolvedValueOnce({
        deployments: [{ policy_id: 'policy8' }],
      });

      await syncAgentlessDeployments({
        logger,
        agentlessAgentService,
      });

      expect(agentlessAgentService.listAgentlessDeployments).toHaveBeenCalledTimes(3);
      expect(agentlessAgentService.createAgentlessAgent).toHaveBeenCalledTimes(1);
      expect(agentlessAgentService.deleteAgentlessAgent).toHaveBeenCalledTimes(0);
      expect(agentlessAgentService.createAgentlessAgent).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ id: 'policy8' })
      );
    });

    it('update deployments with old revision', async () => {
      const { logger, agentlessAgentService } = mockDependencies();
      agentlessAgentService.listAgentlessDeployments.mockResolvedValueOnce({
        deployments: [
          { policy_id: 'policy1', revision_idx: 10 },
          { policy_id: 'policy2', revision_idx: 10 },
          { policy_id: 'policy3', revision_idx: 10 },
          { policy_id: 'policy4', revision_idx: 10 },
        ],
        next_token: 'token10',
      });
      agentlessAgentService.listAgentlessDeployments.mockResolvedValueOnce({
        deployments: [
          { policy_id: 'policy4', revision_idx: 10 },
          { policy_id: 'policy5', revision_idx: 10 },
          { policy_id: 'policy6', revision_idx: 10 },
          { policy_id: 'policy7', revision_idx: 10 },
        ],
        next_token: 'token2',
      });
      agentlessAgentService.listAgentlessDeployments.mockResolvedValueOnce({
        deployments: [{ policy_id: 'policy8', revision_idx: 9 }],
      });

      await syncAgentlessDeployments({
        logger,
        agentlessAgentService,
      });

      expect(agentlessAgentService.listAgentlessDeployments).toHaveBeenCalledTimes(3);
      expect(agentlessAgentService.createAgentlessAgent).toHaveBeenCalledTimes(1);
      expect(agentlessAgentService.deleteAgentlessAgent).toHaveBeenCalledTimes(0);
      expect(agentlessAgentService.createAgentlessAgent).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ id: 'policy8' })
      );
    });

    it('log only deployments without revision in dry run mode', async () => {
      const { logger, agentlessAgentService } = mockDependencies();
      agentlessAgentService.listAgentlessDeployments.mockResolvedValueOnce({
        deployments: [
          { policy_id: 'policy1', revision_idx: 10 },
          { policy_id: 'policy2', revision_idx: 10 },
          { policy_id: 'policy3', revision_idx: 10 },
          { policy_id: 'policy4', revision_idx: 10 },
        ],
        next_token: 'token10',
      });
      agentlessAgentService.listAgentlessDeployments.mockResolvedValueOnce({
        deployments: [
          { policy_id: 'policy4', revision_idx: 10 },
          { policy_id: 'policy5', revision_idx: 10 },
          { policy_id: 'policy6', revision_idx: 10 },
          { policy_id: 'policy7', revision_idx: 10 },
        ],
        next_token: 'token2',
      });
      agentlessAgentService.listAgentlessDeployments.mockResolvedValueOnce({
        deployments: [{ policy_id: 'policy8' }],
      });

      await syncAgentlessDeployments(
        {
          logger,
          agentlessAgentService,
        },
        { dryRun: true }
      );

      expect(agentlessAgentService.listAgentlessDeployments).toHaveBeenCalledTimes(3);
      expect(agentlessAgentService.createAgentlessAgent).toHaveBeenCalledTimes(0);
      expect(agentlessAgentService.deleteAgentlessAgent).toHaveBeenCalledTimes(0);
      expect(logger.info).toHaveBeenCalledWith(
        `[Agentless Deployment Sync][Dry Run] Updating deployment policy8`
      );
    });

    it('log update error for deployments without revision', async () => {
      const { logger, agentlessAgentService } = mockDependencies();
      agentlessAgentService.createAgentlessAgent.mockRejectedValueOnce(new Error('Update failed'));
      agentlessAgentService.listAgentlessDeployments.mockResolvedValueOnce({
        deployments: [
          { policy_id: 'policy1', revision_idx: 10 },
          { policy_id: 'policy2', revision_idx: 10 },
          { policy_id: 'policy3', revision_idx: 10 },
          { policy_id: 'policy4', revision_idx: 10 },
        ],
        next_token: 'token10',
      });
      agentlessAgentService.listAgentlessDeployments.mockResolvedValueOnce({
        deployments: [
          { policy_id: 'policy4', revision_idx: 10 },
          { policy_id: 'policy5', revision_idx: 10 },
          { policy_id: 'policy6', revision_idx: 10 },
          { policy_id: 'policy7', revision_idx: 10 },
        ],
        next_token: 'token2',
      });
      agentlessAgentService.listAgentlessDeployments.mockResolvedValueOnce({
        deployments: [{ policy_id: 'policy8' }],
      });

      await syncAgentlessDeployments({
        logger,
        agentlessAgentService,
      });

      expect(agentlessAgentService.listAgentlessDeployments).toHaveBeenCalledTimes(3);
      expect(agentlessAgentService.createAgentlessAgent).toHaveBeenCalledTimes(1);
      expect(agentlessAgentService.deleteAgentlessAgent).toHaveBeenCalledTimes(0);
      expect(logger.error).toHaveBeenCalledWith(
        `[Agentless Deployment Sync] Failed to update deployment policy8`,
        expect.anything()
      );
    });
  });

  describe('create', () => {
    it('create deployments that do not exists', async () => {
      const { logger, agentlessAgentService } = mockDependencies();
      agentlessAgentService.listAgentlessDeployments.mockResolvedValueOnce({
        deployments: [
          { policy_id: 'policy1', revision_idx: 10 },
          { policy_id: 'policy2', revision_idx: 10 },
          { policy_id: 'policy3', revision_idx: 10 },
          { policy_id: 'policy4', revision_idx: 10 },
        ],
        next_token: 'token10',
      });
      agentlessAgentService.listAgentlessDeployments.mockResolvedValueOnce({
        deployments: [
          { policy_id: 'policy4', revision_idx: 10 },
          { policy_id: 'policy5', revision_idx: 10 },
          { policy_id: 'policy6', revision_idx: 10 },
          { policy_id: 'policy7', revision_idx: 10 },
        ],
      });

      await syncAgentlessDeployments({
        logger,
        agentlessAgentService,
      });

      expect(agentlessAgentService.listAgentlessDeployments).toHaveBeenCalledTimes(2);
      expect(agentlessAgentService.createAgentlessAgent).toHaveBeenCalledTimes(1);
      expect(agentlessAgentService.deleteAgentlessAgent).toHaveBeenCalledTimes(0);
      expect(agentlessAgentService.createAgentlessAgent).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ id: 'policy8' })
      );
    });

    it('log only deployments creation that do not exists in dry run mode', async () => {
      const { logger, agentlessAgentService } = mockDependencies();
      agentlessAgentService.listAgentlessDeployments.mockResolvedValueOnce({
        deployments: [
          { policy_id: 'policy1', revision_idx: 10 },
          { policy_id: 'policy2', revision_idx: 10 },
          { policy_id: 'policy3', revision_idx: 10 },
          { policy_id: 'policy4', revision_idx: 10 },
        ],
        next_token: 'token10',
      });
      agentlessAgentService.listAgentlessDeployments.mockResolvedValueOnce({
        deployments: [
          { policy_id: 'policy4', revision_idx: 10 },
          { policy_id: 'policy5', revision_idx: 10 },
          { policy_id: 'policy6', revision_idx: 10 },
          { policy_id: 'policy7', revision_idx: 10 },
        ],
      });

      await syncAgentlessDeployments(
        {
          logger,
          agentlessAgentService,
        },
        {
          dryRun: true,
        }
      );

      expect(agentlessAgentService.listAgentlessDeployments).toHaveBeenCalledTimes(2);
      expect(agentlessAgentService.createAgentlessAgent).toHaveBeenCalledTimes(0);
      expect(agentlessAgentService.deleteAgentlessAgent).toHaveBeenCalledTimes(0);
      expect(logger.info).toHaveBeenCalledWith(
        `[Agentless Deployment Sync][Dry Run] Creating deployment for policy policy8`
      );
    });
  });

  describe('update monitoring settings', () => {
    it('update monitoring settings if monitoring_enabled is not empty', async () => {
      const { logger, agentlessAgentService } = mockDependencies();
      agentlessAgentService.listAgentlessDeployments.mockResolvedValueOnce({
        deployments: [{ policy_id: 'policy1', revision_idx: 10 }],
      });

      jest.mocked(agentPolicyService.getByIds).mockResolvedValueOnce([
        {
          id: 'policy1',
          name: `Agentless policy policy1`,
          is_managed: true,
          revision: 10,
          keep_monitoring_alive: true,
          monitoring_enabled: ['logs'],
        },
      ] as unknown as AgentPolicy[]);
      jest.mocked(agentPolicyService.list).mockReset();
      jest.mocked(agentPolicyService.list).mockResolvedValueOnce({
        items: [] as AgentPolicy[],
        total: 0,
        page: 10,
        perPage: 100,
      });

      await syncAgentlessDeployments({
        logger,
        agentlessAgentService,
      });

      expect(agentlessAgentService.listAgentlessDeployments).toHaveBeenCalledTimes(1);
      expect(agentPolicyService.update).toHaveBeenCalledTimes(1);
      expect(agentPolicyService.update).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        'policy1',
        {
          keep_monitoring_alive: true,
          monitoring_enabled: [],
        }
      );
      expect(agentlessAgentService.createAgentlessAgent).toHaveBeenCalledTimes(0);
      expect(agentlessAgentService.deleteAgentlessAgent).toHaveBeenCalledTimes(0);
    });

    it('update monitoring settings if keep_monitoring_alive is not set', async () => {
      const { logger, agentlessAgentService } = mockDependencies();
      agentlessAgentService.listAgentlessDeployments.mockResolvedValueOnce({
        deployments: [{ policy_id: 'policy1', revision_idx: 10 }],
      });

      jest.mocked(agentPolicyService.getByIds).mockResolvedValueOnce([
        {
          id: 'policy1',
          name: `Agentless policy policy1`,
          is_managed: true,
          revision: 10,
          keep_monitoring_alive: false,
          monitoring_enabled: [],
        },
      ] as unknown as AgentPolicy[]);
      jest.mocked(agentPolicyService.list).mockReset();
      jest.mocked(agentPolicyService.list).mockResolvedValueOnce({
        items: [] as AgentPolicy[],
        total: 0,
        page: 10,
        perPage: 100,
      });

      await syncAgentlessDeployments({
        logger,
        agentlessAgentService,
      });

      expect(agentlessAgentService.listAgentlessDeployments).toHaveBeenCalledTimes(1);
      expect(agentPolicyService.update).toHaveBeenCalledTimes(1);
      expect(agentPolicyService.update).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        'policy1',
        {
          keep_monitoring_alive: true,
          monitoring_enabled: [],
        }
      );
      expect(agentlessAgentService.createAgentlessAgent).toHaveBeenCalledTimes(0);
      expect(agentlessAgentService.deleteAgentlessAgent).toHaveBeenCalledTimes(0);
    });

    it('does nothing if monitoring is already backfilled', async () => {
      const { logger, agentlessAgentService } = mockDependencies();
      agentlessAgentService.listAgentlessDeployments.mockResolvedValueOnce({
        deployments: [{ policy_id: 'policy1', revision_idx: 10 }],
      });

      jest.mocked(agentPolicyService.getByIds).mockResolvedValueOnce([
        {
          id: 'policy1',
          name: `Agentless policy policy1`,
          is_managed: true,
          revision: 10,
          keep_monitoring_alive: false,
          monitoring_enabled: [],
        },
      ] as unknown as AgentPolicy[]);
      jest.mocked(agentPolicyService.list).mockReset();
      jest.mocked(agentPolicyService.list).mockResolvedValueOnce({
        items: [] as AgentPolicy[],
        total: 0,
        page: 10,
        perPage: 100,
      });

      await syncAgentlessDeployments({
        logger,
        agentlessAgentService,
      });

      expect(agentlessAgentService.listAgentlessDeployments).toHaveBeenCalledTimes(1);
      expect(agentPolicyService.update).toHaveBeenCalledTimes(1);
      expect(agentlessAgentService.createAgentlessAgent).toHaveBeenCalledTimes(0);
      expect(agentlessAgentService.deleteAgentlessAgent).toHaveBeenCalledTimes(0);
    });
  });
});

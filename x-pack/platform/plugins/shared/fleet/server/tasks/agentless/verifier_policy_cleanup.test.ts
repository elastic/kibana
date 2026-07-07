/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';

import { createAppContextStartContractMock } from '../../mocks';
import { appContextService } from '../../services';
import { agentPolicyService, getAgentPolicySavedObjectType } from '../../services/agent_policy';

import { runVerifierPolicyCleanup } from './verifier_policy_cleanup';
import {
  registerVerifierPolicyCleanupTask,
  scheduleVerifierPolicyCleanupTask,
} from './verifier_policy_cleanup_task';

jest.mock('../../services/agent_policy_update', () => ({
  agentPolicyUpdateEventHandler: jest.fn(),
}));

jest.mock('../../services/agent_policy', () => ({
  agentPolicyService: {
    list: jest.fn(),
    deleteVerifierPolicy: jest.fn(),
  },
  getAgentPolicySavedObjectType: jest.fn().mockResolvedValue('ingest-agent-policies'),
}));

const mockedAgentPolicyService = agentPolicyService as jest.Mocked<typeof agentPolicyService>;
const mockedGetAgentPolicySavedObjectType = getAgentPolicySavedObjectType as jest.MockedFunction<
  typeof getAgentPolicySavedObjectType
>;

const mockEsClient = {} as any;

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60 * 1000).toISOString();

describe('verifier_policy_cleanup', () => {
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => {
    jest.clearAllMocks();
    const mockContext = createAppContextStartContractMock();
    appContextService.start(mockContext);

    jest.spyOn(appContextService, 'getLogger').mockReturnValue(logger);
    jest
      .spyOn(appContextService, 'getInternalUserSOClientWithoutSpaceExtension')
      .mockReturnValue({} as any);
    jest.spyOn(appContextService, 'getInternalUserESClient').mockReturnValue(mockEsClient);
    jest.spyOn(appContextService, 'getExperimentalFeatures').mockReturnValue({
      enableOTelVerifier: true,
    } as any);

    mockedGetAgentPolicySavedObjectType.mockResolvedValue('ingest-agent-policies');
  });

  describe('runVerifierPolicyCleanup', () => {
    it('deletes verifier policies past TTL', async () => {
      const sixMinutesAgo = minutesAgo(6);
      mockedAgentPolicyService.list.mockResolvedValueOnce({
        items: [{ id: 'expired-verifier', created_at: sixMinutesAgo, updated_at: sixMinutesAgo }],
      } as any);
      mockedAgentPolicyService.deleteVerifierPolicy.mockResolvedValue();

      await runVerifierPolicyCleanup(new AbortController());

      expect(mockedAgentPolicyService.deleteVerifierPolicy).toHaveBeenCalledWith(
        expect.anything(),
        mockEsClient,
        'expired-verifier'
      );
    });

    it('does not delete verifier policies within TTL', async () => {
      const twoMinutesAgo = minutesAgo(2);
      mockedAgentPolicyService.list.mockResolvedValueOnce({
        items: [{ id: 'fresh-verifier', created_at: twoMinutesAgo, updated_at: twoMinutesAgo }],
      } as any);

      await runVerifierPolicyCleanup(new AbortController());

      expect(mockedAgentPolicyService.deleteVerifierPolicy).not.toHaveBeenCalled();
    });

    it('lists verifier policies across all spaces', async () => {
      mockedAgentPolicyService.list.mockResolvedValueOnce({ items: [] } as any);

      await runVerifierPolicyCleanup(new AbortController());

      expect(mockedAgentPolicyService.list).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          kuery: expect.stringContaining('is_verifier: true'),
          spaceId: '*',
        })
      );
    });

    it('logs when list fails', async () => {
      mockedAgentPolicyService.list.mockRejectedValueOnce(new Error('list exploded'));

      await runVerifierPolicyCleanup(new AbortController());

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to cleanup verifier policies')
      );
    });

    it('logs when delete fails and continues with other policies', async () => {
      const sixMinutesAgo = minutesAgo(6);
      mockedAgentPolicyService.list.mockResolvedValueOnce({
        items: [
          { id: 'bad-verifier', created_at: sixMinutesAgo, updated_at: sixMinutesAgo },
          { id: 'good-verifier', created_at: sixMinutesAgo, updated_at: sixMinutesAgo },
        ],
      } as any);
      mockedAgentPolicyService.deleteVerifierPolicy
        .mockRejectedValueOnce(new Error('delete failed'))
        .mockResolvedValueOnce(undefined);

      await runVerifierPolicyCleanup(new AbortController());

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to delete verifier policy bad-verifier')
      );
      expect(mockedAgentPolicyService.deleteVerifierPolicy).toHaveBeenCalledTimes(2);
    });

    it('no-ops when OTel verifier feature is disabled', async () => {
      jest.spyOn(appContextService, 'getExperimentalFeatures').mockReturnValue({
        enableOTelVerifier: false,
      } as any);

      await runVerifierPolicyCleanup(new AbortController());

      expect(mockedAgentPolicyService.list).not.toHaveBeenCalled();
    });
  });

  describe('registerVerifierPolicyCleanupTask', () => {
    it('registers the task definition', () => {
      const taskManager = taskManagerMock.createSetup();
      registerVerifierPolicyCleanupTask(taskManager);
      expect(taskManager.registerTaskDefinitions).toHaveBeenCalledWith(
        expect.objectContaining({
          'fleet:verifier_policy_cleanup': expect.objectContaining({
            title: 'OTel Permission Verifier Cleanup Task',
            timeout: '30m',
          }),
        })
      );
    });
  });

  describe('scheduleVerifierPolicyCleanupTask', () => {
    it('ensures scheduled task with 5m interval', async () => {
      const taskManager = taskManagerMock.createStart();
      await scheduleVerifierPolicyCleanupTask(taskManager);
      expect(taskManager.ensureScheduled).toHaveBeenCalledWith({
        id: 'fleet:verifier_policy_cleanup:1.0.0',
        taskType: 'fleet:verifier_policy_cleanup',
        schedule: { interval: '5m' },
        state: {},
        params: {},
      });
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Scheduled recurring task')
      );
    });

    it('logs when scheduling fails', async () => {
      const taskManager = taskManagerMock.createStart();
      taskManager.ensureScheduled.mockRejectedValueOnce(new Error('schedule failed'));

      await scheduleVerifierPolicyCleanupTask(taskManager);

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error scheduling cleanup task'),
        expect.anything()
      );
    });
  });
});

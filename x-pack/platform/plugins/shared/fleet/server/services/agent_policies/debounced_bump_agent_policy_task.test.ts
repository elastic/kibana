/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
} from '@kbn/task-manager-plugin/server';
import { TaskStatus } from '@kbn/task-manager-plugin/server';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { isRetryableError } from '@kbn/task-manager-plugin/server/task_running';
import { loggingSystemMock } from '@kbn/core/server/mocks';

import type { AgentPolicy } from '../../types';
import { agentPolicyService } from '../agent_policy';

import { appContextService } from '..';

import {
  DEBOUNCED_BUMP_AGENT_POLICY_DEFAULT_DELAY_MS,
  getDebouncedBumpAgentPolicyTaskId,
  registerDebouncedBumpAgentPolicyTask,
  scheduleDebouncedBumpAgentPolicyTask,
} from './debounced_bump_agent_policy_task';

jest.mock('../app_context');
jest.mock('../agent_policy');

const mockedAgentPolicyService = jest.mocked(agentPolicyService);
const mockedAppContextService = jest.mocked(appContextService);

const TASK_TYPE = 'fleet:debounced_bump_agent_policy';
const TASK_ID = getDebouncedBumpAgentPolicyTaskId('policy-1');
const NOW = new Date('2026-10-30T12:00:00.000Z');

const unscopedSoClient = { __unscoped: true };
const esClient = { __es: true };

const conflict = () => SavedObjectsErrorHelpers.createConflictError('task', TASK_ID);
const existingTask = (status: TaskStatus) => ({ id: TASK_ID, status } as ConcreteTaskInstance);

describe('debounced_bump_agent_policy_task', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers({ now: NOW });
    mockedAppContextService.getLogger.mockReturnValue(loggingSystemMock.createLogger());
    mockedAppContextService.getInternalUserSOClientWithoutSpaceExtension.mockReturnValue(
      unscopedSoClient as unknown as ReturnType<
        typeof appContextService.getInternalUserSOClientWithoutSpaceExtension
      >
    );
    mockedAppContextService.getInternalUserSOClientForSpaceId.mockImplementation(
      (spaceId) =>
        ({ __space: spaceId } as unknown as ReturnType<
          typeof appContextService.getInternalUserSOClientForSpaceId
        >)
    );
    mockedAppContextService.getInternalUserESClient.mockReturnValue(
      esClient as unknown as ReturnType<typeof appContextService.getInternalUserESClient>
    );
    mockedAgentPolicyService.getByIds.mockResolvedValue([
      { id: 'policy-1', space_ids: ['space-a'] } as AgentPolicy,
    ]);
    mockedAgentPolicyService.bumpRevision.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('scheduleDebouncedBumpAgentPolicyTask', () => {
    it('schedules one delayed task per agent policy, keyed on the policy id', async () => {
      const taskManager = taskManagerMock.createStart();

      await scheduleDebouncedBumpAgentPolicyTask(taskManager, ['policy-1', 'policy-1', 'policy-2']);

      expect(taskManager.schedule).toHaveBeenCalledTimes(2);
      expect(taskManager.schedule).toHaveBeenCalledWith({
        id: TASK_ID,
        taskType: TASK_TYPE,
        scope: ['fleet'],
        params: { agentPolicyId: 'policy-1' },
        state: {},
        runAt: new Date(NOW.getTime() + DEBOUNCED_BUMP_AGENT_POLICY_DEFAULT_DELAY_MS),
      });
      expect(mockedAgentPolicyService.bumpRevision).not.toHaveBeenCalled();
    });

    it('uses the given delay', async () => {
      const taskManager = taskManagerMock.createStart();

      await scheduleDebouncedBumpAgentPolicyTask(taskManager, ['policy-1'], { delayMs: 0 });

      expect(taskManager.schedule).toHaveBeenCalledWith(expect.objectContaining({ runAt: NOW }));
    });

    it.each([TaskStatus.Idle, TaskStatus.Claiming])(
      'joins a pending %s bump instead of bumping again',
      async (status) => {
        const taskManager = taskManagerMock.createStart();
        taskManager.schedule.mockRejectedValue(conflict());
        taskManager.get.mockResolvedValue(existingTask(status));

        await scheduleDebouncedBumpAgentPolicyTask(taskManager, ['policy-1']);

        expect(taskManager.runSoon).not.toHaveBeenCalled();
        expect(mockedAgentPolicyService.bumpRevision).not.toHaveBeenCalled();
      }
    );

    it('pulls a pending bump forward when the delay is zero', async () => {
      const taskManager = taskManagerMock.createStart();
      taskManager.schedule.mockRejectedValue(conflict());
      taskManager.get.mockResolvedValue(existingTask(TaskStatus.Idle));

      await scheduleDebouncedBumpAgentPolicyTask(taskManager, ['policy-1'], { delayMs: 0 });

      expect(taskManager.runSoon).toHaveBeenCalledWith(TASK_ID);
      expect(mockedAgentPolicyService.bumpRevision).not.toHaveBeenCalled();
    });

    it('bumps directly when a running bump may already have read the agent policy', async () => {
      const taskManager = taskManagerMock.createStart();
      taskManager.schedule.mockRejectedValue(conflict());
      taskManager.get.mockResolvedValue(existingTask(TaskStatus.Running));

      await scheduleDebouncedBumpAgentPolicyTask(taskManager, ['policy-1']);

      expect(mockedAgentPolicyService.bumpRevision).toHaveBeenCalledTimes(1);
    });

    it('schedules again when the pending bump finished in between', async () => {
      const taskManager = taskManagerMock.createStart();
      taskManager.schedule.mockRejectedValueOnce(conflict());
      taskManager.get.mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createGenericNotFoundError('task', TASK_ID)
      );

      await scheduleDebouncedBumpAgentPolicyTask(taskManager, ['policy-1']);

      expect(taskManager.schedule).toHaveBeenCalledTimes(2);
      expect(mockedAgentPolicyService.bumpRevision).not.toHaveBeenCalled();
    });

    it('bumps directly when Task Manager cannot schedule the bump', async () => {
      const taskManager = taskManagerMock.createStart();
      taskManager.schedule.mockRejectedValue(new Error('task index unavailable'));

      await scheduleDebouncedBumpAgentPolicyTask(taskManager, ['policy-1']);

      expect(mockedAgentPolicyService.bumpRevision).toHaveBeenCalledTimes(1);
    });
  });

  describe('task runner', () => {
    const runTask = (signal = new AbortController().signal): Promise<unknown> => {
      const registerTaskDefinitions = jest.fn();
      registerDebouncedBumpAgentPolicyTask({
        registerTaskDefinitions,
      } as unknown as TaskManagerSetupContract);
      const definition = registerTaskDefinitions.mock.calls[0][0][TASK_TYPE];

      return definition
        .createTaskRunner(
          taskManagerMock.createRunContext({
            taskInstance: {
              params: { agentPolicyId: 'policy-1' },
            } as unknown as ConcreteTaskInstance,
            signal,
          })
        )
        .run();
    };

    const getRunError = (signal?: AbortSignal): Promise<Error> =>
      runTask(signal).then(
        () => {
          throw new Error('Expected the task run to fail');
        },
        (error: Error) => error
      );

    it('bumps through a space the agent policy lives in', async () => {
      await expect(runTask()).resolves.toEqual({ state: {} });

      expect(mockedAgentPolicyService.getByIds).toHaveBeenCalledWith(
        unscopedSoClient,
        [{ id: 'policy-1', spaceId: '*' }],
        expect.objectContaining({ ignoreMissing: true })
      );
      expect(mockedAgentPolicyService.bumpRevision).toHaveBeenCalledWith(
        { __space: 'space-a' },
        esClient,
        'policy-1',
        { asyncDeploy: true }
      );
    });

    it('skips a missing agent policy', async () => {
      mockedAgentPolicyService.getByIds.mockResolvedValue([]);

      await expect(runTask()).resolves.toEqual({ state: {} });

      expect(mockedAgentPolicyService.bumpRevision).not.toHaveBeenCalled();
    });

    it('retries a version conflict shortly', async () => {
      mockedAgentPolicyService.bumpRevision.mockRejectedValue(
        SavedObjectsErrorHelpers.createConflictError('ingest-agent-policies', 'policy-1')
      );

      const error = await getRunError();

      expect(isRetryableError(error)).toEqual(new Date(NOW.getTime() + 1_000));
    });

    it('retries other failures with the default backoff', async () => {
      mockedAgentPolicyService.bumpRevision.mockRejectedValue(new Error('es down'));

      const error = await getRunError();

      expect(isRetryableError(error)).toBe(true);
    });

    it('retries instead of dropping the bump when aborted', async () => {
      const controller = new AbortController();
      controller.abort();

      const error = await getRunError(controller.signal);

      expect(isRetryableError(error)).toBe(true);
      expect(mockedAgentPolicyService.bumpRevision).not.toHaveBeenCalled();
    });
  });
});

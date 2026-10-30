/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { TaskStatus } from '@kbn/task-manager-plugin/server';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';

import { agentPolicyService } from '../agent_policy';

import { appContextService } from '..';

import {
  DEBOUNCED_BUMP_AGENT_POLICY_DEFAULT_DELAY_MS,
  getDebouncedBumpAgentPolicyTaskId,
  registerBumpAgentPoliciesByIdTask,
  scheduleBumpAgentPoliciesByIdTask,
  scheduleDebouncedBumpAgentPoliciesByIdTask,
} from './bump_agent_policies_by_id_task';

jest.mock('../app_context');
jest.mock('../agent_policy');
jest.mock('../epm/packages/cache', () => ({
  runWithCache: jest.fn((fn: () => Promise<unknown>) => fn()),
}));

const mockedAgentPolicyService = jest.mocked(agentPolicyService);
const mockedAppContextService = jest.mocked(appContextService);

const TASK_TYPE = 'fleet:bump_agent_policies_by_id';

const getRegisteredTaskRunner = (
  taskInstance: ConcreteTaskInstance,
  signal = new AbortController().signal
): { run: () => Promise<unknown> } => {
  const registerTaskDefinitions = jest.fn();
  registerBumpAgentPoliciesByIdTask({
    registerTaskDefinitions,
  } as unknown as TaskManagerSetupContract);

  const definition = registerTaskDefinitions.mock.calls[0][0][TASK_TYPE];
  return definition.createTaskRunner(
    taskManagerMock.createRunContext({ taskInstance, signal })
  ) as any;
};

const buildTaskInstance = (params: Record<string, unknown>): ConcreteTaskInstance =>
  ({ params } as unknown as ConcreteTaskInstance);

describe('bump_agent_policies_by_id_task', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAppContextService.getLogger.mockReturnValue(loggingSystemMock.createLogger());
  });

  describe('task runner', () => {
    it('bumps the policies grouped by space, preserving the user', async () => {
      const user = { username: 'jdoe' } as any;
      const runner = getRegisteredTaskRunner(
        buildTaskInstance({
          agentPolicyIdsWithSpace: [
            { id: 'policy-1', spaceId: 'default' },
            { id: 'policy-2', spaceId: 'space-a' },
            { id: 'policy-3', spaceId: 'space-a' },
          ],
          user,
        })
      );

      await runner.run();

      expect(mockedAgentPolicyService.bumpAgentPoliciesByIds).toHaveBeenCalledTimes(2);
      expect(mockedAgentPolicyService.bumpAgentPoliciesByIds).toHaveBeenCalledWith(
        ['policy-1'],
        { user },
        'default'
      );
      expect(mockedAgentPolicyService.bumpAgentPoliciesByIds).toHaveBeenCalledWith(
        ['policy-2', 'policy-3'],
        { user },
        'space-a'
      );
    });

    it('does nothing when there are no policies to bump', async () => {
      const runner = getRegisteredTaskRunner(buildTaskInstance({ agentPolicyIdsWithSpace: [] }));

      await runner.run();

      expect(mockedAgentPolicyService.bumpAgentPoliciesByIds).not.toHaveBeenCalled();
    });

    it('stops processing further spaces when aborted', async () => {
      const abortController = new AbortController();
      abortController.abort();

      const runner = getRegisteredTaskRunner(
        buildTaskInstance({
          agentPolicyIdsWithSpace: [
            { id: 'policy-1', spaceId: 'default' },
            { id: 'policy-2', spaceId: 'space-a' },
          ],
        }),
        abortController.signal
      );

      await runner.run();

      expect(mockedAgentPolicyService.bumpAgentPoliciesByIds).not.toHaveBeenCalled();
    });
  });

  describe('scheduleBumpAgentPoliciesByIdTask', () => {
    it('schedules the task with the policy ids and user', async () => {
      const schedule = jest.fn();
      const taskManagerStart = { schedule } as unknown as TaskManagerStartContract;
      const agentPolicyIdsWithSpace = [{ id: 'policy-1', spaceId: 'default' }];
      const user = { username: 'jdoe' } as any;

      await scheduleBumpAgentPoliciesByIdTask(taskManagerStart, agentPolicyIdsWithSpace, user);

      expect(schedule).toHaveBeenCalledTimes(1);
      expect(schedule).toHaveBeenCalledWith(
        expect.objectContaining({
          taskType: TASK_TYPE,
          scope: ['fleet'],
          params: { agentPolicyIdsWithSpace, user },
        })
      );
    });

    it('splits large sets into multiple tasks of at most 100 policies each', async () => {
      const schedule = jest.fn();
      const taskManagerStart = { schedule } as unknown as TaskManagerStartContract;
      const agentPolicyIdsWithSpace = Array.from({ length: 250 }, (_, i) => ({
        id: `policy-${i}`,
        spaceId: 'default',
      }));

      await scheduleBumpAgentPoliciesByIdTask(taskManagerStart, agentPolicyIdsWithSpace);

      expect(schedule).toHaveBeenCalledTimes(3);
      expect(schedule.mock.calls[0][0].params.agentPolicyIdsWithSpace).toHaveLength(100);
      expect(schedule.mock.calls[1][0].params.agentPolicyIdsWithSpace).toHaveLength(100);
      expect(schedule.mock.calls[2][0].params.agentPolicyIdsWithSpace).toHaveLength(50);
    });

    it('does not schedule anything when there are no policies', async () => {
      const schedule = jest.fn();
      const taskManagerStart = { schedule } as unknown as TaskManagerStartContract;

      await scheduleBumpAgentPoliciesByIdTask(taskManagerStart, []);

      expect(schedule).not.toHaveBeenCalled();
    });
  });

  describe('scheduleDebouncedBumpAgentPoliciesByIdTask', () => {
    const NOW = new Date('2026-10-30T12:00:00.000Z');
    const TASK_ID = getDebouncedBumpAgentPolicyTaskId('policy-1');
    const policy1 = { id: 'policy-1', spaceId: 'space-a' };

    const conflict = () => SavedObjectsErrorHelpers.createConflictError('task', TASK_ID);
    const existingTask = (status: TaskStatus) => ({ id: TASK_ID, status } as ConcreteTaskInstance);

    beforeEach(() => {
      jest.useFakeTimers({ now: NOW });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('schedules one delayed task per agent policy, keyed on the policy id', async () => {
      const taskManager = taskManagerMock.createStart();

      await scheduleDebouncedBumpAgentPoliciesByIdTask(taskManager, [
        policy1,
        policy1,
        { id: 'policy-2', spaceId: 'default' },
      ]);

      expect(taskManager.schedule).toHaveBeenCalledTimes(2);
      expect(taskManager.schedule).toHaveBeenCalledWith({
        id: TASK_ID,
        scope: ['fleet'],
        params: { agentPolicyIdsWithSpace: [policy1] },
        taskType: TASK_TYPE,
        runAt: new Date(NOW.getTime() + DEBOUNCED_BUMP_AGENT_POLICY_DEFAULT_DELAY_MS),
        state: {},
      });
      expect(mockedAgentPolicyService.bumpAgentPoliciesByIds).not.toHaveBeenCalled();
    });

    it('uses the given delay', async () => {
      const taskManager = taskManagerMock.createStart();

      await scheduleDebouncedBumpAgentPoliciesByIdTask(taskManager, [policy1], { delayMs: 0 });

      expect(taskManager.schedule).toHaveBeenCalledWith(expect.objectContaining({ runAt: NOW }));
    });

    it.each([TaskStatus.Idle, TaskStatus.Claiming])(
      'joins a pending %s bump instead of bumping again',
      async (status) => {
        const taskManager = taskManagerMock.createStart();
        taskManager.schedule.mockRejectedValue(conflict());
        taskManager.get.mockResolvedValue(existingTask(status));

        await scheduleDebouncedBumpAgentPoliciesByIdTask(taskManager, [policy1]);

        expect(taskManager.runSoon).not.toHaveBeenCalled();
        expect(mockedAgentPolicyService.bumpAgentPoliciesByIds).not.toHaveBeenCalled();
      }
    );

    it('pulls a pending bump forward when the delay is zero', async () => {
      const taskManager = taskManagerMock.createStart();
      taskManager.schedule.mockRejectedValue(conflict());
      taskManager.get.mockResolvedValue(existingTask(TaskStatus.Idle));

      await scheduleDebouncedBumpAgentPoliciesByIdTask(taskManager, [policy1], { delayMs: 0 });

      expect(taskManager.runSoon).toHaveBeenCalledWith(TASK_ID);
      expect(mockedAgentPolicyService.bumpAgentPoliciesByIds).not.toHaveBeenCalled();
    });

    it('bumps directly when a running bump may already have read the agent policy', async () => {
      const taskManager = taskManagerMock.createStart();
      taskManager.schedule.mockRejectedValue(conflict());
      taskManager.get.mockResolvedValue(existingTask(TaskStatus.Running));

      await scheduleDebouncedBumpAgentPoliciesByIdTask(taskManager, [policy1]);

      expect(mockedAgentPolicyService.bumpAgentPoliciesByIds).toHaveBeenCalledWith(
        ['policy-1'],
        undefined,
        'space-a'
      );
    });

    it('schedules again when the pending bump finished in between', async () => {
      const taskManager = taskManagerMock.createStart();
      taskManager.schedule.mockRejectedValueOnce(conflict());
      taskManager.get.mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createGenericNotFoundError('task', TASK_ID)
      );

      await scheduleDebouncedBumpAgentPoliciesByIdTask(taskManager, [policy1]);

      expect(taskManager.schedule).toHaveBeenCalledTimes(2);
      expect(mockedAgentPolicyService.bumpAgentPoliciesByIds).not.toHaveBeenCalled();
    });

    it('bumps directly when Task Manager cannot schedule the bump', async () => {
      const taskManager = taskManagerMock.createStart();
      taskManager.schedule.mockRejectedValue(new Error('task index unavailable'));

      await scheduleDebouncedBumpAgentPoliciesByIdTask(taskManager, [policy1]);

      expect(mockedAgentPolicyService.bumpAgentPoliciesByIds).toHaveBeenCalledTimes(1);
    });
  });
});

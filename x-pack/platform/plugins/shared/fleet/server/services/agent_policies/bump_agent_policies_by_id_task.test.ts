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
import { loggingSystemMock } from '@kbn/core/server/mocks';

import { agentPolicyService } from '../agent_policy';

import { appContextService } from '..';

import {
  registerBumpAgentPoliciesByIdTask,
  scheduleBumpAgentPoliciesByIdTask,
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
  taskInstance: ConcreteTaskInstance
): { run: () => Promise<unknown>; cancel: () => Promise<void> } => {
  const registerTaskDefinitions = jest.fn();
  registerBumpAgentPoliciesByIdTask({
    registerTaskDefinitions,
  } as unknown as TaskManagerSetupContract);

  const definition = registerTaskDefinitions.mock.calls[0][0][TASK_TYPE];
  return definition.createTaskRunner({ taskInstance }) as any;
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

    it('throws and stops processing further spaces once cancelled', async () => {
      const runner = getRegisteredTaskRunner(
        buildTaskInstance({
          agentPolicyIdsWithSpace: [
            { id: 'policy-1', spaceId: 'default' },
            { id: 'policy-2', spaceId: 'space-a' },
          ],
        })
      );

      await runner.cancel();

      await expect(runner.run()).rejects.toThrow('Task has been cancelled');
      expect(mockedAgentPolicyService.bumpAgentPoliciesByIds).not.toHaveBeenCalled();
    });
  });

  describe('scheduleBumpAgentPoliciesByIdTask', () => {
    it('schedules the task with the policy ids and user', async () => {
      const ensureScheduled = jest.fn();
      const taskManagerStart = { ensureScheduled } as unknown as TaskManagerStartContract;
      const agentPolicyIdsWithSpace = [{ id: 'policy-1', spaceId: 'default' }];
      const user = { username: 'jdoe' } as any;

      await scheduleBumpAgentPoliciesByIdTask(taskManagerStart, agentPolicyIdsWithSpace, user);

      expect(ensureScheduled).toHaveBeenCalledTimes(1);
      expect(ensureScheduled).toHaveBeenCalledWith(
        expect.objectContaining({
          taskType: TASK_TYPE,
          scope: ['fleet'],
          params: { agentPolicyIdsWithSpace, user },
        })
      );
    });

    it('does not schedule anything when there are no policies', async () => {
      const ensureScheduled = jest.fn();
      const taskManagerStart = { ensureScheduled } as unknown as TaskManagerStartContract;

      await scheduleBumpAgentPoliciesByIdTask(taskManagerStart, []);

      expect(ensureScheduled).not.toHaveBeenCalled();
    });
  });
});

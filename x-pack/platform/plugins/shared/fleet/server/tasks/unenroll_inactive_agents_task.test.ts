/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import type { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import { TaskStatus } from '@kbn/task-manager-plugin/server';
import { getDeleteTaskRunResult } from '@kbn/task-manager-plugin/server/task';
import type { CoreSetup } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';

import { agentPolicyService } from '../services';
import { createAgentPolicyMock } from '../../common/mocks';
import { createAppContextStartContractMock } from '../mocks';
import { getAgentsByKuery } from '../services/agents';

import { appContextService } from '../services';

import { unenrollBatch } from '../services/agents/unenroll_action_runner';

import type { AgentPolicy } from '../types';

import {
  UnenrollInactiveAgentsTask,
  TYPE,
  VERSION,
  POLICIES_BATCHSIZE,
} from './unenroll_inactive_agents_task';

jest.mock('../services');
jest.mock('../services/agents');
jest.mock('../services/agents/unenroll_action_runner');

const MOCK_TASK_INSTANCE = {
  id: `${TYPE}:${VERSION}`,
  runAt: new Date(),
  attempts: 0,
  ownerId: '',
  status: TaskStatus.Running,
  startedAt: new Date(),
  scheduledAt: new Date(),
  retryAt: new Date(),
  params: {},
  state: {},
  taskType: TYPE,
};

const mockAgentPolicyService = agentPolicyService as jest.Mocked<typeof agentPolicyService>;
const mockedGetAgentsByKuery = getAgentsByKuery as jest.MockedFunction<typeof getAgentsByKuery>;

describe('UnenrollInactiveAgentsTask', () => {
  const { createSetup: coreSetupMock } = coreMock;
  const { createSetup: tmSetupMock, createStart: tmStartMock } = taskManagerMock;

  let mockContract: ReturnType<typeof createAppContextStartContractMock>;
  let mockTask: UnenrollInactiveAgentsTask;
  let mockCore: CoreSetup;
  let mockTaskManagerSetup: jest.Mocked<TaskManagerSetupContract>;
  const mockedUnenrollBatch = jest.mocked(unenrollBatch);

  const agents = [
    {
      id: 'agent-1',
      policy_id: 'agent-policy-2',
      status: 'inactive',
    },
    {
      id: 'agent-2',
      policy_id: 'agent-policy-1',
      status: 'inactive',
    },
    {
      id: 'agent-3',
      policy_id: 'agent-policy-1',
      status: 'active',
    },
  ];

  const getMockAgentPolicyFetchAllAgentPolicies = (items: AgentPolicy[]) =>
    jest.fn().mockResolvedValue(
      jest.fn(async function* () {
        yield items;
      })()
    );

  beforeEach(() => {
    mockContract = createAppContextStartContractMock();
    appContextService.start(mockContract);
    mockCore = coreSetupMock();
    mockTaskManagerSetup = tmSetupMock();
    mockTask = new UnenrollInactiveAgentsTask({
      core: mockCore,
      taskManager: mockTaskManagerSetup,
      logFactory: loggingSystemMock.create(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Task lifecycle', () => {
    it('Should create task', () => {
      expect(mockTask).toBeInstanceOf(UnenrollInactiveAgentsTask);
    });

    it('Should register task', () => {
      expect(mockTaskManagerSetup.registerTaskDefinitions).toHaveBeenCalled();
    });

    it('Should schedule task', async () => {
      const mockTaskManagerStart = tmStartMock();
      await mockTask.start({ taskManager: mockTaskManagerStart });
      expect(mockTaskManagerStart.ensureScheduled).toHaveBeenCalled();
    });
  });

  describe('Task logic', () => {
    const runTask = async (taskInstance = MOCK_TASK_INSTANCE) => {
      const mockTaskManagerStart = tmStartMock();
      await mockTask.start({ taskManager: mockTaskManagerStart });
      const createTaskRunner =
        mockTaskManagerSetup.registerTaskDefinitions.mock.calls[0][0][TYPE].createTaskRunner;
      const taskRunner = createTaskRunner({ taskInstance });
      return taskRunner.run();
    };

    beforeEach(() => {
      mockAgentPolicyService.fetchAllAgentPolicies = getMockAgentPolicyFetchAllAgentPolicies([
        createAgentPolicyMock({ unenroll_timeout: 3000 }),
        createAgentPolicyMock({ id: 'agent-policy-2', unenroll_timeout: 1000 }),
      ]);

      mockedGetAgentsByKuery.mockResolvedValue({
        agents,
      } as any);
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('Should unenroll eligible agents', async () => {
      mockedUnenrollBatch.mockResolvedValueOnce({ actionId: 'actionid-01' });
      await runTask();
      expect(mockedUnenrollBatch).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        agents,
        {
          force: true,
          revoke: true,
          actionId: expect.stringContaining('UnenrollInactiveAgentsTask-'),
        }
      );
    });

    it('Should not run if task is outdated', async () => {
      const result = await runTask({ ...MOCK_TASK_INSTANCE, id: 'old-id' });

      expect(mockedUnenrollBatch).not.toHaveBeenCalled();
      expect(result).toEqual(getDeleteTaskRunResult());
    });

    it('Should exit if there are no agents policies with unenroll_timeout set', async () => {
      mockAgentPolicyService.fetchAllAgentPolicies = getMockAgentPolicyFetchAllAgentPolicies([]);
      await runTask();
      expect(mockedUnenrollBatch).not.toHaveBeenCalled();
    });

    it('Should exit if there are no eligible agents to unenroll', async () => {
      mockedGetAgentsByKuery.mockResolvedValue({
        agents: [],
      } as any);
      await runTask();
      expect(mockedUnenrollBatch).not.toHaveBeenCalled();
    });

    it('Should process large numbers of policies in batches', async () => {
      const firstAgentPoliciesBatch = Array.from({ length: POLICIES_BATCHSIZE }, (_, i) =>
        createAgentPolicyMock({ id: `agent-policy-${i + 1}` })
      );
      const secondAgentPoliciesBatch = Array.from({ length: 3 }, (_, i) =>
        createAgentPolicyMock({
          id: `agent-policy-${POLICIES_BATCHSIZE + 1}`,
          unenroll_timeout: 1000,
        })
      );
      mockAgentPolicyService.fetchAllAgentPolicies = jest.fn().mockResolvedValue(
        jest.fn(async function* () {
          yield firstAgentPoliciesBatch;
          yield secondAgentPoliciesBatch;
        })()
      );
      const secondAgentPoliciesBatchAgents = [
        {
          id: 'agent-501',
          policy_id: 'agent-policy-501',
          status: 'inactive',
        },
        {
          id: 'agent-502',
          policy_id: 'agent-policy-502',
          status: 'inactive',
        },
        {
          id: 'agent-503',
          policy_id: 'agent-policy-503',
          status: 'active',
        },
      ];
      mockedGetAgentsByKuery
        .mockResolvedValueOnce({
          agents: [],
        } as any)
        .mockResolvedValueOnce({
          agents: secondAgentPoliciesBatchAgents,
        } as any);

      await runTask();
      expect(mockedUnenrollBatch).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        secondAgentPoliciesBatchAgents,
        {
          force: true,
          revoke: true,
          actionId: expect.stringContaining('UnenrollInactiveAgentsTask-'),
        }
      );
    });
  });
});

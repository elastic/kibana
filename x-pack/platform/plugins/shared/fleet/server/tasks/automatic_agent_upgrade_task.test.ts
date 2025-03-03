/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';
import { coreMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import type { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import { TaskStatus } from '@kbn/task-manager-plugin/server';
import { getDeleteTaskRunResult } from '@kbn/task-manager-plugin/server/task';

import { createAppContextStartContractMock } from '../mocks';
import { agentPolicyService, appContextService } from '../services';
import {
  fetchAllAgentsByKuery,
  getAgentsByKuery,
  sendUpgradeAgentsActions,
} from '../services/agents';
import { isAgentUpgradeable } from '../../common/services';
import type { Agent, AgentPolicy } from '../types';

import { AutomaticAgentUpgradeTask, TYPE, VERSION } from './automatic_agent_upgrade_task';

jest.mock('../../common/services');
jest.mock('../services');
jest.mock('../services/agents');

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
const mockedFetchAllAgentsByKuery = fetchAllAgentsByKuery as jest.MockedFunction<
  typeof fetchAllAgentsByKuery
>;
const mockedGetAgentsByKuery = getAgentsByKuery as jest.MockedFunction<typeof getAgentsByKuery>;
const mockedSendUpgradeAgentsActions = sendUpgradeAgentsActions as jest.MockedFunction<
  typeof sendUpgradeAgentsActions
>;
const mockedIsAgentUpgradeable = isAgentUpgradeable as jest.MockedFunction<
  typeof isAgentUpgradeable
>;

const getMockAgentPolicyFetchAllAgentPolicies = (items: AgentPolicy[]) =>
  jest.fn().mockResolvedValue(
    jest.fn(async function* () {
      yield items;
    })()
  );

const getMockFetchAllAgentsByKuery = (items: Agent[]) =>
  jest.fn(async function* () {
    yield items;
  })();

const mockDefaultAgentPolicy = () => {
  const agentPolicies = [
    {
      id: 'agent-policy-1',
      required_versions: [{ version: '8.18.0', percentage: 30 }],
    },
  ] as AgentPolicy[];
  mockAgentPolicyService.fetchAllAgentPolicies =
    getMockAgentPolicyFetchAllAgentPolicies(agentPolicies);
};

const generateAgents = (
  nAgents: number,
  agentPolicyId: string,
  version: string,
  status: string = 'online'
) => {
  return [
    ...Array(nAgents)
      .fill({})
      .map((_, i) => ({
        id: `agent-${i}`,
        policy_id: agentPolicyId,
        status,
        agent: { version },
      })),
  ] as Agent[];
};

describe('AutomaticAgentUpgradeTask', () => {
  const { createSetup: coreSetupMock } = coreMock;
  const { createSetup: tmSetupMock, createStart: tmStartMock } = taskManagerMock;

  let mockContract: ReturnType<typeof createAppContextStartContractMock>;
  let mockTask: AutomaticAgentUpgradeTask;
  let mockCore: CoreSetup;
  let mockTaskManagerSetup: jest.Mocked<TaskManagerSetupContract>;

  beforeEach(() => {
    mockContract = createAppContextStartContractMock();
    appContextService.start(mockContract);
    mockCore = coreSetupMock();
    mockTaskManagerSetup = tmSetupMock();
    mockTask = new AutomaticAgentUpgradeTask({
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
      expect(mockTask).toBeInstanceOf(AutomaticAgentUpgradeTask);
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
      jest
        .spyOn(appContextService, 'getExperimentalFeatures')
        .mockReturnValue({ enableAutomaticAgentUpgrades: true } as any);
      mockedIsAgentUpgradeable.mockReturnValue(true);
      mockedSendUpgradeAgentsActions.mockResolvedValue({ actionId: 'action-1' });
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('Should not run if task is outdated', async () => {
      const result = await runTask({ ...MOCK_TASK_INSTANCE, id: 'old-id' });

      expect(mockAgentPolicyService.fetchAllAgentPolicies).not.toHaveBeenCalled();
      expect(result).toEqual(getDeleteTaskRunResult());
    });

    it('Should exit if the enableAutomaticAgentUpgrades feature flag is disabled', async () => {
      jest
        .spyOn(appContextService, 'getExperimentalFeatures')
        .mockReturnValue({ enableAutomaticAgentUpgrades: false } as any);

      await runTask();

      expect(mockAgentPolicyService.fetchAllAgentPolicies).not.toHaveBeenCalled();
    });

    it('Should upgrade eligible agents', async () => {
      mockDefaultAgentPolicy();
      const agents = generateAgents(10, 'agent-policy-1', '8.15.0');
      mockedGetAgentsByKuery
        .mockResolvedValueOnce({ total: agents.length } as any) // active agents
        .mockResolvedValueOnce({ total: 0 } as any); // agents on or updating to target version
      mockedFetchAllAgentsByKuery.mockResolvedValue(getMockFetchAllAgentsByKuery(agents));

      await runTask();

      expect(mockedSendUpgradeAgentsActions).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        {
          agents: agents.slice(0, 3),
          version: '8.18.0',
          isAutomatic: true,
        }
      );
    });

    it('Should take agents already on target version into account', async () => {
      mockDefaultAgentPolicy();
      const agents = [
        ...generateAgents(10, 'agent-policy-1', '8.15.0'),
        {
          id: 'agent-11',
          policy_id: 'agent-policy-1',
          status: 'online',
          agent: { version: '8.18.0' },
        },
      ] as Agent[];
      mockedGetAgentsByKuery
        .mockResolvedValueOnce({ total: agents.length } as any) // active agents
        .mockResolvedValueOnce({ total: 1 } as any); // agents on or updating to target version
      mockedFetchAllAgentsByKuery.mockResolvedValue(getMockFetchAllAgentsByKuery(agents));

      await runTask();

      expect(mockedSendUpgradeAgentsActions).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        {
          agents: agents.slice(0, 2),
          version: '8.18.0',
          isAutomatic: true,
        }
      );
    });

    it('Should take agents already upgrading to target version into account', async () => {
      mockDefaultAgentPolicy();
      const agents = [
        ...generateAgents(10, 'agent-policy-1', '8.15.0'),
        {
          id: 'agent-11',
          policy_id: 'agent-policy-1',
          status: 'updating',
          agent: { version: '8.15.0' },
          upgrade_details: { target_version: '8.18.0' },
        },
      ] as Agent[];
      mockedGetAgentsByKuery
        .mockResolvedValueOnce({ total: agents.length } as any) // active agents
        .mockResolvedValueOnce({ total: 1 } as any); // agents on or updating to target version
      mockedFetchAllAgentsByKuery.mockResolvedValue(getMockFetchAllAgentsByKuery(agents));

      await runTask();

      expect(mockedSendUpgradeAgentsActions).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        {
          agents: agents.slice(0, 2),
          version: '8.18.0',
          isAutomatic: true,
        }
      );
    });

    it('Should not attempt to upgrade already upgrading agents', async () => {
      mockDefaultAgentPolicy();
      const agents = generateAgents(10, 'agent-policy-1', '8.15.0', 'updating');
      mockedGetAgentsByKuery
        .mockResolvedValueOnce({ total: agents.length } as any) // active agents
        .mockResolvedValueOnce({ total: agents.length } as any); // agents on or updating to target version
      mockedFetchAllAgentsByKuery.mockResolvedValue(getMockFetchAllAgentsByKuery(agents)); // active agents

      await runTask();

      expect(mockedSendUpgradeAgentsActions).not.toHaveBeenCalled();
    });

    it('Should set a rollout duration for upgrade batches bigger than 10 agents', async () => {
      mockDefaultAgentPolicy();
      const agents = generateAgents(100, 'agent-policy-1', '8.15.0');
      mockedGetAgentsByKuery
        .mockResolvedValueOnce({ total: agents.length } as any) // active agents
        .mockResolvedValueOnce({ total: 0 } as any); // agents on or updating to target version
      mockedFetchAllAgentsByKuery.mockResolvedValue(getMockFetchAllAgentsByKuery(agents));

      await runTask();

      expect(mockedSendUpgradeAgentsActions).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        {
          agents: agents.slice(0, 30),
          version: '8.18.0',
          upgradeDurationSeconds: 600,
          isAutomatic: true,
        }
      );
    });

    it('Should process agent policies in batches', async () => {
      const firstAgentPoliciesBatch = [
        {
          id: 'agent-policy-1',
          required_versions: [{ version: '8.18.0', percentage: 30 }],
        },
      ] as AgentPolicy[];
      const secondAgentPoliciesBatch = [
        {
          id: 'agent-policy-2',
          required_versions: [{ version: '8.18.0', percentage: 30 }],
        },
      ] as AgentPolicy[];
      mockAgentPolicyService.fetchAllAgentPolicies = jest.fn().mockResolvedValue(
        jest.fn(async function* () {
          yield firstAgentPoliciesBatch;
          yield secondAgentPoliciesBatch;
        })()
      );
      mockedGetAgentsByKuery
        .mockResolvedValueOnce({ total: 0 } as any) // active agents for first policy
        .mockResolvedValueOnce({ total: 10 } as any) // active agents
        .mockResolvedValueOnce({ total: 0 } as any); // agents on or updating to target version
      const agents = generateAgents(10, 'agent-policy-501', '8.15.0');
      mockedFetchAllAgentsByKuery.mockResolvedValue(getMockFetchAllAgentsByKuery(agents));

      await runTask();

      expect(mockedSendUpgradeAgentsActions).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        {
          agents: agents.slice(0, 3),
          version: '8.18.0',
          isAutomatic: true,
        }
      );
    });

    it('Should process agents in batches', async () => {
      const agentPolicies = [
        {
          id: 'agent-policy-1',
          required_versions: [{ version: '8.18.0', percentage: 70 }],
        },
      ] as AgentPolicy[];
      mockAgentPolicyService.fetchAllAgentPolicies =
        getMockAgentPolicyFetchAllAgentPolicies(agentPolicies);
      const agents = generateAgents(20, 'agent-policy-1', '8.15.0');
      const firstAgentsBatch = agents.slice(0, 10);
      const secondAgentsBatch = agents.slice(10);
      mockedGetAgentsByKuery
        .mockResolvedValueOnce({ total: agents.length } as any) // active agents
        .mockResolvedValueOnce({ total: 0 } as any); // agents on or updating to target version
      mockedFetchAllAgentsByKuery.mockResolvedValue(
        jest.fn(async function* () {
          yield firstAgentsBatch;
          yield secondAgentsBatch;
        })()
      );

      await runTask();

      expect(mockedSendUpgradeAgentsActions).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        {
          agents: firstAgentsBatch,
          version: '8.18.0',
          upgradeDurationSeconds: 600,
          isAutomatic: true,
        }
      );
      expect(mockedSendUpgradeAgentsActions).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        {
          agents: secondAgentsBatch.slice(0, 4),
          version: '8.18.0',
          isAutomatic: true,
        }
      );
    });
  });
});

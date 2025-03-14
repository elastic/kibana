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
  sendAutomaticUpgradeAgentsActions,
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
const mockedSendAutomaticUpgradeAgentsActions =
  sendAutomaticUpgradeAgentsActions as jest.MockedFunction<
    typeof sendAutomaticUpgradeAgentsActions
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
  agentPolicyId: string = 'agent-policy-1',
  version: string = '8.15.0',
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
      mockDefaultAgentPolicy();
      mockedIsAgentUpgradeable.mockReturnValue(true);
      mockedSendAutomaticUpgradeAgentsActions.mockResolvedValue({ actionId: 'action-1' });
    });

    afterEach(() => {
      jest.resetAllMocks();
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
      const agents = generateAgents(10);
      mockedGetAgentsByKuery
        .mockResolvedValueOnce({ total: agents.length } as any) // active agents
        .mockResolvedValueOnce({ total: 0 } as any); // agents on or updating to target version
      mockedFetchAllAgentsByKuery
        .mockResolvedValueOnce(getMockFetchAllAgentsByKuery([])) // agents marked for retry
        .mockResolvedValueOnce(getMockFetchAllAgentsByKuery(agents)); // active agents

      await runTask();

      expect(mockedSendAutomaticUpgradeAgentsActions).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        {
          agents: agents.slice(0, 3),
          version: '8.18.0',
        }
      );
    });

    it('Should take agents already on target version into account', async () => {
      const agents = [
        ...generateAgents(10),
        ...generateAgents(1, 'agent-policy-1', '8.18.0', 'online'),
      ];
      mockedGetAgentsByKuery
        .mockResolvedValueOnce({ total: agents.length } as any) // active agents
        .mockResolvedValueOnce({ total: 1 } as any); // agents on or updating to target version
      mockedFetchAllAgentsByKuery
        .mockResolvedValueOnce(getMockFetchAllAgentsByKuery([])) // agents marked for retry
        .mockResolvedValue(getMockFetchAllAgentsByKuery(agents)); // active agents

      await runTask();

      expect(mockedSendAutomaticUpgradeAgentsActions).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        {
          agents: agents.slice(0, 2),
          version: '8.18.0',
        }
      );
    });

    it('Should take agents already upgrading to target version into account', async () => {
      const agents = [
        ...generateAgents(10),
        ...generateAgents(1, 'agent-policy-1', '8.15.0', 'updating'),
      ];
      mockedGetAgentsByKuery
        .mockResolvedValueOnce({ total: agents.length } as any) // active agents
        .mockResolvedValueOnce({ total: 1 } as any); // agents on or updating to target version
      mockedFetchAllAgentsByKuery
        .mockResolvedValueOnce(getMockFetchAllAgentsByKuery([])) // agents marked for retry
        .mockResolvedValue(getMockFetchAllAgentsByKuery(agents));

      await runTask();

      expect(mockedSendAutomaticUpgradeAgentsActions).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        {
          agents: agents.slice(0, 2),
          version: '8.18.0',
        }
      );
    });

    it('Should not attempt to upgrade already upgrading agents', async () => {
      const agents = generateAgents(10, 'agent-policy-1', '8.15.0', 'updating');
      mockedGetAgentsByKuery
        .mockResolvedValueOnce({ total: agents.length } as any) // active agents
        .mockResolvedValueOnce({ total: agents.length } as any); // agents on or updating to target version
      mockedFetchAllAgentsByKuery
        .mockResolvedValueOnce(getMockFetchAllAgentsByKuery([])) // agents marked for retry
        .mockResolvedValue(getMockFetchAllAgentsByKuery(agents)); // active agents

      await runTask();

      expect(mockedSendAutomaticUpgradeAgentsActions).not.toHaveBeenCalled();
    });

    it('Should set a rollout duration for upgrade batches bigger than 10 agents', async () => {
      const agents = generateAgents(100);
      mockedGetAgentsByKuery
        .mockResolvedValueOnce({ total: agents.length } as any) // active agents
        .mockResolvedValueOnce({ total: 0 } as any); // agents on or updating to target version
      mockedFetchAllAgentsByKuery
        .mockResolvedValueOnce(getMockFetchAllAgentsByKuery([])) // agents marked for retry
        .mockResolvedValue(getMockFetchAllAgentsByKuery(agents)); // active agents

      await runTask();

      expect(mockedSendAutomaticUpgradeAgentsActions).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        {
          agents: agents.slice(0, 30),
          version: '8.18.0',
          upgradeDurationSeconds: 600,
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
        .mockResolvedValueOnce({ total: 0 } as any) // active agents for first policy batch
        .mockResolvedValueOnce({ total: 10 } as any) // active agents for second policy batch
        .mockResolvedValueOnce({ total: 0 } as any); // agents on or updating to target version (second policy batch)
      const agents = generateAgents(10, 'agent-policy-501', '8.15.0');
      mockedFetchAllAgentsByKuery
        .mockResolvedValueOnce(getMockFetchAllAgentsByKuery([])) // agents marked for retry
        .mockResolvedValue(getMockFetchAllAgentsByKuery(agents)); // active agents

      await runTask();

      expect(mockedSendAutomaticUpgradeAgentsActions).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        {
          agents: agents.slice(0, 3),
          version: '8.18.0',
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
      const agents = generateAgents(20);
      const firstAgentsBatch = agents.slice(0, 10);
      const secondAgentsBatch = agents.slice(10);
      mockedGetAgentsByKuery
        .mockResolvedValueOnce({ total: agents.length } as any) // active agents
        .mockResolvedValueOnce({ total: 0 } as any); // agents on or updating to target version
      mockedFetchAllAgentsByKuery
        .mockResolvedValueOnce(getMockFetchAllAgentsByKuery([])) // agents marked for retry
        .mockResolvedValueOnce(
          jest.fn(async function* () {
            yield firstAgentsBatch;
            yield secondAgentsBatch;
          })()
        );

      await runTask();

      expect(mockedSendAutomaticUpgradeAgentsActions).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        {
          agents: firstAgentsBatch,
          version: '8.18.0',
          upgradeDurationSeconds: 600,
        }
      );
      expect(mockedSendAutomaticUpgradeAgentsActions).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        {
          agents: secondAgentsBatch.slice(0, 4),
          version: '8.18.0',
        }
      );
    });

    it('Should pick up agents in failed upgrade state for retry if they are ready', async () => {
      jest
        .spyOn(appContextService, 'getConfig')
        .mockReturnValue({ autoUpgrades: { retryDelays: ['10m', '20m'] } } as any);

      const agentPolicies = [
        {
          id: 'agent-policy-1',
          required_versions: [{ version: '8.18.0', percentage: 100 }],
        },
      ] as AgentPolicy[];
      mockAgentPolicyService.fetchAllAgentPolicies =
        getMockAgentPolicyFetchAllAgentPolicies(agentPolicies);

      const getDate = (minutesAgo: number) => {
        return new Date(Date.now() - minutesAgo * 60000).toISOString();
      };

      const agents = [
        {
          id: 'agent-1',
          policy_id: 'agent-policy-1',
          status: 'online',
          agent: { version: '8.15.0' },
          upgrade_details: {
            target_version: '8.18.0',
            state: 'UPG_FAILED',
          },
          upgrade_attempts: [getDate(20)], // should be picked up
        },
        {
          id: 'agent-2',
          policy_id: 'agent-policy-1',
          status: 'online',
          agent: { version: '8.15.0' },
          upgrade_details: {
            target_version: '8.18.0',
            state: 'UPG_FAILED',
          },
          upgrade_attempts: [getDate(5)], // should NOT be picked up (not ready yet)
        },
        {
          id: 'agent-3',
          policy_id: 'agent-policy-1',
          status: 'online',
          agent: { version: '8.15.0' },
          upgrade_details: {
            target_version: '8.18.0',
            state: 'UPG_FAILED',
          },
          upgrade_attempts: [getDate(20), getDate(10), getDate(5)], // should NOT be picked up (exceeded max attempts)
        },
      ] as unknown as Agent[];

      mockedGetAgentsByKuery
        .mockResolvedValueOnce({ total: agents.length } as any) // active agents
        .mockResolvedValueOnce({ total: 0 } as any); // agents on or updating to target version
      mockedFetchAllAgentsByKuery
        .mockResolvedValueOnce(getMockFetchAllAgentsByKuery(agents)) // agents marked for retry
        .mockResolvedValue(getMockFetchAllAgentsByKuery([]));

      await runTask();

      expect(mockedSendAutomaticUpgradeAgentsActions).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        {
          agents: agents.slice(0, 1),
          version: '8.18.0',
        }
      );
    });
  });
});

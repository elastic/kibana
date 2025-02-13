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
import { getAgentsByKuery, sendUpgradeAgentsActions } from '../services/agents';
import { isAgentUpgradeable } from '../../common/services';

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
const mockedGetAgentsByKuery = getAgentsByKuery as jest.MockedFunction<typeof getAgentsByKuery>;
const mockedSendUpgradeAgentsActions = sendUpgradeAgentsActions as jest.MockedFunction<
  typeof sendUpgradeAgentsActions
>;
mockedSendUpgradeAgentsActions.mockResolvedValue({ actionId: 'action-1' });
const mockedIsAgentUpgradeable = isAgentUpgradeable as jest.MockedFunction<
  typeof isAgentUpgradeable
>;

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
  ];
};

describe('AutomaticAgentUpgradeTask', () => {
  const { createSetup: coreSetupMock } = coreMock;
  const { createSetup: tmSetupMock, createStart: tmStartMock } = taskManagerMock;

  let mockContract: ReturnType<typeof createAppContextStartContractMock>;
  let mockTask: AutomaticAgentUpgradeTask;
  let mockCore: CoreSetup;
  let mockTaskManagerSetup: jest.Mocked<TaskManagerSetupContract>;
  // const mockedAppContextService = appContextService as jest.Mocked<typeof appContextService>;
  // mockedAppContextService.getExperimentalFeatures.mockReturnValue({} as any);

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
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('Should upgrade eligible agents', async () => {
      const agentPolicies = [
        {
          id: 'agent-policy-1',
          required_versions: [
            {
              version: '8.18.0',
              percentage: 30,
            },
          ],
        },
      ];
      mockAgentPolicyService.list.mockResolvedValue({
        items: agentPolicies,
      } as any);

      const agents = generateAgents(10, 'agent-policy-1', '8.15.0');
      mockedGetAgentsByKuery.mockResolvedValue({
        agents,
        total: agents.length,
      } as any);

      await runTask();

      expect(mockedGetAgentsByKuery).toHaveBeenCalled();
      expect(mockedSendUpgradeAgentsActions).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        {
          agents: agents.slice(0, 3),
          version: '8.18.0',
        }
      );
    });

    it('Should take agents already on target version into account', async () => {
      const agentPolicies = [
        {
          id: 'agent-policy-1',
          required_versions: [
            {
              version: '8.18.0',
              percentage: 30,
            },
          ],
        },
      ];
      mockAgentPolicyService.list.mockResolvedValue({
        items: agentPolicies,
      } as any);

      const agents = [
        ...generateAgents(10, 'agent-policy-1', '8.15.0'),
        {
          id: 'agent-11',
          policy_id: 'agent-policy-1',
          status: 'active',
          agent: { version: '8.18.0' },
        },
      ];
      mockedGetAgentsByKuery.mockResolvedValue({
        agents,
        total: agents.length,
      } as any);

      await runTask();

      expect(mockedGetAgentsByKuery).toHaveBeenCalled();
      expect(mockedSendUpgradeAgentsActions).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        {
          agents: agents.slice(0, 2),
          version: '8.18.0',
        }
      );
    });

    it('Should take agents already upgrading to target version into account', async () => {
      const agentPolicies = [
        {
          id: 'agent-policy-1',
          required_versions: [
            {
              version: '8.18.0',
              percentage: 30,
            },
          ],
        },
      ];
      mockAgentPolicyService.list.mockResolvedValue({
        items: agentPolicies,
      } as any);

      const agents = [
        ...generateAgents(10, 'agent-policy-1', '8.15.0'),
        {
          id: 'agent-11',
          policy_id: 'agent-policy-1',
          status: 'updating',
          agent: { version: '8.15.0' },
          upgrade_details: { target_version: '8.18.0' },
        },
      ];
      mockedGetAgentsByKuery.mockResolvedValue({
        agents,
        total: agents.length,
      } as any);

      await runTask();

      expect(mockedGetAgentsByKuery).toHaveBeenCalled();
      expect(mockedSendUpgradeAgentsActions).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        {
          agents: agents.slice(0, 2),
          version: '8.18.0',
        }
      );
    });

    it('Should not attempt to upgrade already upgrading agents', async () => {
      const agentPolicies = [
        {
          id: 'agent-policy-1',
          required_versions: [
            {
              version: '8.18.0',
              percentage: 30,
            },
          ],
        },
      ];
      mockAgentPolicyService.list.mockResolvedValue({
        items: agentPolicies,
      } as any);

      const agents = generateAgents(10, 'agent-policy-1', '8.15.0', 'updating');

      mockedGetAgentsByKuery.mockResolvedValue({
        agents,
        total: agents.length,
      } as any);

      await runTask();

      expect(mockedGetAgentsByKuery).toHaveBeenCalled();
      expect(mockedSendUpgradeAgentsActions).not.toHaveBeenCalled();
    });

    it('Should not process agent policies without required versions', async () => {
      const agentPolicies = [
        {
          id: 'agent-policy-1',
        },
        {
          id: 'agent-policy-2',
        },
      ];
      mockAgentPolicyService.list.mockResolvedValue({
        items: agentPolicies,
      } as any);
      mockedGetAgentsByKuery.mockResolvedValue({
        agents: [],
      } as any);

      await runTask();

      expect(mockedGetAgentsByKuery).not.toHaveBeenCalled();
    });

    it('Should not run if task is outdated', async () => {
      const result = await runTask({ ...MOCK_TASK_INSTANCE, id: 'old-id' });

      expect(mockAgentPolicyService.list).not.toHaveBeenCalled();
      expect(result).toEqual(getDeleteTaskRunResult());
    });

    it('Should exit if the enableAutomaticAgentUpgrades feature flag is disabled', async () => {
      jest
        .spyOn(appContextService, 'getExperimentalFeatures')
        .mockReturnValue({ enableAutomaticAgentUpgrades: false } as any);

      await runTask();

      mockAgentPolicyService.list.mockResolvedValue({
        items: [],
      } as any);

      expect(mockAgentPolicyService.list).not.toHaveBeenCalled();
    });
  });
});

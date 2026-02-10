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
import { agentPolicyService, appContextService, packagePolicyService } from '../services';
import { fetchAllAgentsByKuery, getAgentsByKuery } from '../services/agents';
import { getPackageInfo } from '../services/epm/packages';
import { getAgentTemplateAssetsMap } from '../services/epm/packages/get';
import { hasAgentVersionConditionInInputTemplate } from '../services/utils/version_specific_policies';
import type { Agent, AgentPolicy, PackagePolicy } from '../types';

import {
  VersionSpecificPolicyAssignmentTask,
  TYPE,
  VERSION,
} from './version_specific_policy_assignment_task';

jest.mock('../services');
jest.mock('../services/agents');
jest.mock('../services/epm/packages');
jest.mock('../services/epm/packages/get');
jest.mock('../services/utils/version_specific_policies');

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
const mockPackagePolicyService = packagePolicyService as jest.Mocked<typeof packagePolicyService>;
const mockedFetchAllAgentsByKuery = fetchAllAgentsByKuery as jest.MockedFunction<
  typeof fetchAllAgentsByKuery
>;
const mockedGetAgentsByKuery = getAgentsByKuery as jest.MockedFunction<typeof getAgentsByKuery>;
const mockedGetPackageInfo = getPackageInfo as jest.MockedFunction<typeof getPackageInfo>;
const mockedGetAgentTemplateAssetsMap = getAgentTemplateAssetsMap as jest.MockedFunction<
  typeof getAgentTemplateAssetsMap
>;
const mockedHasAgentVersionConditionInInputTemplate =
  hasAgentVersionConditionInInputTemplate as jest.MockedFunction<
    typeof hasAgentVersionConditionInInputTemplate
  >;

const getMockAgentPolicyFetchAllAgentPolicies = (items: AgentPolicy[]) =>
  jest.fn().mockResolvedValue(
    (async function* () {
      yield items;
    })()
  );

const getMockFetchAllAgentsByKuery = (items: Agent[]) =>
  (async function* () {
    yield items;
  })();

const generateAgents = (
  nAgents: number,
  agentPolicyId: string = 'agent-policy-1',
  version: string = '8.18.0'
) => {
  return [
    ...Array(nAgents)
      .fill({})
      .map((_, i) => ({
        id: `agent-${i}`,
        policy_id: agentPolicyId,
        policy_revision: 1,
        agent: { version },
      })),
  ] as Agent[];
};

describe('VersionSpecificPolicyAssignmentTask', () => {
  const { createSetup: coreSetupMock } = coreMock;
  const { createSetup: tmSetupMock, createStart: tmStartMock } = taskManagerMock;

  let mockContract: ReturnType<typeof createAppContextStartContractMock>;
  let mockTask: VersionSpecificPolicyAssignmentTask;
  let mockCore: CoreSetup;
  let mockTaskManagerSetup: jest.Mocked<TaskManagerSetupContract>;

  beforeEach(() => {
    mockContract = createAppContextStartContractMock();
    mockContract.experimentalFeatures = {
      ...mockContract.experimentalFeatures,
      enableVersionSpecificPolicies: true,
    };
    appContextService.start(mockContract);
    mockCore = coreSetupMock();
    mockTaskManagerSetup = tmSetupMock();
    mockTask = new VersionSpecificPolicyAssignmentTask({
      core: mockCore,
      taskManager: mockTaskManagerSetup,
      logFactory: loggingSystemMock.create(),
      config: {
        taskInterval: '1m',
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const runTask = async (taskInstance = MOCK_TASK_INSTANCE) => {
    const mockTaskManagerStart = tmStartMock();
    await mockTask.start({ taskManager: mockTaskManagerStart });
    return mockTask.runTask(taskInstance, mockCore, new AbortController());
  };

  describe('Task lifecycle', () => {
    it('Should create task', () => {
      expect(mockTask).toBeInstanceOf(VersionSpecificPolicyAssignmentTask);
    });

    it('Should register task', () => {
      expect(mockTaskManagerSetup.registerTaskDefinitions).toHaveBeenCalled();
    });

    it('Should schedule task', async () => {
      const mockTaskManagerStart = tmStartMock();
      await mockTask.start({ taskManager: mockTaskManagerStart });
      expect(mockTaskManagerStart.ensureScheduled).toHaveBeenCalled();
    });

    it('Should not start without taskManager', async () => {
      await mockTask.start({ taskManager: undefined as any });
      // Task should handle gracefully without throwing
    });
  });

  describe('Task execution', () => {
    beforeEach(() => {
      jest
        .spyOn(appContextService, 'getExperimentalFeatures')
        .mockReturnValue({ enableVersionSpecificPolicies: true } as any);
      jest
        .spyOn(appContextService, 'getInternalUserSOClientWithoutSpaceExtension')
        .mockReturnValue({} as any);

      // Default mocks for package policy compilation
      mockPackagePolicyService.findAllForAgentPolicy = jest.fn().mockResolvedValue([]);
      mockPackagePolicyService.compilePackagePolicyForVersions = jest
        .fn()
        .mockResolvedValue(undefined);
      mockedGetPackageInfo.mockResolvedValue({
        name: 'test-package',
        version: '1.0.0',
      } as any);
      mockedGetAgentTemplateAssetsMap.mockResolvedValue(new Map() as any);
      mockedHasAgentVersionConditionInInputTemplate.mockReturnValue(false);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('Should not run if feature is disabled', async () => {
      jest
        .spyOn(appContextService, 'getExperimentalFeatures')
        .mockReturnValue({ enableVersionSpecificPolicies: false } as any);

      await runTask();

      expect(mockAgentPolicyService.fetchAllAgentPolicies).not.toHaveBeenCalled();
    });

    it('Should return delete result for outdated task version', async () => {
      const outdatedTaskInstance = {
        ...MOCK_TASK_INSTANCE,
        id: `${TYPE}:outdated-version`,
      };

      const result = await runTask(outdatedTaskInstance);

      expect(result).toEqual(getDeleteTaskRunResult());
    });

    it('Should not run if task was not started', async () => {
      // Create a new task without starting it
      const unstartedTask = new VersionSpecificPolicyAssignmentTask({
        core: mockCore,
        taskManager: mockTaskManagerSetup,
        logFactory: loggingSystemMock.create(),
        config: { taskInterval: '1m' },
      });

      await unstartedTask.runTask(MOCK_TASK_INSTANCE, mockCore, new AbortController());

      expect(mockAgentPolicyService.fetchAllAgentPolicies).not.toHaveBeenCalled();
    });

    it('Should do nothing if no agent policies have version conditions', async () => {
      mockAgentPolicyService.fetchAllAgentPolicies = getMockAgentPolicyFetchAllAgentPolicies([]);

      await runTask();

      expect(mockedGetAgentsByKuery).not.toHaveBeenCalled();
    });

    it('Should process agent policies with version conditions', async () => {
      const agentPolicies = [
        {
          id: 'policy-1',
          revision: 5,
          has_agent_version_conditions: true,
        },
      ] as AgentPolicy[];

      mockAgentPolicyService.fetchAllAgentPolicies =
        getMockAgentPolicyFetchAllAgentPolicies(agentPolicies);
      mockedGetAgentsByKuery.mockResolvedValue({
        total: 0,
        agents: [],
        page: 1,
        perPage: 0,
      });

      await runTask();

      expect(mockedGetAgentsByKuery).toHaveBeenCalled();
    });

    it('Should find agents needing version-specific policies', async () => {
      const agentPolicies = [
        {
          id: 'policy-1',
          revision: 5,
          has_agent_version_conditions: true,
        },
      ] as AgentPolicy[];

      const agents = generateAgents(3, 'policy-1', '8.18.0');

      mockAgentPolicyService.fetchAllAgentPolicies =
        getMockAgentPolicyFetchAllAgentPolicies(agentPolicies);
      mockAgentPolicyService.deployPolicies = jest.fn().mockResolvedValue(undefined);

      mockedGetAgentsByKuery.mockResolvedValue({
        total: 3,
        agents,
        page: 1,
        perPage: 3,
      });
      mockedFetchAllAgentsByKuery.mockResolvedValue(getMockFetchAllAgentsByKuery(agents));

      await runTask();

      expect(mockedFetchAllAgentsByKuery).toHaveBeenCalled();
      expect(mockAgentPolicyService.deployPolicies).toHaveBeenCalledWith(
        expect.anything(),
        ['policy-1'],
        undefined,
        { agentVersions: ['8.18'] }
      );
    });

    it('Should group agents by minor version', async () => {
      const agentPolicies = [
        {
          id: 'policy-1',
          revision: 5,
          has_agent_version_conditions: true,
        },
      ] as AgentPolicy[];

      // Agents with different patch versions should be grouped into same minor version
      const agents = [
        { id: 'agent-1', policy_id: 'policy-1', policy_revision: 1, agent: { version: '8.18.0' } },
        { id: 'agent-2', policy_id: 'policy-1', policy_revision: 1, agent: { version: '8.18.1' } },
        { id: 'agent-3', policy_id: 'policy-1', policy_revision: 1, agent: { version: '9.3.0' } },
      ] as Agent[];

      mockAgentPolicyService.fetchAllAgentPolicies =
        getMockAgentPolicyFetchAllAgentPolicies(agentPolicies);
      mockAgentPolicyService.deployPolicies = jest.fn().mockResolvedValue(undefined);

      mockedGetAgentsByKuery.mockResolvedValue({
        total: 3,
        agents,
        page: 1,
        perPage: 3,
      });
      mockedFetchAllAgentsByKuery.mockResolvedValue(getMockFetchAllAgentsByKuery(agents));

      await runTask();

      // Should create policies for both 8.18 and 9.3
      expect(mockAgentPolicyService.deployPolicies).toHaveBeenCalledWith(
        expect.anything(),
        ['policy-1'],
        undefined,
        { agentVersions: expect.arrayContaining(['8.18', '9.3']) }
      );
    });

    it('Should skip agents already on correct versioned policy regardless of revision', async () => {
      const agentPolicies = [
        {
          id: 'policy-1',
          revision: 5,
          has_agent_version_conditions: true,
        },
      ] as AgentPolicy[];

      // Agent already on correct versioned policy (revision doesn't matter)
      const agents = [
        {
          id: 'agent-1',
          policy_id: 'policy-1#8.18',
          policy_revision: 5,
          agent: { version: '8.18.0' },
        },
      ] as Agent[];

      mockAgentPolicyService.fetchAllAgentPolicies =
        getMockAgentPolicyFetchAllAgentPolicies(agentPolicies);
      mockAgentPolicyService.deployPolicies = jest.fn().mockResolvedValue(undefined);

      mockedGetAgentsByKuery.mockResolvedValue({
        total: 1,
        agents,
        page: 1,
        perPage: 1,
      });
      mockedFetchAllAgentsByKuery.mockResolvedValue(getMockFetchAllAgentsByKuery(agents));

      await runTask();

      // Should not deploy policies since agent is already correctly assigned
      expect(mockAgentPolicyService.deployPolicies).not.toHaveBeenCalled();
    });

    it('Should NOT reassign agents on versioned policy with outdated revision - fleet-server handles updates', async () => {
      const agentPolicies = [
        {
          id: 'policy-1',
          revision: 5,
          has_agent_version_conditions: true,
        },
      ] as AgentPolicy[];

      // Agent on correct versioned policy but with old revision - should be skipped
      // Fleet-server will push the updated policy revision automatically after deployPolicies
      const agents = [
        {
          id: 'agent-1',
          policy_id: 'policy-1#8.18',
          policy_revision: 3, // outdated, but on correct policy
          agent: { version: '8.18.0' },
        },
      ] as Agent[];

      mockAgentPolicyService.fetchAllAgentPolicies =
        getMockAgentPolicyFetchAllAgentPolicies(agentPolicies);
      mockAgentPolicyService.deployPolicies = jest.fn().mockResolvedValue(undefined);

      mockedGetAgentsByKuery.mockResolvedValue({
        total: 1,
        agents,
        page: 1,
        perPage: 1,
      });
      mockedFetchAllAgentsByKuery.mockResolvedValue(getMockFetchAllAgentsByKuery(agents));

      await runTask();

      // Should NOT deploy policies - agent is on correct versioned policy, just has old revision
      // Fleet-server will handle pushing the new revision after the normal policy update flow
      expect(mockAgentPolicyService.deployPolicies).not.toHaveBeenCalled();
    });

    it('Should handle agents without version gracefully', async () => {
      const agentPolicies = [
        {
          id: 'policy-1',
          revision: 5,
          has_agent_version_conditions: true,
        },
      ] as AgentPolicy[];

      // Agent without version
      const agents = [
        {
          id: 'agent-1',
          policy_id: 'policy-1',
          policy_revision: 1,
          agent: undefined,
        },
      ] as unknown as Agent[];

      mockAgentPolicyService.fetchAllAgentPolicies =
        getMockAgentPolicyFetchAllAgentPolicies(agentPolicies);

      mockedGetAgentsByKuery.mockResolvedValue({
        total: 1,
        agents,
        page: 1,
        perPage: 1,
      });
      mockedFetchAllAgentsByKuery.mockResolvedValue(getMockFetchAllAgentsByKuery(agents));

      // Should not throw
      await expect(runTask()).resolves.not.toThrow();
    });

    it('Should compile version-specific inputs for package policies with agent version conditions', async () => {
      const agentPolicies = [
        {
          id: 'policy-1',
          revision: 5,
          has_agent_version_conditions: true,
        },
      ] as AgentPolicy[];

      const agents = generateAgents(2, 'policy-1', '8.18.0');

      const mockPackagePolicy = {
        id: 'package-policy-1',
        name: 'test-package-policy',
        package: {
          name: 'test-package',
          version: '1.0.0',
        },
      } as PackagePolicy;

      mockAgentPolicyService.fetchAllAgentPolicies =
        getMockAgentPolicyFetchAllAgentPolicies(agentPolicies);
      mockAgentPolicyService.deployPolicies = jest.fn().mockResolvedValue(undefined);

      mockPackagePolicyService.findAllForAgentPolicy = jest
        .fn()
        .mockResolvedValue([mockPackagePolicy]);
      mockedHasAgentVersionConditionInInputTemplate.mockReturnValue(true);

      mockedGetAgentsByKuery.mockResolvedValue({
        total: 2,
        agents,
        page: 1,
        perPage: 2,
      });
      mockedFetchAllAgentsByKuery.mockResolvedValue(getMockFetchAllAgentsByKuery(agents));

      await runTask();

      // Should compile version-specific inputs before deploying
      expect(mockPackagePolicyService.compilePackagePolicyForVersions).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ name: 'test-package', version: '1.0.0' }),
        expect.anything(),
        mockPackagePolicy,
        ['8.18']
      );
      expect(mockAgentPolicyService.deployPolicies).toHaveBeenCalled();
    });

    it('Should not compile version-specific inputs for package policies without agent version conditions', async () => {
      const agentPolicies = [
        {
          id: 'policy-1',
          revision: 5,
          has_agent_version_conditions: true,
        },
      ] as AgentPolicy[];

      const agents = generateAgents(2, 'policy-1', '8.18.0');

      const mockPackagePolicy = {
        id: 'package-policy-1',
        name: 'test-package-policy',
        package: {
          name: 'test-package',
          version: '1.0.0',
        },
      } as PackagePolicy;

      mockAgentPolicyService.fetchAllAgentPolicies =
        getMockAgentPolicyFetchAllAgentPolicies(agentPolicies);
      mockAgentPolicyService.deployPolicies = jest.fn().mockResolvedValue(undefined);

      mockPackagePolicyService.findAllForAgentPolicy = jest
        .fn()
        .mockResolvedValue([mockPackagePolicy]);
      mockedHasAgentVersionConditionInInputTemplate.mockReturnValue(false);

      mockedGetAgentsByKuery.mockResolvedValue({
        total: 2,
        agents,
        page: 1,
        perPage: 2,
      });
      mockedFetchAllAgentsByKuery.mockResolvedValue(getMockFetchAllAgentsByKuery(agents));

      await runTask();

      // Should NOT compile version-specific inputs
      expect(mockPackagePolicyService.compilePackagePolicyForVersions).not.toHaveBeenCalled();
      // But should still deploy
      expect(mockAgentPolicyService.deployPolicies).toHaveBeenCalled();
    });
  });

  describe('Version extraction', () => {
    beforeEach(() => {
      jest
        .spyOn(appContextService, 'getExperimentalFeatures')
        .mockReturnValue({ enableVersionSpecificPolicies: true } as any);
      jest
        .spyOn(appContextService, 'getInternalUserSOClientWithoutSpaceExtension')
        .mockReturnValue({} as any);

      // Default mocks for package policy compilation
      mockPackagePolicyService.findAllForAgentPolicy = jest.fn().mockResolvedValue([]);
      mockPackagePolicyService.compilePackagePolicyForVersions = jest
        .fn()
        .mockResolvedValue(undefined);
      mockedGetPackageInfo.mockResolvedValue({
        name: 'test-package',
        version: '1.0.0',
      } as any);
      mockedGetAgentTemplateAssetsMap.mockResolvedValue(new Map() as any);
      mockedHasAgentVersionConditionInInputTemplate.mockReturnValue(false);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('Should extract minor version correctly', async () => {
      const agentPolicies = [
        {
          id: 'policy-1',
          revision: 5,
          has_agent_version_conditions: true,
        },
      ] as AgentPolicy[];

      const agents = [
        { id: 'agent-1', policy_id: 'policy-1', policy_revision: 1, agent: { version: '8.18.2' } },
      ] as Agent[];

      mockAgentPolicyService.fetchAllAgentPolicies =
        getMockAgentPolicyFetchAllAgentPolicies(agentPolicies);
      mockAgentPolicyService.deployPolicies = jest.fn().mockResolvedValue(undefined);

      mockedGetAgentsByKuery.mockResolvedValue({
        total: 1,
        agents,
        page: 1,
        perPage: 1,
      });
      mockedFetchAllAgentsByKuery.mockResolvedValue(getMockFetchAllAgentsByKuery(agents));

      await runTask();

      // 8.18.2 should be extracted as 8.18
      expect(mockAgentPolicyService.deployPolicies).toHaveBeenCalledWith(
        expect.anything(),
        ['policy-1'],
        undefined,
        { agentVersions: ['8.18'] }
      );
    });
  });
});

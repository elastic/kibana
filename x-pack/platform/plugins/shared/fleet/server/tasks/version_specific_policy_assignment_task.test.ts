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
import { reassignAgents } from '../services/agents/reassign';
import { getPackageInfo } from '../services/epm/packages';
import { getAgentTemplateAssetsMap } from '../services/epm/packages/get';
import {
  deleteVersionSpecificFleetServerPolicies,
  deleteVersionSpecificFleetServerPoliciesForVersions,
  getAgentCountsForVariantPolicyIds,
  getVariantAgentsKuery,
  getVariantPolicyIdsFromAgentsWithoutBaseId,
  getAgentVersionsForVersionSpecificPolicies,
  hasAgentVersionConditionInInputTemplate,
} from '../services/utils/version_specific_policies';
import { isSentinelPolicyVersionEnabled } from '../services/utils/sentinel_policy_version';
import type { Agent, AgentPolicy, PackagePolicy } from '../types';

import { AGENT_POLICY_INDEX } from '../../common/constants';

import {
  VersionSpecificPolicyAssignmentTask,
  TYPE,
  VERSION,
} from './version_specific_policy_assignment_task';

jest.mock('../services');
jest.mock('../services/agents');
jest.mock('../services/agents/reassign');
jest.mock('../services/epm/packages');
jest.mock('../services/epm/packages/get');
jest.mock('../services/utils/version_specific_policies');
jest.mock('../services/utils/sentinel_policy_version');

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
const mockedReassignAgents = reassignAgents as jest.MockedFunction<typeof reassignAgents>;
const mockedDeleteVersionSpecificFleetServerPolicies =
  deleteVersionSpecificFleetServerPolicies as jest.MockedFunction<
    typeof deleteVersionSpecificFleetServerPolicies
  >;
const mockedDeleteVersionSpecificFleetServerPoliciesForVersions =
  deleteVersionSpecificFleetServerPoliciesForVersions as jest.MockedFunction<
    typeof deleteVersionSpecificFleetServerPoliciesForVersions
  >;
const mockedGetAgentCountsForVariantPolicyIds =
  getAgentCountsForVariantPolicyIds as jest.MockedFunction<
    typeof getAgentCountsForVariantPolicyIds
  >;
const mockedGetVariantPolicyIdsFromAgentsWithoutBaseId =
  getVariantPolicyIdsFromAgentsWithoutBaseId as jest.MockedFunction<
    typeof getVariantPolicyIdsFromAgentsWithoutBaseId
  >;
const mockedGetVariantAgentsKuery = getVariantAgentsKuery as jest.MockedFunction<
  typeof getVariantAgentsKuery
>;
const mockedIsSentinelPolicyVersionEnabled = isSentinelPolicyVersionEnabled as jest.MockedFunction<
  typeof isSentinelPolicyVersionEnabled
>;
const mockedGetAgentVersionsForVersionSpecificPolicies =
  getAgentVersionsForVersionSpecificPolicies as jest.MockedFunction<
    typeof getAgentVersionsForVersionSpecificPolicies
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
    return mockTask.runTask(taskInstance, mockCore, new AbortController().signal);
  };

  // Configure the .fleet-policies terms aggregation the orphan sweep reads in its first pass.
  // lastWrittenMs defaults to epoch (0) so mocked variants are always outside the 1-hour GRACE
  // window and eligible for deletion. Pass lastWrittenMs: Date.now() to simulate a fresh write.
  const mockVariantPoliciesInIndex = async (
    variantPolicyIds: string[],
    { lastWrittenMs = 0 }: { lastWrittenMs?: number } = {}
  ) => {
    const [coreStart] = await mockCore.getStartServices();
    const esClient = coreStart.elasticsearch.client.asInternalUser as any;
    esClient.search.mockResolvedValue({
      aggregations: {
        variant_policies: {
          buckets: variantPolicyIds.map((key) => ({
            key,
            last_written: { value: lastWrittenMs },
          })),
          sum_other_doc_count: 0,
        },
      },
    });
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

      await unstartedTask.runTask(MOCK_TASK_INSTANCE, mockCore, new AbortController().signal);

      expect(mockAgentPolicyService.fetchAllAgentPolicies).not.toHaveBeenCalled();
    });

    it('Should do nothing if no agent policies have version conditions', async () => {
      mockAgentPolicyService.fetchAllAgentPolicies = getMockAgentPolicyFetchAllAgentPolicies([]);
      // Orphan sweep runs afterwards; no version-specific policies exist in .fleet-policies.
      await mockVariantPoliciesInIndex([]);

      await runTask();

      expect(mockAgentPolicyService.deployPolicies).not.toHaveBeenCalled();
      expect(mockedReassignAgents).not.toHaveBeenCalled();
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
        expect.objectContaining({ agentVersions: ['8.18'], spaceId: '*' })
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
        expect.objectContaining({
          agentVersions: expect.arrayContaining(['8.18', '9.3']),
          spaceId: '*',
        })
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
      expect(mockAgentPolicyService.deployPolicies).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        undefined,
        expect.objectContaining({ spaceId: '*' })
      );
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
      // But should still deploy with spaceId: '*'
      expect(mockAgentPolicyService.deployPolicies).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        undefined,
        expect.objectContaining({ spaceId: '*' })
      );
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
        expect.objectContaining({ agentVersions: ['8.18'], spaceId: '*' })
      );
    });
  });

  describe('Orphaned version-specific policy sweep', () => {
    beforeEach(() => {
      jest
        .spyOn(appContextService, 'getExperimentalFeatures')
        .mockReturnValue({ enableVersionSpecificPolicies: true } as any);
      jest
        .spyOn(appContextService, 'getInternalUserSOClientWithoutSpaceExtension')
        .mockReturnValue({} as any);
      // No agent policies with version conditions, so the main processing is a no-op and only the
      // orphan sweep runs.
      mockAgentPolicyService.fetchAllAgentPolicies = getMockAgentPolicyFetchAllAgentPolicies([]);
      // Default bounded set for tests that exercise the active-parent stale-variant path. Individual
      // tests override this when they need the variant to be in- or out-of-set.
      mockedGetAgentVersionsForVersionSpecificPolicies.mockResolvedValue(['9.5', '9.4', '8.19']);
      // Default: no agents on any variant — safe for tests that don't care about agent counts.
      mockedGetAgentCountsForVariantPolicyIds.mockResolvedValue(new Map());
      mockedGetVariantPolicyIdsFromAgentsWithoutBaseId.mockResolvedValue(new Map());
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('reassigns orphaned agents and deletes stale variant docs when the parent no longer has version conditions', async () => {
      await mockVariantPoliciesInIndex(['policy-1#9.4', 'policy-1#9.3']);
      mockAgentPolicyService.getByIds = jest
        .fn()
        .mockResolvedValue([{ id: 'policy-1', has_agent_version_conditions: false }]);
      const variantAgents = [
        { id: 'agent-1', policy_id: 'policy-1#9.4' },
        { id: 'agent-2', policy_id: 'policy-1#9.3' },
      ] as Agent[];
      mockedFetchAllAgentsByKuery.mockResolvedValue(getMockFetchAllAgentsByKuery(variantAgents));
      // Post-reassignment count check: all agents moved successfully.
      mockedGetAgentsByKuery.mockResolvedValueOnce({ total: 0, agents: [], page: 1, perPage: 0 });

      await runTask();

      expect(mockAgentPolicyService.getByIds).toHaveBeenCalledWith(
        expect.anything(),
        [{ id: 'policy-1', spaceId: '*' }],
        expect.objectContaining({ ignoreMissing: true })
      );
      // Inactive agents must be included, otherwise their variant doc is deleted below while they
      // still reference it (https://github.com/elastic/kibana/pull/280250 review).
      expect(mockedFetchAllAgentsByKuery).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ showInactive: true })
      );
      expect(mockedReassignAgents).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        {
          agentIds: ['agent-1', 'agent-2'],
          showInactive: true,
          spaceId: '*',
          _internalCrossSpace: true,
        },
        'policy-1'
      );
      expect(mockedDeleteVersionSpecificFleetServerPolicies).toHaveBeenCalledWith(
        expect.anything(),
        'policy-1',
        { keepPolicyIds: [] }
      );
    });

    it('locates orphaned agents (including those without policy_base_id) via the variant agents kuery', async () => {
      await mockVariantPoliciesInIndex(['policy-1#9.4']);
      mockAgentPolicyService.getByIds = jest
        .fn()
        .mockResolvedValue([{ id: 'policy-1', has_agent_version_conditions: false }]);
      const kuery =
        '(policy_base_id:"policy-1") or (policy_id:("policy-1#9.4") and not policy_base_id:*)';
      mockedGetVariantAgentsKuery.mockResolvedValue(kuery);
      mockedFetchAllAgentsByKuery.mockResolvedValue(
        getMockFetchAllAgentsByKuery([{ id: 'agent-1', policy_id: 'policy-1#9.4' }] as Agent[])
      );
      mockedGetAgentsByKuery.mockResolvedValueOnce({ total: 0, agents: [], page: 1, perPage: 0 });

      await runTask();

      expect(mockedGetVariantAgentsKuery).toHaveBeenCalledWith(expect.anything(), 'policy-1', []);
      expect(mockedFetchAllAgentsByKuery).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ kuery })
      );
      expect(mockedGetAgentsByKuery).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ kuery, includeStatusRuntimeField: false })
      );
    });

    it('reassigns agents without policy_base_id even when no variant doc remains in .fleet-policies', async () => {
      await mockVariantPoliciesInIndex([]);
      mockedGetVariantPolicyIdsFromAgentsWithoutBaseId.mockResolvedValue(
        new Map([['policy-1', ['policy-1#9.4']]])
      );
      mockAgentPolicyService.getByIds = jest
        .fn()
        .mockResolvedValue([{ id: 'policy-1', has_agent_version_conditions: false }]);
      mockedFetchAllAgentsByKuery.mockResolvedValue(
        getMockFetchAllAgentsByKuery([{ id: 'agent-1', policy_id: 'policy-1#9.4' }] as Agent[])
      );
      mockedGetAgentsByKuery.mockResolvedValueOnce({ total: 0, agents: [], page: 1, perPage: 0 });

      await runTask();

      expect(mockedGetVariantAgentsKuery).toHaveBeenCalledWith(expect.anything(), 'policy-1', [
        'policy-1#9.4',
      ]);
      expect(mockedReassignAgents).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ agentIds: ['agent-1'] }),
        'policy-1'
      );
    });

    it('skips variant doc deletion and retries on next run when bulk reassignment partially fails', async () => {
      // Simulate: reassignAgents returns { actionId } without throwing even though one agent's
      // _update failed (bulkUpdateAgents silently collects per-agent errors). The post-reassignment
      // count check sees 1 remaining agent and must skip deleteVersionSpecificFleetServerPolicies
      // so the next sweep run can retry rather than stranding the agent on a missing policy.
      await mockVariantPoliciesInIndex(['policy-1#9.4']);
      mockAgentPolicyService.getByIds = jest
        .fn()
        .mockResolvedValue([{ id: 'policy-1', has_agent_version_conditions: false }]);
      mockedFetchAllAgentsByKuery.mockResolvedValue(
        getMockFetchAllAgentsByKuery([{ id: 'agent-1', policy_id: 'policy-1#9.4' }] as Agent[])
      );
      // Post-reassignment count: 1 agent still on variant (bulk update failed silently).
      mockedGetAgentsByKuery.mockResolvedValueOnce({ total: 1, agents: [], page: 1, perPage: 0 });

      await runTask();

      expect(mockedReassignAgents).toHaveBeenCalled();
      // Must NOT delete variant docs — the stranded agent must be recoverable on the next run.
      expect(mockedDeleteVersionSpecificFleetServerPolicies).not.toHaveBeenCalled();
    });

    it('does not reassign when the parent policy still has version conditions and the variant is in the bounded set', async () => {
      await mockVariantPoliciesInIndex(['policy-1#9.4']);
      mockAgentPolicyService.getByIds = jest
        .fn()
        .mockResolvedValue([{ id: 'policy-1', has_agent_version_conditions: true }]);
      // 9.4 is in the bounded set → not a stale-variant candidate → no deletion.
      mockedGetAgentVersionsForVersionSpecificPolicies.mockResolvedValue(['9.4']);

      await runTask();

      // The whole-parent reassign path must NOT run (parent still has conditions).
      expect(mockedFetchAllAgentsByKuery).not.toHaveBeenCalled();
      expect(mockedReassignAgents).not.toHaveBeenCalled();
      expect(mockedDeleteVersionSpecificFleetServerPolicies).not.toHaveBeenCalled();
      // The per-version stale-variant path must also NOT delete (variant is in-set).
      expect(mockedDeleteVersionSpecificFleetServerPoliciesForVersions).not.toHaveBeenCalled();
    });

    it('does not reassign when the parent policy no longer exists', async () => {
      await mockVariantPoliciesInIndex(['policy-1#9.4']);
      // getByIds with ignoreMissing filters out deleted policies.
      mockAgentPolicyService.getByIds = jest.fn().mockResolvedValue([]);

      await runTask();

      expect(mockedReassignAgents).not.toHaveBeenCalled();
      expect(mockedDeleteVersionSpecificFleetServerPolicies).not.toHaveBeenCalled();
    });

    it('does nothing when no version-specific policies exist', async () => {
      await mockVariantPoliciesInIndex([]);
      mockAgentPolicyService.getByIds = jest.fn();

      await runTask();

      expect(mockAgentPolicyService.getByIds).not.toHaveBeenCalled();
      expect(mockedReassignAgents).not.toHaveBeenCalled();
    });

    it('ignores non-versioned policy ids when scanning .fleet-policies', async () => {
      // The whole-index aggregation returns base ids too; only variant ids should be acted on.
      await mockVariantPoliciesInIndex(['policy-1', 'policy-2']);
      mockAgentPolicyService.getByIds = jest.fn();

      await runTask();

      expect(mockAgentPolicyService.getByIds).not.toHaveBeenCalled();
      expect(mockedReassignAgents).not.toHaveBeenCalled();
    });

    it('queries .fleet-policies with the correct aggregation shape including last_written sub-agg', async () => {
      const [coreStart] = await mockCore.getStartServices();
      const esClient = coreStart.elasticsearch.client.asInternalUser as any;
      await mockVariantPoliciesInIndex([]);

      await runTask();

      expect(esClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          index: AGENT_POLICY_INDEX,
          size: 0,
          aggs: expect.objectContaining({
            variant_policies: expect.objectContaining({
              terms: expect.objectContaining({ field: 'policy_id' }),
              // last_written sub-agg is used to enforce the GRACE window atomically inside the
              // deleteByQuery — any racing deploy stamps a fresh @timestamp that the range filter
              // excludes without a TOCTOU window.
              aggs: expect.objectContaining({
                last_written: expect.objectContaining({ max: { field: '@timestamp' } }),
              }),
            }),
          }),
        })
      );
    });

    it('deletes variant docs even when the orphaned parent currently has no assigned agents', async () => {
      await mockVariantPoliciesInIndex(['policy-1#9.4']);
      mockAgentPolicyService.getByIds = jest
        .fn()
        .mockResolvedValue([{ id: 'policy-1', has_agent_version_conditions: false }]);
      // No agents remain on the variant policies (e.g. already reassigned by the inline path).
      mockedFetchAllAgentsByKuery.mockResolvedValue(getMockFetchAllAgentsByKuery([]));

      await runTask();

      expect(mockedReassignAgents).not.toHaveBeenCalled();
      expect(mockedDeleteVersionSpecificFleetServerPolicies).toHaveBeenCalledWith(
        expect.anything(),
        'policy-1',
        { keepPolicyIds: [] }
      );
    });

    // Half-A tests: stale per-version variant cleanup for parents that still have conditions.

    it('deletes an out-of-set variant with zero agents when the parent still has version conditions', async () => {
      // Variant #9.2 is outside the bounded set [9.5, 9.4, 8.19] and has zero agents.
      // It should be deleted via the per-version helper, NOT the whole-parent helper.
      await mockVariantPoliciesInIndex(['policy-1#9.2']);
      mockAgentPolicyService.getByIds = jest
        .fn()
        .mockResolvedValue([{ id: 'policy-1', has_agent_version_conditions: true }]);
      // Override bounded set to exclude 9.2 explicitly.
      mockedGetAgentVersionsForVersionSpecificPolicies.mockResolvedValue(['9.5', '9.4', '8.19']);
      // Zero agents on policy-1#9.2 (default from beforeEach).

      await runTask();

      expect(mockedDeleteVersionSpecificFleetServerPoliciesForVersions).toHaveBeenCalledWith(
        expect.anything(),
        ['policy-1#9.2'],
        expect.objectContaining({ writtenBefore: expect.any(String) })
      );
      // Whole-parent helpers must NOT be invoked for an active-conditions parent.
      expect(mockedReassignAgents).not.toHaveBeenCalled();
      expect(mockedDeleteVersionSpecificFleetServerPolicies).not.toHaveBeenCalled();
    });

    it('keeps an in-set variant with zero agents even when the parent still has version conditions', async () => {
      // Variant #9.4 IS in the bounded set → not a stale-variant candidate.
      await mockVariantPoliciesInIndex(['policy-1#9.4']);
      mockAgentPolicyService.getByIds = jest
        .fn()
        .mockResolvedValue([{ id: 'policy-1', has_agent_version_conditions: true }]);
      mockedGetAgentVersionsForVersionSpecificPolicies.mockResolvedValue(['9.4']);

      await runTask();

      expect(mockedDeleteVersionSpecificFleetServerPoliciesForVersions).not.toHaveBeenCalled();
      expect(mockedDeleteVersionSpecificFleetServerPolicies).not.toHaveBeenCalled();
    });

    it('keeps an out-of-set variant that still has enrolled agents', async () => {
      // #9.2 is out-of-set, but 3 agents are still assigned to it. Must not delete.
      await mockVariantPoliciesInIndex(['policy-1#9.2']);
      mockAgentPolicyService.getByIds = jest
        .fn()
        .mockResolvedValue([{ id: 'policy-1', has_agent_version_conditions: true }]);
      mockedGetAgentVersionsForVersionSpecificPolicies.mockResolvedValue(['9.5', '9.4', '8.19']);
      mockedGetAgentCountsForVariantPolicyIds.mockResolvedValue(new Map([['policy-1#9.2', 3]]));

      await runTask();

      expect(mockedDeleteVersionSpecificFleetServerPoliciesForVersions).not.toHaveBeenCalled();
    });

    it('keeps an out-of-set variant written within the GRACE window (racing deploy protection)', async () => {
      // lastWrittenMs ≈ now → within the 1-hour GRACE → not a candidate for deletion.
      await mockVariantPoliciesInIndex(['policy-1#9.2'], { lastWrittenMs: Date.now() });
      mockAgentPolicyService.getByIds = jest
        .fn()
        .mockResolvedValue([{ id: 'policy-1', has_agent_version_conditions: true }]);
      mockedGetAgentVersionsForVersionSpecificPolicies.mockResolvedValue(['9.5', '9.4', '8.19']);

      await runTask();

      expect(mockedDeleteVersionSpecificFleetServerPoliciesForVersions).not.toHaveBeenCalled();
    });

    it('self-heals by redeploying a variant that gained agents after deletion (race recovery)', async () => {
      // #9.2 has zero agents before deletion but gains one right after (deployment race).
      // The post-delete re-check must trigger a redeploy to prevent the agent being stranded.
      await mockVariantPoliciesInIndex(['policy-1#9.2']);
      mockAgentPolicyService.getByIds = jest
        .fn()
        .mockResolvedValue([{ id: 'policy-1', has_agent_version_conditions: true }]);
      mockedGetAgentVersionsForVersionSpecificPolicies.mockResolvedValue(['9.5', '9.4', '8.19']);
      // First call (pre-delete): zero agents → proceed to delete.
      // Second call (post-delete self-heal): 1 agent appeared on the just-deleted variant.
      mockedGetAgentCountsForVariantPolicyIds
        .mockResolvedValueOnce(new Map())
        .mockResolvedValueOnce(new Map([['policy-1#9.2', 1]]));
      mockAgentPolicyService.deployPolicies = jest.fn().mockResolvedValue(undefined);

      await runTask();

      expect(mockedDeleteVersionSpecificFleetServerPoliciesForVersions).toHaveBeenCalled();
      expect(mockAgentPolicyService.deployPolicies).toHaveBeenCalledWith(
        expect.anything(),
        ['policy-1'],
        undefined,
        expect.objectContaining({ agentVersions: ['9.2'], spaceId: '*' })
      );
    });
  });
  describe('Sentinel policy version', () => {
    const getPolicyPages = (...pages: AgentPolicy[][]) => {
      const fetch = jest.fn();
      for (const page of pages) {
        fetch.mockResolvedValueOnce(
          (async function* () {
            yield page;
          })()
        );
      }
      return fetch;
    };

    // `.fleet-policies` terms aggregation read to check which `#sentinel` documents are up to date
    const mockSentinelPoliciesInIndex = async (
      revisionsBySentinelPolicyId: Record<string, number>
    ) => {
      const [coreStart] = await mockCore.getStartServices();
      const esClient = coreStart.elasticsearch.client.asInternalUser as any;
      esClient.search.mockResolvedValue({
        aggregations: {
          policies: {
            buckets: Object.entries(revisionsBySentinelPolicyId).map(([key, revision]) => ({
              key,
              max_revision: { value: revision },
            })),
          },
        },
      });
      return esClient;
    };

    beforeEach(() => {
      jest
        .spyOn(appContextService, 'getExperimentalFeatures')
        .mockReturnValue({ enableVersionSpecificPolicies: true } as any);
      jest
        .spyOn(appContextService, 'getInternalUserSOClientWithoutSpaceExtension')
        .mockReturnValue({} as any);
      mockedIsSentinelPolicyVersionEnabled.mockResolvedValue(true);
      mockedGetVariantPolicyIdsFromAgentsWithoutBaseId.mockResolvedValue(new Map());
      mockedGetAgentCountsForVariantPolicyIds.mockResolvedValue(new Map());
      mockedGetAgentVersionsForVersionSpecificPolicies.mockResolvedValue(['9.5', '9.4', '8.19']);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    describe('assigning agents', () => {
      const policy = { id: 'policy-1', revision: 2 } as AgentPolicy;

      beforeEach(() => {
        mockAgentPolicyService.fetchAllAgentPolicies = getPolicyPages([], [policy]);
        mockAgentPolicyService.deployPolicies = jest.fn().mockResolvedValue(undefined);
        mockedFetchAllAgentsByKuery.mockResolvedValue(
          getMockFetchAllAgentsByKuery(generateAgents(2, 'policy-1'))
        );
      });

      it('reassigns agents on the plain policy id to the #sentinel policy', async () => {
        await mockSentinelPoliciesInIndex({ 'policy-1#sentinel': 2 });

        await runTask();

        expect(mockedFetchAllAgentsByKuery).toHaveBeenCalledWith(
          expect.anything(),
          expect.anything(),
          expect.objectContaining({ kuery: 'policy_id:("policy-1")' })
        );
        expect(mockAgentPolicyService.deployPolicies).not.toHaveBeenCalled();
        expect(mockedReassignAgents).toHaveBeenCalledWith(
          expect.anything(),
          expect.anything(),
          {
            agentIds: ['agent-0', 'agent-1'],
            showInactive: false,
            spaceId: '*',
            _internalCrossSpace: true,
          },
          'policy-1#sentinel'
        );
      });

      it('only selects policies without version conditions, managed or agentless', async () => {
        await mockSentinelPoliciesInIndex({ 'policy-1#sentinel': 2 });

        await runTask();

        expect(mockAgentPolicyService.fetchAllAgentPolicies).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            kuery: expect.stringMatching(
              /not .*has_agent_version_conditions:true and not .*is_managed:true and not .*supports_agentless:true/
            ),
          })
        );
      });

      it('deploys the #sentinel policy first when it is missing', async () => {
        const esClient = await mockSentinelPoliciesInIndex({});
        esClient.search
          .mockResolvedValueOnce({ aggregations: { policies: { buckets: [] } } })
          .mockResolvedValueOnce({
            aggregations: {
              policies: { buckets: [{ key: 'policy-1#sentinel', max_revision: { value: 2 } }] },
            },
          });

        await runTask();

        expect(mockAgentPolicyService.deployPolicies).toHaveBeenCalledWith(
          expect.anything(),
          ['policy-1'],
          undefined,
          { spaceId: '*' }
        );
        expect(mockedReassignAgents).toHaveBeenCalledWith(
          expect.anything(),
          expect.anything(),
          expect.objectContaining({ agentIds: ['agent-0', 'agent-1'] }),
          'policy-1#sentinel'
        );
      });

      it('deploys the #sentinel policy first when it is behind the policy revision', async () => {
        const esClient = await mockSentinelPoliciesInIndex({ 'policy-1#sentinel': 1 });
        esClient.search
          .mockResolvedValueOnce({
            aggregations: {
              policies: { buckets: [{ key: 'policy-1#sentinel', max_revision: { value: 1 } }] },
            },
          })
          .mockResolvedValueOnce({
            aggregations: {
              policies: { buckets: [{ key: 'policy-1#sentinel', max_revision: { value: 2 } }] },
            },
          });

        await runTask();

        expect(mockAgentPolicyService.deployPolicies).toHaveBeenCalledTimes(1);
        expect(mockedReassignAgents).toHaveBeenCalledTimes(1);
      });

      it('does not reassign agents when the #sentinel policy could not be deployed', async () => {
        await mockSentinelPoliciesInIndex({});

        await runTask();

        expect(mockAgentPolicyService.deployPolicies).toHaveBeenCalled();
        expect(mockedReassignAgents).not.toHaveBeenCalled();
      });

      it('does nothing when the feature flag is disabled', async () => {
        mockedIsSentinelPolicyVersionEnabled.mockResolvedValue(false);
        await mockSentinelPoliciesInIndex({ 'policy-1#sentinel': 2 });

        await runTask();

        expect(mockedReassignAgents).not.toHaveBeenCalled();
        expect(mockAgentPolicyService.deployPolicies).not.toHaveBeenCalled();
      });
    });

    describe('policies with version conditions', () => {
      it('looks for agents on the #sentinel policy too', async () => {
        mockAgentPolicyService.fetchAllAgentPolicies = getPolicyPages(
          [{ id: 'policy-1' } as AgentPolicy],
          []
        );
        mockedGetAgentsByKuery.mockResolvedValue({ total: 0, agents: [], page: 1, perPage: 0 });

        await runTask();

        expect(mockedGetAgentsByKuery).toHaveBeenCalledWith(
          expect.anything(),
          expect.anything(),
          expect.objectContaining({
            kuery: expect.stringContaining('policy_id:("policy-1" or "policy-1#sentinel")'),
          })
        );
      });

      it('moves agents from #sentinel to the version specific policy', async () => {
        mockAgentPolicyService.fetchAllAgentPolicies = getPolicyPages(
          [{ id: 'policy-1' } as AgentPolicy],
          []
        );
        mockAgentPolicyService.deployPolicies = jest.fn().mockResolvedValue(undefined);
        const agents = generateAgents(1, 'policy-1#sentinel', '9.4.1');
        mockedGetAgentsByKuery.mockResolvedValue({ total: 1, agents, page: 1, perPage: 1 });
        mockedFetchAllAgentsByKuery.mockResolvedValue(getMockFetchAllAgentsByKuery(agents));

        await runTask();

        expect(mockedReassignAgents).toHaveBeenCalledWith(
          expect.anything(),
          expect.anything(),
          expect.objectContaining({ agentIds: ['agent-0'] }),
          'policy-1#9.4'
        );
      });
    });

    describe('orphaned version-specific policy sweep', () => {
      beforeEach(() => {
        mockAgentPolicyService.fetchAllAgentPolicies = getPolicyPages([], []);
        mockAgentPolicyService.getByIds = jest
          .fn()
          .mockResolvedValue([{ id: 'policy-1', has_agent_version_conditions: false }]);
      });

      it('keeps the #sentinel policy of a parent without version conditions', async () => {
        await mockVariantPoliciesInIndex(['policy-1', 'policy-1#sentinel']);

        await runTask();

        expect(mockedReassignAgents).not.toHaveBeenCalled();
        expect(mockedDeleteVersionSpecificFleetServerPolicies).not.toHaveBeenCalled();
      });

      it('moves agents of the other variants to #sentinel and keeps the #sentinel policy', async () => {
        await mockVariantPoliciesInIndex(['policy-1', 'policy-1#sentinel', 'policy-1#9.4']);
        mockedGetVariantAgentsKuery.mockResolvedValue('policy_base_id:"policy-1"');
        mockedFetchAllAgentsByKuery.mockResolvedValue(
          getMockFetchAllAgentsByKuery([{ id: 'agent-1', policy_id: 'policy-1#9.4' }] as Agent[])
        );
        mockedGetAgentsByKuery.mockResolvedValueOnce({ total: 0, agents: [], page: 1, perPage: 0 });

        await runTask();

        expect(mockedFetchAllAgentsByKuery).toHaveBeenCalledWith(
          expect.anything(),
          expect.anything(),
          expect.objectContaining({
            kuery: '(policy_base_id:"policy-1") and not policy_id:"policy-1#sentinel"',
          })
        );
        expect(mockedReassignAgents).toHaveBeenCalledWith(
          expect.anything(),
          expect.anything(),
          expect.objectContaining({ agentIds: ['agent-1'] }),
          'policy-1#sentinel'
        );
        expect(mockedDeleteVersionSpecificFleetServerPolicies).toHaveBeenCalledWith(
          expect.anything(),
          'policy-1',
          { keepPolicyIds: ['policy-1#sentinel'] }
        );
      });

      it('does not delete the #sentinel policy as a stale variant of a parent with version conditions', async () => {
        mockAgentPolicyService.getByIds = jest
          .fn()
          .mockResolvedValue([{ id: 'policy-1', has_agent_version_conditions: true }]);
        await mockVariantPoliciesInIndex(['policy-1', 'policy-1#sentinel']);

        await runTask();

        expect(mockedDeleteVersionSpecificFleetServerPoliciesForVersions).not.toHaveBeenCalled();
      });

      it('cleans up the #sentinel policy when the feature flag is disabled', async () => {
        mockedIsSentinelPolicyVersionEnabled.mockResolvedValue(false);
        await mockVariantPoliciesInIndex(['policy-1', 'policy-1#sentinel']);
        mockedGetVariantAgentsKuery.mockResolvedValue('policy_base_id:"policy-1"');
        mockedFetchAllAgentsByKuery.mockResolvedValue(
          getMockFetchAllAgentsByKuery([
            { id: 'agent-1', policy_id: 'policy-1#sentinel' },
          ] as Agent[])
        );
        mockedGetAgentsByKuery.mockResolvedValueOnce({ total: 0, agents: [], page: 1, perPage: 0 });

        await runTask();

        expect(mockedReassignAgents).toHaveBeenCalledWith(
          expect.anything(),
          expect.anything(),
          expect.objectContaining({ agentIds: ['agent-1'] }),
          'policy-1'
        );
        expect(mockedDeleteVersionSpecificFleetServerPolicies).toHaveBeenCalledWith(
          expect.anything(),
          'policy-1',
          { keepPolicyIds: [] }
        );
      });
    });
  });
});

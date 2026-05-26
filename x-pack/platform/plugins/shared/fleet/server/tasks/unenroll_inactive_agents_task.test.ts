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
  UNENROLL_INACTIVE_AGENTS_GRACE_PERIOD_MS,
  SCHEDULED_UNENROLL_ACTION_ID_PREFIX,
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

  const unenrollBatchSize = 3;
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
      unenrollBatchSize,
      config: { taskInterval: '10m' },
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
      const taskRunner = createTaskRunner({ taskInstance, abortController: new AbortController() });
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

    it('Should schedule eligible agents with a future start_time', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2025-06-01T00:00:00.000Z'));
      mockedUnenrollBatch.mockResolvedValue({ actionId: 'actionid-01' });
      // esClient.search returns empty (no already-scheduled actions)
      mockContract.elasticsearch.client.asInternalUser.search.mockResolvedValue({
        hits: { hits: [] },
      } as any);
      await runTask();
      const expectedStartTime = new Date(
        Date.now() + UNENROLL_INACTIVE_AGENTS_GRACE_PERIOD_MS
      ).toISOString();
      expect(mockedUnenrollBatch).toHaveBeenCalledWith(undefined, expect.anything(), agents, {
        force: true,
        startTime: expectedStartTime,
        actionId: expect.stringContaining(SCHEDULED_UNENROLL_ACTION_ID_PREFIX),
      });
      jest.useRealTimers();
    });

    it('Should skip agents that are already scheduled for unenrollment', async () => {
      mockedUnenrollBatch.mockResolvedValue({ actionId: 'actionid-01' });
      // esClient.search returns agent-1 as already scheduled
      mockContract.elasticsearch.client.asInternalUser.search
        .mockResolvedValueOnce({
          hits: {
            hits: [{ _source: { agents: ['agent-1'] } }],
          },
        } as any)
        // second call for executeDueUnenrollments — no due actions
        .mockResolvedValue({ hits: { hits: [] } } as any);

      await runTask();
      // Only agents NOT already scheduled should be passed
      expect(mockedUnenrollBatch).toHaveBeenCalledWith(
        undefined,
        expect.anything(),
        agents.filter((a) => a.id !== 'agent-1'),
        expect.objectContaining({ startTime: expect.any(String) })
      );
    });

    it('Should execute due scheduled actions that have no CANCEL', async () => {
      const now = new Date('2025-06-01T02:00:00.000Z');
      jest.useFakeTimers().setSystemTime(now);
      mockedUnenrollBatch.mockResolvedValue({ actionId: 'actionid-01' });

      mockContract.elasticsearch.client.asInternalUser.search
        // scheduleUnenrollments: getAlreadyScheduledAgentIds (no candidates)
        .mockResolvedValueOnce({ hits: { hits: [] } } as any)
        // executeDueUnenrollments: find due UNENROLL actions
        .mockResolvedValueOnce({
          hits: {
            hits: [
              {
                _source: {
                  action_id: `${SCHEDULED_UNENROLL_ACTION_ID_PREFIX}abc`,
                  agents: ['agent-1', 'agent-2'],
                  start_time: new Date('2025-06-01T01:00:00.000Z').toISOString(),
                  type: 'UNENROLL',
                },
              },
            ],
          },
        } as any)
        // executeDueUnenrollments: fetch all CANCEL actions (none)
        .mockResolvedValueOnce({ hits: { hits: [] } } as any);

      // getAgentsByKuery for re-validation returns the agents still inactive
      mockedGetAgentsByKuery.mockResolvedValueOnce({ agents } as any);

      await runTask();
      expect(mockedUnenrollBatch).toHaveBeenCalledWith(
        undefined,
        expect.anything(),
        agents,
        expect.objectContaining({
          revoke: true,
          force: true,
          actionId: `${SCHEDULED_UNENROLL_ACTION_ID_PREFIX}abc`,
          skipActionCreation: true,
        })
      );
      jest.useRealTimers();
    });

    it('Should NOT execute due action if a CANCEL exists', async () => {
      const now = new Date('2025-06-01T02:00:00.000Z');
      jest.useFakeTimers().setSystemTime(now);
      mockedUnenrollBatch.mockResolvedValue({ actionId: 'actionid-01' });

      mockContract.elasticsearch.client.asInternalUser.search
        .mockResolvedValueOnce({ hits: { hits: [] } } as any) // scheduleUnenrollments
        // executeDueUnenrollments: find due UNENROLL action
        .mockResolvedValueOnce({
          hits: {
            hits: [
              {
                _source: {
                  action_id: `${SCHEDULED_UNENROLL_ACTION_ID_PREFIX}abc`,
                  agents: ['agent-1'],
                  start_time: new Date('2025-06-01T01:00:00.000Z').toISOString(),
                  type: 'UNENROLL',
                },
              },
            ],
          },
        } as any)
        // executeDueUnenrollments: fetch all CANCEL actions — returns one matching the due action
        .mockResolvedValueOnce({
          hits: {
            hits: [
              {
                _source: {
                  data: { target_id: `${SCHEDULED_UNENROLL_ACTION_ID_PREFIX}abc` },
                },
              },
            ],
          },
        } as any);

      await runTask();
      expect(mockedUnenrollBatch).not.toHaveBeenCalled();
      jest.useRealTimers();
    });

    it('Should skip due action if agent is no longer inactive', async () => {
      const now = new Date('2025-06-01T02:00:00.000Z');
      jest.useFakeTimers().setSystemTime(now);
      mockedUnenrollBatch.mockResolvedValue({ actionId: 'actionid-01' });

      mockContract.elasticsearch.client.asInternalUser.search
        .mockResolvedValueOnce({ hits: { hits: [] } } as any) // scheduleUnenrollments
        // executeDueUnenrollments: find due UNENROLL action
        .mockResolvedValueOnce({
          hits: {
            hits: [
              {
                _source: {
                  action_id: `${SCHEDULED_UNENROLL_ACTION_ID_PREFIX}abc`,
                  agents: ['agent-1'],
                  start_time: new Date('2025-06-01T01:00:00.000Z').toISOString(),
                  type: 'UNENROLL',
                },
              },
            ],
          },
        } as any)
        // executeDueUnenrollments: fetch all CANCEL actions (none)
        .mockResolvedValueOnce({ hits: { hits: [] } } as any);

      // agent is no longer inactive (getAgentsByKuery returns empty)
      mockedGetAgentsByKuery.mockResolvedValueOnce({ agents: [] } as any);

      await runTask();
      expect(mockedUnenrollBatch).not.toHaveBeenCalled();
      jest.useRealTimers();
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

    it('Should process agent policies in batches', async () => {
      const firstAgentPoliciesBatch = [createAgentPolicyMock({ id: 'agent-policy-1' })];
      const secondAgentPoliciesBatch = [createAgentPolicyMock({ id: 'agent-policy-2' })];
      mockAgentPolicyService.fetchAllAgentPolicies = jest.fn().mockResolvedValue(
        jest.fn(async function* () {
          yield firstAgentPoliciesBatch;
          yield secondAgentPoliciesBatch;
        })()
      );
      const secondAgentPoliciesBatchAgents = [
        {
          id: 'agent-21',
          policy_id: 'agent-policy-2',
          status: 'inactive',
        },
        {
          id: 'agent-22',
          policy_id: 'agent-policy-2',
          status: 'inactive',
        },
        {
          id: 'agent-23',
          policy_id: 'agent-policy-2',
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
        undefined,
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

  describe('getAgentQuery', () => {
    const policy1 = createAgentPolicyMock({ id: 'agent-policy-1', unenroll_timeout: 1000 });
    const policy2 = createAgentPolicyMock({ id: 'agent-policy-2', unenroll_timeout: 300 });

    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(new Date('2025-06-01'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('Should get a query that only gets agents that have been inactive for longer than the unenroll_timeout', async () => {
      const policies = [policy1];
      expect(mockTask.getAgentsQuery(policies as any)).toEqual(
        `(fleet-agents.policy_id:\"agent-policy-1\" and (fleet-agents.last_checkin < 1748735000000)) and fleet-agents.status: inactive`
      );
    });

    it('Should get a query for multiple agent policies that only gets agents inactive for longer than the unenroll_timeout', async () => {
      const policies = [policy1, policy2];
      expect(mockTask.getAgentsQuery(policies as any)).toEqual(
        `(fleet-agents.policy_id:\"agent-policy-1\" and (fleet-agents.last_checkin < 1748735000000) or \"agent-policy-2\" and (fleet-agents.last_checkin < 1748735700000)) and fleet-agents.status: inactive`
      );
    });
  });
});

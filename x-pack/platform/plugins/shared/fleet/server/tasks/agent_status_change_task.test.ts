/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClientMock } from '@kbn/core/server/mocks';
import { coreMock } from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import type { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import { TaskStatus } from '@kbn/task-manager-plugin/server';
import { getDeleteTaskRunResult } from '@kbn/task-manager-plugin/server/task';
import type { CoreSetup } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';

import { createAppContextStartContractMock } from '../mocks';

import { agentPolicyService, appContextService } from '../services';
import { bulkUpdateAgents, fetchAllAgentsByKuery } from '../services/agents';

import type { Agent } from '../types';

import {
  AgentStatusChangeTask,
  AGENT_STATUS_CHANGE_SOURCE_FIELDS,
  HAS_CHANGED_RUNTIME_FIELD,
  TYPE,
  VERSION,
} from './agent_status_change_task';

jest.mock('../services');
jest.mock('../services/agents');
jest.mock('../services/outputs/helpers');

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

const mockedFetchAllAgentsByKuery = fetchAllAgentsByKuery as jest.MockedFunction<
  typeof fetchAllAgentsByKuery
>;
const mockAgentPolicyService = agentPolicyService as jest.Mocked<typeof agentPolicyService>;
const getMockAgentPolicyFetchAllAgentPolicies = (items: any[]) =>
  jest.fn().mockImplementation(async () =>
    (async function* () {
      yield items;
    })()
  );
const getMockFetchAllAgentsByKuery = (items: Agent[]) =>
  jest.fn(async function* () {
    yield items;
  })();

const getMockFetchAllAgentsByKueryPages = (pages: Agent[][]) =>
  jest.fn(async function* () {
    for (const page of pages) {
      yield page;
    }
  })();
const mockBulkUpdateAgents = bulkUpdateAgents as jest.MockedFunction<typeof bulkUpdateAgents>;

describe('AgentStatusChangeTask', () => {
  const { createSetup: coreSetupMock } = coreMock;
  const { createSetup: tmSetupMock, createStart: tmStartMock } = taskManagerMock;

  let mockContract: ReturnType<typeof createAppContextStartContractMock>;
  let mockTask: AgentStatusChangeTask;
  let mockCore: CoreSetup;
  let mockTaskManagerSetup: jest.Mocked<TaskManagerSetupContract>;
  let mockLogFactory: ReturnType<typeof loggingSystemMock.create>;

  beforeEach(async () => {
    mockContract = createAppContextStartContractMock();
    appContextService.start(mockContract);
    mockCore = coreSetupMock({
      pluginStartContract: {},
    });
    mockTaskManagerSetup = tmSetupMock();
    mockLogFactory = loggingSystemMock.create();
    mockTask = new AgentStatusChangeTask({
      core: mockCore,
      taskManager: mockTaskManagerSetup,
      logFactory: mockLogFactory,
      config: {
        taskInterval: '10m',
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Task lifecycle', () => {
    it('Should create task', () => {
      expect(mockTask).toBeInstanceOf(AgentStatusChangeTask);
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
    let esClient: ElasticsearchClientMock;
    const runTask = async (taskInstance = MOCK_TASK_INSTANCE) => {
      const mockTaskManagerStart = tmStartMock();
      await mockTask.start({ taskManager: mockTaskManagerStart });
      const createTaskRunner =
        mockTaskManagerSetup.registerTaskDefinitions.mock.calls[0][0][TYPE].createTaskRunner;
      const taskRunner = createTaskRunner(taskManagerMock.createRunContext({ taskInstance }));
      return taskRunner.run();
    };

    beforeEach(async () => {
      const [{ elasticsearch }] = await mockCore.getStartServices();
      esClient = elasticsearch.client.asInternalUser as ElasticsearchClientMock;
      jest
        .spyOn(appContextService, 'getExperimentalFeatures')
        .mockReturnValue({ enableAgentStatusAlerting: true } as any);

      mockAgentPolicyService.fetchAllAgentPolicies.mockImplementation(
        getMockAgentPolicyFetchAllAgentPolicies([
          {
            id: 'agentless-policy-1',
            name: 'Agentless Policy 1',
            supports_agentless: true,
            namespace: 'default',
          },
          {
            id: 'policy-prod',
            name: 'Prod Policy',
            supports_agentless: false,
            namespace: 'production',
          },
          {
            id: 'policy-staging',
            name: 'Staging Policy',
            supports_agentless: false,
            namespace: 'staging',
          },
        ])
      );
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('Should not run if task is outdated', async () => {
      const result = await runTask({ ...MOCK_TASK_INSTANCE, id: 'old-id' });

      expect(result).toEqual(getDeleteTaskRunResult());
    });

    it('should record agent status change', async () => {
      const agents = [
        {
          id: 'agent-1',
          policy_id: 'agentless-policy-1',
          status: 'unhealthy',
          namespaces: ['default'],
          local_metadata: {
            host: {
              hostname: 'host1',
            },
          },
        },
        {
          id: 'agent-2',
          policy_id: 'agent-policy-2',
          status: 'online',
          namespaces: ['space1'],
          local_metadata: {
            host: {
              hostname: 'host2',
            },
          },
          last_known_status: 'offline',
        },
      ] as unknown as Agent[];
      mockedFetchAllAgentsByKuery
        .mockResolvedValueOnce(getMockFetchAllAgentsByKuery(agents))
        .mockResolvedValue(getMockFetchAllAgentsByKuery([]));

      await runTask();

      expect(mockBulkUpdateAgents).toHaveBeenCalledWith(
        esClient,
        [
          {
            agentId: 'agent-1',
            data: {
              last_known_status: 'unhealthy',
            },
          },
          {
            agentId: 'agent-2',
            data: {
              last_known_status: 'online',
            },
          },
        ],
        {}
      );
      expect(esClient.bulk).toHaveBeenCalledWith(
        expect.objectContaining({
          index: 'logs-elastic_agent.status_change-default',
          operations: expect.arrayContaining([
            expect.objectContaining({
              create: {
                _id: expect.any(String),
              },
            }),
            expect.objectContaining({
              '@timestamp': expect.any(String),
              agent: {
                id: 'agent-1',
              },
              agentless: true,
              data_stream: {
                dataset: 'elastic_agent.status_change',
                namespace: 'default',
                type: 'logs',
              },
              hostname: 'host1',
              policy_id: 'agentless-policy-1',
              policy_namespace: 'default',
              space_id: ['default'],
              status: 'unhealthy',
            }),
            expect.objectContaining({
              create: {
                _id: expect.any(String),
              },
            }),
            expect.objectContaining({
              '@timestamp': expect.any(String),
              agent: {
                id: 'agent-2',
              },
              agentless: false,
              data_stream: {
                dataset: 'elastic_agent.status_change',
                namespace: 'default',
                type: 'logs',
              },
              hostname: 'host2',
              policy_id: 'agent-policy-2',
              policy_namespace: 'default',
              space_id: ['space1'],
              status: 'online',
            }),
          ]),
        })
      );
    });

    it('should set policy_namespace field to the resolved policy namespace while always writing to the default data stream', async () => {
      const agents = [
        {
          id: 'agent-prod',
          policy_id: 'policy-prod',
          status: 'online',
          namespaces: ['default'],
          local_metadata: { host: { hostname: 'host-prod' } },
        },
      ] as unknown as Agent[];

      mockedFetchAllAgentsByKuery
        .mockResolvedValueOnce(getMockFetchAllAgentsByKuery(agents))
        .mockResolvedValue(getMockFetchAllAgentsByKuery([]));

      await runTask();

      const bulkCall = esClient.bulk.mock.calls[0][0];
      expect(bulkCall.index).toBe('logs-elastic_agent.status_change-default');
      const operations = bulkCall.operations as any[];
      const doc = operations[1];

      expect(doc.policy_namespace).toBe('production');
      expect(doc.data_stream.namespace).toBe('default');
    });

    it('should fallback policy_namespace to default for agent with no policy_id', async () => {
      const agents = [
        {
          id: 'agent-no-policy',
          status: 'online',
          namespaces: ['default'],
          local_metadata: { host: { hostname: 'host-no-policy' } },
        },
      ] as unknown as Agent[];

      mockedFetchAllAgentsByKuery
        .mockResolvedValueOnce(getMockFetchAllAgentsByKuery(agents))
        .mockResolvedValue(getMockFetchAllAgentsByKuery([]));

      await runTask();

      const bulkCall = esClient.bulk.mock.calls[0][0];
      expect(bulkCall.index).toBe('logs-elastic_agent.status_change-default');
      const operations = bulkCall.operations as any[];
      const doc = operations[1];

      expect(doc.policy_namespace).toBe('default');
      expect(doc.data_stream.namespace).toBe('default');
    });

    it('should fallback policy_namespace to default when policy_id cannot be resolved', async () => {
      const agents = [
        {
          id: 'agent-deleted-policy',
          policy_id: 'policy-does-not-exist',
          status: 'online',
          namespaces: ['default'],
          local_metadata: { host: { hostname: 'host-deleted-policy' } },
        },
      ] as unknown as Agent[];

      mockedFetchAllAgentsByKuery
        .mockResolvedValueOnce(getMockFetchAllAgentsByKuery(agents))
        .mockResolvedValue(getMockFetchAllAgentsByKuery([]));

      await runTask();

      const bulkCall = esClient.bulk.mock.calls[0][0];
      expect(bulkCall.index).toBe('logs-elastic_agent.status_change-default');
      const operations = bulkCall.operations as any[];
      const doc = operations[1];

      expect(doc.policy_namespace).toBe('default');
      expect(doc.data_stream.namespace).toBe('default');
    });

    it('should send multiple agents on different-namespace policies in the same batch to the default status_change data stream while recording their respective policy_namespace', async () => {
      const agents = [
        {
          id: 'agent-prod',
          policy_id: 'policy-prod',
          status: 'online',
          namespaces: ['default'],
          local_metadata: { host: { hostname: 'host-prod' } },
        },
        {
          id: 'agent-staging',
          policy_id: 'policy-staging',
          status: 'offline',
          namespaces: ['default'],
          local_metadata: { host: { hostname: 'host-staging' } },
        },
      ] as unknown as Agent[];

      mockedFetchAllAgentsByKuery
        .mockResolvedValueOnce(getMockFetchAllAgentsByKuery(agents))
        .mockResolvedValue(getMockFetchAllAgentsByKuery([]));

      await runTask();

      const bulkCall = esClient.bulk.mock.calls[0][0];
      expect(bulkCall.index).toBe('logs-elastic_agent.status_change-default');
      const operations = bulkCall.operations as any[];

      expect(operations[1].policy_namespace).toBe('production');
      expect(operations[1].data_stream.namespace).toBe('default');

      expect(operations[3].policy_namespace).toBe('staging');
      expect(operations[3].data_stream.namespace).toBe('default');
    });

    it('should correctly resolve agentless flag and policy_namespace for agents with versioned policy_id', async () => {
      // Agents enrolled via version-specific policies have policy_id: "<uuid>#<version>" but
      // policy_base_id: "<uuid>". The maps (agentlessPolicies / policyNamespaceMap) are keyed
      // by the base id, so lookups must use policy_base_id, not policy_id.
      const agents = [
        {
          id: 'agent-versioned',
          policy_id: 'agentless-policy-1#9.6', // versioned — mismatches the map key
          policy_base_id: 'agentless-policy-1', // base id — matches the map key
          status: 'online',
          namespaces: ['default'],
          local_metadata: { host: { hostname: 'host-versioned' } },
        },
      ] as unknown as Agent[];

      mockedFetchAllAgentsByKuery
        .mockResolvedValueOnce(getMockFetchAllAgentsByKuery(agents))
        .mockResolvedValue(getMockFetchAllAgentsByKuery([]));

      await runTask();

      const bulkCall = esClient.bulk.mock.calls[0][0];
      const operations = bulkCall.operations as any[];
      const doc = operations[1];

      // The fix: policy_base_id is used for the agentlessPolicies lookup.
      expect(doc.agentless).toBe(true);
      // The fix: policy_base_id is used for the policyNamespaceMap lookup.
      expect(doc.policy_namespace).toBe('default');
      // policy_id in the emitted doc still carries the full versioned id (as stored on the agent).
      expect(doc.policy_id).toBe('agentless-policy-1#9.6');
    });

    it('should do nothing when no agents changed status', async () => {
      const agents = [] as unknown as Agent[];
      mockedFetchAllAgentsByKuery
        .mockResolvedValueOnce(getMockFetchAllAgentsByKuery(agents))
        .mockResolvedValue(getMockFetchAllAgentsByKuery([]));

      await runTask();

      expect(mockBulkUpdateAgents).not.toHaveBeenCalled();
      expect(esClient.bulk).not.toHaveBeenCalled();
    });

    it('should pass _source and fetchFields to fetchAllAgentsByKuery', async () => {
      mockedFetchAllAgentsByKuery.mockResolvedValue(getMockFetchAllAgentsByKuery([]));

      await runTask();

      expect(mockedFetchAllAgentsByKuery).toHaveBeenCalled();
      const [, , optionsArg] = mockedFetchAllAgentsByKuery.mock.calls[0];
      expect(optionsArg).toMatchObject({
        kuery: 'hasChanged:true',
        _source: AGENT_STATUS_CHANGE_SOURCE_FIELDS,
        fetchFields: ['status'],
        runtimeFields: HAS_CHANGED_RUNTIME_FIELD,
      });
    });

    it('should not throw and should skip agents with missing local_metadata', async () => {
      const agents = [
        {
          id: 'agent-no-meta',
          policy_id: 'policy-1',
          status: 'online',
          namespaces: ['default'],
          // no local_metadata
        },
        {
          id: 'agent-with-meta',
          policy_id: 'policy-1',
          status: 'online',
          namespaces: ['default'],
          local_metadata: { host: { hostname: 'host1' } },
        },
      ] as unknown as Agent[];
      mockedFetchAllAgentsByKuery.mockResolvedValue(getMockFetchAllAgentsByKuery(agents));

      await runTask();

      expect(mockBulkUpdateAgents).toHaveBeenCalled();
      expect(esClient.bulk).toHaveBeenCalledWith(
        expect.objectContaining({
          operations: expect.arrayContaining([
            expect.objectContaining({ agent: { id: 'agent-no-meta' }, hostname: undefined }),
            expect.objectContaining({ agent: { id: 'agent-with-meta' }, hostname: 'host1' }),
          ]),
        })
      );
    });

    it('should skip agents with no status and warn', async () => {
      const agents = [
        {
          id: 'agent-no-status',
          policy_id: 'policy-1',
          namespaces: ['default'],
          local_metadata: { host: { hostname: 'host1' } },
          // no status
        },
        {
          id: 'agent-with-status',
          policy_id: 'policy-1',
          status: 'online',
          namespaces: ['default'],
          local_metadata: { host: { hostname: 'host2' } },
        },
      ] as unknown as Agent[];
      mockedFetchAllAgentsByKuery.mockResolvedValue(getMockFetchAllAgentsByKuery(agents));

      await runTask();

      expect(mockBulkUpdateAgents).toHaveBeenCalledWith(
        esClient,
        [{ agentId: 'agent-with-status', data: { last_known_status: 'online' } }],
        {}
      );
      const logs = loggingSystemMock.collect(mockLogFactory);
      expect(logs.warn.some((entry) => String(entry[0]).includes('Skipped 1 agent'))).toBe(true);
    });

    it('should stop at MAX_AGENTS_PER_RUN and log', async () => {
      const makeAgents = (count: number, idPrefix: string): Agent[] =>
        Array.from({ length: count }, (_, i) => ({
          id: `${idPrefix}-${i}`,
          policy_id: 'policy-1',
          status: 'online',
          namespaces: ['default'],
          local_metadata: { host: { hostname: `host-${i}` } },
        })) as unknown as Agent[];

      // 6 pages of 10000 = 60000 total, cap is 50000 (5 pages)
      const pages = Array.from({ length: 6 }, (_, i) => makeAgents(10000, `page${i}`));
      mockedFetchAllAgentsByKuery.mockResolvedValue(getMockFetchAllAgentsByKueryPages(pages));

      await runTask();

      // 5 pages processed, 6th not reached
      expect(mockBulkUpdateAgents).toHaveBeenCalledTimes(5);
      const logs = loggingSystemMock.collect(mockLogFactory);
      expect(logs.info.some((entry) => String(entry[0]).includes('per-run cap'))).toBe(true);
    });

    it('should do nothing when feature flag is disabled', async () => {
      jest
        .spyOn(appContextService, 'getExperimentalFeatures')
        .mockReturnValue({ enableAgentStatusAlerting: false } as any);
      const agents = [
        {
          id: 'agent-3',
          policy_id: 'agent-policy-3',
          status: 'online',
          namespaces: ['default'],
          local_metadata: {
            host: {
              hostname: 'host3',
            },
          },
          last_known_status: 'offline',
        },
      ] as unknown as Agent[];
      mockedFetchAllAgentsByKuery
        .mockResolvedValueOnce(getMockFetchAllAgentsByKuery(agents))
        .mockResolvedValue(getMockFetchAllAgentsByKuery([]));

      await runTask();

      expect(mockBulkUpdateAgents).not.toHaveBeenCalled();
      expect(esClient.bulk).not.toHaveBeenCalled();
    });
  });
});

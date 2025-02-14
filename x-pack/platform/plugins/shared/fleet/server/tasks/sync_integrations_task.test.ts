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

import { appContextService, outputService } from '../services';

import { SyncIntegrationsTask, TYPE, VERSION } from './sync_integrations_task';

jest.mock('../services', () => ({
  appContextService: {
    getExperimentalFeatures: jest.fn().mockReturnValue({ enableSyncIntegrationsOnRemote: true }),
    start: jest.fn(),
  },
  outputService: {
    list: jest.fn(),
  },
}));

const mockOutputService = outputService as jest.Mocked<typeof outputService>;

jest.mock('../services/epm/packages/get', () => ({
  getInstalledPackageSavedObjects: jest.fn().mockResolvedValue({
    saved_objects: [
      {
        attributes: {
          name: 'package-1',
          version: '0.1.0',
          updated_at: new Date().toISOString(),
        },
      },
      {
        attributes: {
          name: 'package-2',
          version: '0.2.0',
          updated_at: new Date().toISOString(),
        },
      },
    ],
  }),
}));

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

describe('SyncIntegrationsTask', () => {
  const { createSetup: coreSetupMock } = coreMock;
  const { createSetup: tmSetupMock, createStart: tmStartMock } = taskManagerMock;

  let mockContract: ReturnType<typeof createAppContextStartContractMock>;
  let mockTask: SyncIntegrationsTask;
  let mockCore: CoreSetup;
  let mockTaskManagerSetup: jest.Mocked<TaskManagerSetupContract>;

  beforeEach(() => {
    mockContract = createAppContextStartContractMock();
    appContextService.start(mockContract);
    mockCore = coreSetupMock();
    mockTaskManagerSetup = tmSetupMock();
    mockTask = new SyncIntegrationsTask({
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
      expect(mockTask).toBeInstanceOf(SyncIntegrationsTask);
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
      const taskRunner = createTaskRunner({ taskInstance });
      return taskRunner.run();
    };

    beforeEach(async () => {
      const [{ elasticsearch }] = await mockCore.getStartServices();
      esClient = elasticsearch.client.asInternalUser as ElasticsearchClientMock;
      esClient.indices.exists.mockResolvedValue(true);
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('Should not run if task is outdated', async () => {
      const result = await runTask({ ...MOCK_TASK_INSTANCE, id: 'old-id' });

      expect(result).toEqual(getDeleteTaskRunResult());
    });

    it('Should update fleet-synced-integrations doc', async () => {
      mockOutputService.list.mockResolvedValue({
        items: [
          {
            type: 'remote_elasticsearch',
            name: 'remote1',
            hosts: ['https://remote1:9200'],
            sync_integrations: true,
          },
          {
            type: 'remote_elasticsearch',
            name: 'remote2',
            hosts: ['https://remote2:9200'],
            sync_integrations: false,
          },
        ],
      } as any);
      await runTask();

      expect(esClient.update).toHaveBeenCalledWith(
        {
          body: {
            doc: {
              integrations: [
                {
                  package_name: 'package-1',
                  package_version: '0.1.0',
                  updated_at: expect.any(String),
                },
                {
                  package_name: 'package-2',
                  package_version: '0.2.0',
                  updated_at: expect.any(String),
                },
              ],
              remote_es_hosts: [
                { hosts: ['https://remote1:9200'], name: 'remote1', sync_integrations: true },
                { hosts: ['https://remote2:9200'], name: 'remote2', sync_integrations: false },
              ],
            },
            doc_as_upsert: true,
          },
          id: 'fleet-synced-integrations',
          index: 'fleet-synced-integrations',
        },
        expect.anything()
      );
    });

    it('Should not update fleet-synced-integrations doc if no outputs with sync enabled', async () => {
      mockOutputService.list.mockResolvedValue({
        items: [
          {
            type: 'remote_elasticsearch',
            name: 'remote2',
            hosts: ['https://remote2:9200'],
            sync_integrations: false,
          },
        ],
      } as any);
      await runTask();

      expect(esClient.update).not.toHaveBeenCalled();
    });
  });
});

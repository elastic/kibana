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

import { createAppContextStartContractMock, createMockPackageService } from '../../mocks';

import { appContextService, outputService } from '../../services';

import { SyncIntegrationsTask, TYPE, VERSION } from './sync_integrations_task';

jest.mock('../../services', () => ({
  appContextService: {
    getExperimentalFeatures: jest.fn().mockReturnValue({ enableSyncIntegrationsOnRemote: true }),
    start: jest.fn(),
  },
  outputService: {
    list: jest.fn(),
  },
}));

const mockOutputService = outputService as jest.Mocked<typeof outputService>;

jest.mock('../../services/epm/packages/get', () => ({
  getInstalledPackageSavedObjects: jest.fn().mockResolvedValue({
    saved_objects: [
      {
        attributes: {
          name: 'system',
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

jest.mock('./sync_integrations_on_remote');

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
    mockCore = coreSetupMock({
      pluginStartContract: {
        packageService: createMockPackageService(),
      },
    });
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
      esClient.cluster.getComponentTemplate.mockResolvedValue({
        component_templates: [
          {
            name: 'logs-system.auth@custom',
            component_template: { template: {} },
          },
        ],
      });
      esClient.ingest.getPipeline.mockResolvedValue({
        'logs-system.auth@custom': {
          processors: [],
        },
      });
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('Should not run if task is outdated', async () => {
      const result = await runTask({ ...MOCK_TASK_INSTANCE, id: 'old-id' });

      expect(result).toEqual(getDeleteTaskRunResult());
    });

    it('Should create fleet-synced-integrations doc', async () => {
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

      expect(esClient.index).toHaveBeenCalledWith(
        {
          id: 'fleet-synced-integrations',
          index: 'fleet-synced-integrations',
          body: {
            integrations: [
              {
                package_name: 'system',
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
            custom_assets: {
              'component_template:logs-system.auth@custom': {
                is_deleted: false,
                name: 'logs-system.auth@custom',
                package_name: 'system',
                package_version: '0.1.0',
                template: {},
                type: 'component_template',
              },
              'ingest_pipeline:logs-system.auth@custom': {
                is_deleted: false,
                name: 'logs-system.auth@custom',
                package_name: 'system',
                package_version: '0.1.0',
                pipeline: {
                  processors: [],
                },
                type: 'ingest_pipeline',
              },
            },
          },
        },
        expect.anything()
      );
    });

    it('Should save custom assets error', async () => {
      mockOutputService.list.mockResolvedValue({
        items: [
          {
            type: 'remote_elasticsearch',
            name: 'remote1',
            hosts: ['https://remote1:9200'],
            sync_integrations: true,
          },
        ],
      } as any);
      esClient.ingest.getPipeline.mockRejectedValue(new Error('es error'));
      await runTask();

      expect(esClient.index).toHaveBeenCalledWith(
        {
          id: 'fleet-synced-integrations',
          index: 'fleet-synced-integrations',
          body: {
            integrations: [
              {
                package_name: 'system',
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
            ],
            custom_assets: {},
            custom_assets_error: {
              timestamp: expect.any(String),
              error: 'es error',
            },
          },
        },
        expect.anything()
      );
    });

    it('Should not index fleet-synced-integrations doc if no outputs with sync enabled', async () => {
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

      expect(esClient.index).not.toHaveBeenCalled();
    });

    it('Should index fleet-synced-integrations doc if sync flag changed from true to false', async () => {
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
      esClient.get.mockResolvedValue({
        _source: {
          remote_es_hosts: [
            { hosts: ['https://remote1:9200'], name: 'remote1', sync_integrations: true },
          ],
        },
      } as any);
      await runTask();

      expect(esClient.index).toHaveBeenCalled();
    });

    it('Should not index fleet-synced-integrations doc if sync flag already false', async () => {
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
      esClient.get.mockResolvedValue({
        _source: {
          remote_es_hosts: [
            { hosts: ['https://remote1:9200'], name: 'remote1', sync_integrations: false },
          ],
          integrations: [],
          custom_assets: {},
          custom_assets_error: {},
        },
      } as any);
      await runTask();

      expect(esClient.index).not.toHaveBeenCalled();
    });

    it('Should not index fleet-synced-integrations doc if sync doc does not exist', async () => {
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
      esClient.get.mockRejectedValue({ statusCode: 404 });
      await runTask();

      expect(esClient.index).not.toHaveBeenCalled();
    });
  });
});

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

import * as Registry from '../services/epm/registry';

import { createAppContextStartContractMock, createMockPackageService } from '../mocks';

import type { PackageClient } from '../services';
import { appContextService } from '../services';

import { getInstalledPackages } from '../services/epm/packages';

import {
  AutoInstallContentPackagesTask,
  TYPE,
  VERSION,
} from './auto_install_content_packages_task';

jest.mock('../services');
jest.mock('../services/epm/registry');
jest.mock('../services/epm/packages', () => ({
  getInstalledPackages: jest.fn(),
}));

const MockRegistry = jest.mocked(Registry);

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

const mockGetInstalledPackages = getInstalledPackages as jest.Mock;

describe('AutoInstallContentPackagesTask', () => {
  const { createSetup: coreSetupMock } = coreMock;
  const { createSetup: tmSetupMock, createStart: tmStartMock } = taskManagerMock;

  let mockContract: ReturnType<typeof createAppContextStartContractMock>;
  let mockTask: AutoInstallContentPackagesTask;
  let mockCore: CoreSetup;
  let mockTaskManagerSetup: jest.Mocked<TaskManagerSetupContract>;
  let packageClientMock: jest.Mocked<PackageClient>;

  beforeEach(async () => {
    mockContract = createAppContextStartContractMock();
    appContextService.start(mockContract);
    mockCore = coreSetupMock({
      pluginStartContract: {
        packageService: createMockPackageService(),
      },
    });
    packageClientMock = ((await mockCore.getStartServices())[2] as any).packageService
      .asInternalUser;
    mockTaskManagerSetup = tmSetupMock();
    mockTask = new AutoInstallContentPackagesTask({
      core: mockCore,
      taskManager: mockTaskManagerSetup,
      logFactory: loggingSystemMock.create(),
      config: {
        taskInterval: '10m',
      },
    });
    mockGetInstalledPackages.mockResolvedValue({ items: [] });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Task lifecycle', () => {
    it('Should create task', () => {
      expect(mockTask).toBeInstanceOf(AutoInstallContentPackagesTask);
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
      esClient.esql.query.mockResolvedValue({
        took: 100,
        values: [
          [1, 'system.cpu'],
          [2, 'system.memory'],
          [3, 'system.test'],
        ],
      } as any);
      jest
        .spyOn(appContextService, 'getExperimentalFeatures')
        .mockReturnValue({ enableAutoInstallContentPackages: true } as any);
      MockRegistry.fetchList.mockResolvedValue([
        {
          name: 'kubernetes_otel',
          version: '1.1.0',
          discovery: {
            datasets: [{ name: 'system.cpu' }, { name: 'system.memory' }],
          },
        } as any,
      ]);
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('Should not run if task is outdated', async () => {
      const result = await runTask({ ...MOCK_TASK_INSTANCE, id: 'old-id' });

      expect(esClient.deleteByQuery).not.toHaveBeenCalled();
      expect(result).toEqual(getDeleteTaskRunResult());
    });

    it('should install content packages', async () => {
      await runTask();

      expect(packageClientMock.installPackage).toHaveBeenCalledWith({
        pkgName: 'kubernetes_otel',
        pkgVersion: '1.1.0',
        useStreaming: true,
        automaticInstall: true,
      });
      expect(packageClientMock.installPackage).toHaveBeenCalledTimes(1);
    });

    it('should not call registry if cached', async () => {
      packageClientMock.getInstallation.mockResolvedValue({
        install_status: 'installed',
        version: '1.1.0',
      } as any);

      await runTask();
      await runTask();

      expect(MockRegistry.fetchList).toHaveBeenCalledTimes(1);
    });

    it('should install package if old version is installed', async () => {
      mockGetInstalledPackages.mockResolvedValue({
        items: [
          {
            name: 'kubernetes_otel',
            version: '1.0.0',
          },
        ],
      });

      await runTask();

      expect(packageClientMock.installPackage).toHaveBeenCalledWith({
        pkgName: 'kubernetes_otel',
        pkgVersion: '1.1.0',
        useStreaming: true,
        automaticInstall: true,
      });
    });

    it('should not install package if latest version is installed', async () => {
      mockGetInstalledPackages.mockResolvedValue({
        items: [
          {
            name: 'kubernetes_otel',
            version: '1.1.0',
          },
        ],
      });

      await runTask();

      expect(packageClientMock.installPackage).not.toHaveBeenCalled();
    });
  });
});

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

import { appContextService } from '../services';

import {
  CleanupIntegrationRevisionsTask,
  TYPE,
  VERSION,
} from './cleanup_integration_revisions_task';

jest.mock('../services', () => ({
  appContextService: {
    getExperimentalFeatures: jest.fn(),
    getInternalUserSOClientWithoutSpaceExtension: jest.fn().mockReturnValue({
      find: jest.fn(),
      bulkDelete: jest.fn().mockResolvedValue({}),
      bulkUpdate: jest.fn().mockResolvedValue({}),
    }),
  },
}));

jest.mock('../services/package_policy', () => ({
  getPackagePolicySavedObjectType: jest.fn().mockResolvedValue('fleet-package-policies'),
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

const mockSoClient = appContextService.getInternalUserSOClientWithoutSpaceExtension();
const mockFind = mockSoClient.find as jest.Mock;
const mockBulkDelete = mockSoClient.bulkDelete as jest.Mock;
const mockBulkUpdate = mockSoClient.bulkUpdate as jest.Mock;

describe('CleanupIntegrationRevisionsTask', () => {
  const { createSetup: coreSetupMock } = coreMock;
  const { createSetup: tmSetupMock, createStart: tmStartMock } = taskManagerMock;

  let mockTask: CleanupIntegrationRevisionsTask;
  let mockCore: CoreSetup;
  let mockTaskManagerSetup: jest.Mocked<TaskManagerSetupContract>;

  beforeEach(async () => {
    mockCore = coreSetupMock({
      pluginStartContract: {},
    });
    mockTaskManagerSetup = tmSetupMock();
    mockTask = new CleanupIntegrationRevisionsTask({
      core: mockCore,
      taskManager: mockTaskManagerSetup,
      logFactory: loggingSystemMock.create(),
      config: {},
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Task lifecycle', () => {
    it('Should create task', () => {
      expect(mockTask).toBeInstanceOf(CleanupIntegrationRevisionsTask);
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

    beforeEach(async () => {
      jest
        .spyOn(appContextService, 'getExperimentalFeatures')
        .mockReturnValue({ enablePackageRollback: true } as any);
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('Should not run if task is outdated', async () => {
      const result = await runTask({ ...MOCK_TASK_INSTANCE, id: 'old-id' });

      expect(result).toEqual(getDeleteTaskRunResult());
    });

    it('should do nothing when feature flag is disabled', async () => {
      jest
        .spyOn(appContextService, 'getExperimentalFeatures')
        .mockReturnValue({ enablePackageRollback: false } as any);

      await runTask();

      expect(mockFind).not.toHaveBeenCalled();
    });

    it('should delete previous revisions and reset package previous version', async () => {
      mockFind.mockResolvedValueOnce({
        saved_objects: [
          {
            id: 'policy-1:prev',
          },
          {
            id: 'policy-2:prev',
          },
        ],
      });
      mockFind.mockResolvedValueOnce({
        saved_objects: [
          {
            id: 'test-package',
          },
        ],
      });

      await runTask();

      expect(mockBulkDelete).toHaveBeenCalledWith(
        [
          { id: 'policy-1:prev', type: 'fleet-package-policies' },
          { id: 'policy-2:prev', type: 'fleet-package-policies' },
        ],
        { force: true }
      );
      expect(mockBulkUpdate).toHaveBeenCalledWith([
        { attributes: { previous_version: null }, id: 'test-package', type: 'epm-packages' },
      ]);
    });
  });
});

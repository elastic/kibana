/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  elasticsearchServiceMock,
  loggingSystemMock,
  savedObjectsClientMock,
} from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import type { ConcreteTaskInstance } from '@kbn/task-manager-plugin/server';
import { getSpacesWithAnalyticsEnabled } from '../../utils';
import { createCasesAnalyticsIndexesForOwnerAndSpace } from '../..';
import { scheduleOwnerSyncTasks } from '../owner_sync_task';
import { getSynchronizationTaskId } from '../synchronization_task';
import { SchedulerTaskRunner } from './scheduler_task_runner';

jest.mock('../../utils');
const getSpacesWithAnalyticsEnabledMock = getSpacesWithAnalyticsEnabled as jest.Mock;

jest.mock('../..');
const createCasesAnalyticsIndexesForOwnerAndSpaceMock =
  createCasesAnalyticsIndexesForOwnerAndSpace as jest.Mock;

jest.mock('../owner_sync_task');
const scheduleOwnerSyncTasksMock = scheduleOwnerSyncTasks as jest.Mock;

jest.mock('../synchronization_task');
const getSynchronizationTaskIdMock = getSynchronizationTaskId as jest.Mock;

function makeTaskInstance(state: Record<string, unknown> = {}): ConcreteTaskInstance {
  return {
    id: 'test-scheduler-task',
    taskType: 'cai:cases_analytics_scheduler',
    params: {},
    state,
    attempts: 0,
    ownedByMe: true,
    runAt: new Date(),
    scheduledAt: new Date(),
    startedAt: new Date(),
    retryAt: null,
    status: 'running',
    version: '1',
    enabled: true,
  } as unknown as ConcreteTaskInstance;
}

describe('SchedulerTaskRunner', () => {
  const initialPairs = [
    { spaceId: 'default', owner: 'securitySolution' },
    { spaceId: 'another-one', owner: 'securitySolution' },
  ];
  const logger = loggingSystemMock.createLogger();
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const getESClient = jest.fn().mockResolvedValue(esClient);
  const taskManager = taskManagerMock.createStart();
  const getTaskManager = jest.fn().mockResolvedValue(taskManager);
  const getUnsecureSavedObjectsClient = jest.fn().mockResolvedValue(savedObjectsClientMock);
  getSpacesWithAnalyticsEnabledMock.mockResolvedValue(initialPairs);

  const analyticsConfig = {
    index: {
      enabled: true,
      reindexConcurrency: 3,
    },
  };

  const analyticsConfigDisabled = {
    index: {
      enabled: false,
      reindexConcurrency: 3,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    createCasesAnalyticsIndexesForOwnerAndSpaceMock.mockResolvedValue(undefined);
    scheduleOwnerSyncTasksMock.mockResolvedValue(undefined);
    getSynchronizationTaskIdMock.mockImplementation(
      (spaceId: string, owner: string) => `cai_cases_analytics_sync_${spaceId}_${owner}`
    );
    taskManager.removeIfExists.mockResolvedValue(undefined);

    esClient.indices.exists.mockResolvedValue(true);
  });

  it('should not run if analytics index is disabled', async () => {
    const taskRunner = new SchedulerTaskRunner({
      taskInstance: makeTaskInstance(),
      getUnsecureSavedObjectsClient,
      logger,
      analyticsConfig: analyticsConfigDisabled,
      getTaskManager,
      getESClient,
      isServerless: false,
    });

    await taskRunner.run();

    expect(getSpacesWithAnalyticsEnabled).not.toHaveBeenCalled();
  });

  it('should schedule per-owner sync tasks on every run', async () => {
    getSpacesWithAnalyticsEnabledMock.mockResolvedValue(initialPairs);

    const taskRunner = new SchedulerTaskRunner({
      taskInstance: makeTaskInstance({ migrationDone: true }),
      getUnsecureSavedObjectsClient,
      logger,
      analyticsConfig,
      getTaskManager,
      getESClient,
      isServerless: false,
    });

    await taskRunner.run();

    expect(scheduleOwnerSyncTasksMock).toHaveBeenCalledTimes(1);
    expect(scheduleOwnerSyncTasksMock).toHaveBeenCalledWith(
      expect.objectContaining({ taskManager, logger })
    );
  });

  it('should remove legacy per-space sync tasks on first run (migration)', async () => {
    getSpacesWithAnalyticsEnabledMock.mockResolvedValue(initialPairs);

    // No migrationDone in state → first run
    const taskRunner = new SchedulerTaskRunner({
      taskInstance: makeTaskInstance({}),
      getUnsecureSavedObjectsClient,
      logger,
      analyticsConfig,
      getTaskManager,
      getESClient,
      isServerless: false,
    });

    const result = await taskRunner.run();

    expect(taskManager.removeIfExists).toHaveBeenCalledTimes(initialPairs.length);
    expect(taskManager.removeIfExists).toHaveBeenCalledWith(
      'cai_cases_analytics_sync_default_securitySolution'
    );
    expect(taskManager.removeIfExists).toHaveBeenCalledWith(
      'cai_cases_analytics_sync_another-one_securitySolution'
    );
    // state should reflect migration done
    expect(result?.state).toEqual(expect.objectContaining({ migrationDone: true }));
  });

  it('should NOT remove legacy tasks if migrationDone is already true', async () => {
    getSpacesWithAnalyticsEnabledMock.mockResolvedValue(initialPairs);

    const taskRunner = new SchedulerTaskRunner({
      taskInstance: makeTaskInstance({ migrationDone: true }),
      getUnsecureSavedObjectsClient,
      logger,
      analyticsConfig,
      getTaskManager,
      getESClient,
      isServerless: false,
    });

    await taskRunner.run();

    expect(taskManager.removeIfExists).not.toHaveBeenCalled();
  });

  it('should create analytics indexes for owner+space pairs whose indices are missing', async () => {
    getSpacesWithAnalyticsEnabledMock.mockResolvedValue(initialPairs);
    // only the first pair triggers index creation
    esClient.indices.exists.mockResolvedValueOnce(false);

    const taskRunner = new SchedulerTaskRunner({
      taskInstance: makeTaskInstance({ migrationDone: true }),
      getUnsecureSavedObjectsClient,
      logger,
      analyticsConfig,
      getTaskManager,
      getESClient,
      isServerless: false,
    });

    await taskRunner.run();

    expect(createCasesAnalyticsIndexesForOwnerAndSpaceMock).toHaveBeenCalledTimes(1);
    expect(createCasesAnalyticsIndexesForOwnerAndSpaceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        spaceId: initialPairs[0].spaceId,
        owner: initialPairs[0].owner,
      })
    );
  });

  it('should not create indexes when indices already exist', async () => {
    getSpacesWithAnalyticsEnabledMock.mockResolvedValue([initialPairs[0]]);
    esClient.indices.exists.mockResolvedValue(true);

    const taskRunner = new SchedulerTaskRunner({
      taskInstance: makeTaskInstance({ migrationDone: true }),
      getUnsecureSavedObjectsClient,
      logger,
      analyticsConfig,
      getTaskManager,
      getESClient,
      isServerless: false,
    });

    await taskRunner.run();

    expect(createCasesAnalyticsIndexesForOwnerAndSpaceMock).not.toHaveBeenCalled();
  });

  it('should handle multiple owners in the same space', async () => {
    const multiOwnerPairs = [
      { spaceId: 'default', owner: 'securitySolution' },
      { spaceId: 'default', owner: 'observability' },
    ];
    getSpacesWithAnalyticsEnabledMock.mockResolvedValue(multiOwnerPairs);
    esClient.indices.exists.mockResolvedValue(false);

    const taskRunner = new SchedulerTaskRunner({
      taskInstance: makeTaskInstance({ migrationDone: true }),
      getUnsecureSavedObjectsClient,
      logger,
      analyticsConfig,
      getTaskManager,
      getESClient,
      isServerless: false,
    });

    await taskRunner.run();

    expect(createCasesAnalyticsIndexesForOwnerAndSpaceMock).toHaveBeenCalledTimes(2);
  });
});

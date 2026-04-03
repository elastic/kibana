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
import { createCasesAnalyticsIndexesForOwnerAndSpace, getIndicesForOwnerAndSpace } from '../..';
import { scheduleOwnerSyncTasks } from '../owner_sync_task';
import { getSynchronizationTaskId } from '../synchronization_task';
import { createAnalyticsDataViews } from '../../data_views';
import { SchedulerTaskRunner } from './scheduler_task_runner';

jest.mock('../../utils');
const getSpacesWithAnalyticsEnabledMock = getSpacesWithAnalyticsEnabled as jest.Mock;

jest.mock('../..');
const createCasesAnalyticsIndexesForOwnerAndSpaceMock =
  createCasesAnalyticsIndexesForOwnerAndSpace as jest.Mock;
const getIndicesForOwnerAndSpaceMock = getIndicesForOwnerAndSpace as jest.Mock;

jest.mock('../owner_sync_task');
const scheduleOwnerSyncTasksMock = scheduleOwnerSyncTasks as jest.Mock;

jest.mock('../synchronization_task');
const getSynchronizationTaskIdMock = getSynchronizationTaskId as jest.Mock;

jest.mock('../../data_views');
const createAnalyticsDataViewsMock = createAnalyticsDataViews as jest.Mock;

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
  const getDataViewsService = jest.fn().mockResolvedValue(undefined);
  getSpacesWithAnalyticsEnabledMock.mockResolvedValue(initialPairs);

  const analyticsConfig = {
    index: {
      enabled: true,
      reindexConcurrency: 3,
      maxAnalyticsEnabledSpaces: 100,
    },
  };

  const analyticsConfigDisabled = {
    index: {
      enabled: false,
      reindexConcurrency: 3,
      maxAnalyticsEnabledSpaces: 100,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    createCasesAnalyticsIndexesForOwnerAndSpaceMock.mockResolvedValue(undefined);
    scheduleOwnerSyncTasksMock.mockResolvedValue(undefined);
    createAnalyticsDataViewsMock.mockResolvedValue(undefined);
    getSynchronizationTaskIdMock.mockImplementation(
      (spaceId: string, owner: string) => `cai_cases_analytics_sync_${spaceId}_${owner}`
    );
    taskManager.removeIfExists.mockResolvedValue(undefined);

    // Default: getIndicesForOwnerAndSpace returns deterministic internal index names
    getIndicesForOwnerAndSpaceMock.mockImplementation((spaceId: string, owner: string) => [
      `.internal.cases-analytics.${owner.toLowerCase()}-${spaceId}`,
    ]);

    // Default: indices.get shows all expected indices already exist (no creation needed)
    esClient.indices.get.mockResolvedValue({
      '.internal.cases-analytics.securitysolution-default': {},
      '.internal.cases-analytics.securitysolution-another-one': {},
    } as unknown as Awaited<ReturnType<typeof esClient.indices.get>>);
  });

  it('should not run if analytics index is disabled', async () => {
    const taskRunner = new SchedulerTaskRunner({
      taskInstance: makeTaskInstance(),
      getUnsecureSavedObjectsClient,
      logger,
      analyticsConfig: analyticsConfigDisabled,
      getTaskManager,
      getESClient,
      getDataViewsService,
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
      getDataViewsService,
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
      getDataViewsService,
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
      getDataViewsService,
      isServerless: false,
    });

    await taskRunner.run();

    expect(taskManager.removeIfExists).not.toHaveBeenCalled();
  });

  it('should create analytics indexes for owner+space pairs whose indices are missing', async () => {
    getSpacesWithAnalyticsEnabledMock.mockResolvedValue(initialPairs);
    // Return an empty object — no analytics indices exist yet, so both pairs trigger creation
    esClient.indices.get.mockResolvedValue(
      {} as unknown as Awaited<ReturnType<typeof esClient.indices.get>>
    );

    const taskRunner = new SchedulerTaskRunner({
      taskInstance: makeTaskInstance({ migrationDone: true }),
      getUnsecureSavedObjectsClient,
      logger,
      analyticsConfig,
      getTaskManager,
      getESClient,
      getDataViewsService,
      isServerless: false,
    });

    await taskRunner.run();

    // Both pairs are missing → both trigger creation
    expect(createCasesAnalyticsIndexesForOwnerAndSpaceMock).toHaveBeenCalledTimes(2);
    expect(createCasesAnalyticsIndexesForOwnerAndSpaceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        spaceId: initialPairs[0].spaceId,
        owner: initialPairs[0].owner,
      })
    );
    expect(createCasesAnalyticsIndexesForOwnerAndSpaceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        spaceId: initialPairs[1].spaceId,
        owner: initialPairs[1].owner,
      })
    );
  });

  it('should provision data views for spaces that need new indices', async () => {
    const mockDataViewsService = {};
    getDataViewsService.mockResolvedValue(mockDataViewsService);
    getSpacesWithAnalyticsEnabledMock.mockResolvedValue(initialPairs);
    // No indices exist → both pairs trigger creation
    esClient.indices.get.mockResolvedValue(
      {} as unknown as Awaited<ReturnType<typeof esClient.indices.get>>
    );

    const taskRunner = new SchedulerTaskRunner({
      taskInstance: makeTaskInstance({ migrationDone: true }),
      getUnsecureSavedObjectsClient,
      logger,
      analyticsConfig,
      getTaskManager,
      getESClient,
      getDataViewsService,
      isServerless: false,
    });

    await taskRunner.run();
    // Allow fire-and-forget promises to settle
    await new Promise((resolve) => setImmediate(resolve));

    // Two pairs but both in different spaces → createAnalyticsDataViews called once per unique space
    expect(createAnalyticsDataViewsMock).toHaveBeenCalledWith(
      mockDataViewsService,
      logger,
      'default'
    );
    expect(createAnalyticsDataViewsMock).toHaveBeenCalledWith(
      mockDataViewsService,
      logger,
      'another-one'
    );
    expect(createAnalyticsDataViewsMock).toHaveBeenCalledTimes(2);
  });

  it('should not provision data views when all indices already exist', async () => {
    getSpacesWithAnalyticsEnabledMock.mockResolvedValue([initialPairs[0]]);
    // Default mock has indices existing → no creation triggered

    const taskRunner = new SchedulerTaskRunner({
      taskInstance: makeTaskInstance({ migrationDone: true }),
      getUnsecureSavedObjectsClient,
      logger,
      analyticsConfig,
      getTaskManager,
      getESClient,
      getDataViewsService,
      isServerless: false,
    });

    await taskRunner.run();
    await new Promise((resolve) => setImmediate(resolve));

    expect(createAnalyticsDataViewsMock).not.toHaveBeenCalled();
  });

  it('should not create indexes when indices already exist', async () => {
    getSpacesWithAnalyticsEnabledMock.mockResolvedValue([initialPairs[0]]);

    const taskRunner = new SchedulerTaskRunner({
      taskInstance: makeTaskInstance({ migrationDone: true }),
      getUnsecureSavedObjectsClient,
      logger,
      analyticsConfig,
      getTaskManager,
      getESClient,
      getDataViewsService,
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
    // No indices exist → both pairs trigger creation
    esClient.indices.get.mockResolvedValue(
      {} as unknown as Awaited<ReturnType<typeof esClient.indices.get>>
    );

    const taskRunner = new SchedulerTaskRunner({
      taskInstance: makeTaskInstance({ migrationDone: true }),
      getUnsecureSavedObjectsClient,
      logger,
      analyticsConfig,
      getTaskManager,
      getESClient,
      getDataViewsService,
      isServerless: false,
    });

    await taskRunner.run();

    expect(createCasesAnalyticsIndexesForOwnerAndSpaceMock).toHaveBeenCalledTimes(2);
  });

  it('uses a single indices.get round-trip regardless of how many spaces are enabled', async () => {
    const numSpaces = 1000;
    const manyPairs = Array.from({ length: numSpaces }, (_, i) => ({
      spaceId: `space-${i}`,
      owner: 'securitySolution',
    }));
    getSpacesWithAnalyticsEnabledMock.mockResolvedValue(manyPairs);

    // Pre-populate the existing-indices set so no creation is needed
    const allIndexNames = Object.fromEntries(
      manyPairs.map(({ spaceId, owner }) => [
        `.internal.cases-analytics.${owner.toLowerCase()}-${spaceId}`,
        {},
      ])
    );
    esClient.indices.get.mockResolvedValue(
      allIndexNames as unknown as Awaited<ReturnType<typeof esClient.indices.get>>
    );

    const taskRunner = new SchedulerTaskRunner({
      taskInstance: makeTaskInstance({ migrationDone: true }),
      getUnsecureSavedObjectsClient,
      logger,
      analyticsConfig,
      getTaskManager,
      getESClient,
      getDataViewsService,
      isServerless: false,
    });

    await taskRunner.run();

    // Only ONE indices.get call — not one per space
    expect(esClient.indices.get).toHaveBeenCalledTimes(1);
    // All indices already exist → no creation triggered
    expect(createCasesAnalyticsIndexesForOwnerAndSpaceMock).not.toHaveBeenCalled();
  });
});

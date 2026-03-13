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
import { getSpacesWithAnalyticsEnabled } from '../../utils';
import {
  createCasesAnalyticsIndexesForOwnerAndSpace,
  scheduleCasesAnalyticsSyncTasksForOwner,
} from '../..';
import { SchedulerTaskRunner } from './scheduler_task_runner';

jest.mock('../../utils');
const getSpacesWithAnalyticsEnabledMock = getSpacesWithAnalyticsEnabled as jest.Mock;

jest.mock('../..');
const createCasesAnalyticsIndexesForOwnerAndSpaceMock =
  createCasesAnalyticsIndexesForOwnerAndSpace as jest.Mock;
const scheduleCasesAnalyticsSyncTasksForOwnerMock =
  scheduleCasesAnalyticsSyncTasksForOwner as jest.Mock;

describe('SchedulerTaskRunner', () => {
  const initialPairs = [
    { spaceId: 'default', owner: 'securitySolution' },
    { spaceId: 'another-one', owner: 'securitySolution' },
  ];
  const logger = loggingSystemMock.createLogger();
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const getESClient = jest.fn().mockResolvedValue(esClient);
  const getTaskManager = jest.fn().mockResolvedValue(taskManagerMock.createSetup());
  const getUnsecureSavedObjectsClient = jest.fn().mockResolvedValue(savedObjectsClientMock);
  getSpacesWithAnalyticsEnabledMock.mockResolvedValue(initialPairs);

  const analyticsConfig = {
    index: {
      enabled: true,
    },
  };

  const analyticsConfigDisabled = {
    index: {
      enabled: false,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    createCasesAnalyticsIndexesForOwnerAndSpaceMock.mockResolvedValue(undefined);

    esClient.indices.exists.mockResolvedValue(true);
  });

  it('should not run if analytics index is disabled', async () => {
    const taskRunner = new SchedulerTaskRunner({
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

  it('should schedule sync tasks for all owner+space pairs with analytics enabled', async () => {
    getSpacesWithAnalyticsEnabledMock.mockResolvedValue(initialPairs);

    const taskRunner = new SchedulerTaskRunner({
      getUnsecureSavedObjectsClient,
      logger,
      analyticsConfig,
      getTaskManager,
      getESClient,
      isServerless: false,
    });

    await taskRunner.run();

    expect(scheduleCasesAnalyticsSyncTasksForOwnerMock).toHaveBeenCalledTimes(2);
    expect(scheduleCasesAnalyticsSyncTasksForOwnerMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        spaceId: initialPairs[0].spaceId,
        owner: initialPairs[0].owner,
      })
    );
    expect(scheduleCasesAnalyticsSyncTasksForOwnerMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        spaceId: initialPairs[1].spaceId,
        owner: initialPairs[1].owner,
      })
    );
  });

  it('should create analytics indexes for owner+space pairs if they do not exist yet', async () => {
    getSpacesWithAnalyticsEnabledMock.mockResolvedValue(initialPairs);
    // only the first pair should trigger index creation
    esClient.indices.exists.mockResolvedValueOnce(false);

    const taskRunner = new SchedulerTaskRunner({
      getUnsecureSavedObjectsClient,
      logger,
      analyticsConfig,
      getTaskManager,
      getESClient,
      isServerless: false,
    });

    await taskRunner.run();

    expect(createCasesAnalyticsIndexesForOwnerAndSpaceMock).toHaveBeenCalledTimes(1);
    expect(createCasesAnalyticsIndexesForOwnerAndSpaceMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        spaceId: initialPairs[0].spaceId,
        owner: initialPairs[0].owner,
      })
    );
    expect(scheduleCasesAnalyticsSyncTasksForOwnerMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        spaceId: initialPairs[1].spaceId,
        owner: initialPairs[1].owner,
      })
    );
  });

  it('should not create indexes for a pair when indices already exist', async () => {
    getSpacesWithAnalyticsEnabledMock.mockResolvedValue([initialPairs[0]]);
    esClient.indices.exists.mockResolvedValue(true);

    const taskRunner = new SchedulerTaskRunner({
      getUnsecureSavedObjectsClient,
      logger,
      analyticsConfig,
      getTaskManager,
      getESClient,
      isServerless: false,
    });

    await taskRunner.run();

    expect(createCasesAnalyticsIndexesForOwnerAndSpaceMock).not.toHaveBeenCalled();
    expect(scheduleCasesAnalyticsSyncTasksForOwnerMock).toHaveBeenCalledTimes(1);
  });

  it('should handle multiple owners in the same space', async () => {
    const multiOwnerPairs = [
      { spaceId: 'default', owner: 'securitySolution' },
      { spaceId: 'default', owner: 'observability' },
    ];
    getSpacesWithAnalyticsEnabledMock.mockResolvedValue(multiOwnerPairs);
    esClient.indices.exists.mockResolvedValue(true);

    const taskRunner = new SchedulerTaskRunner({
      getUnsecureSavedObjectsClient,
      logger,
      analyticsConfig,
      getTaskManager,
      getESClient,
      isServerless: false,
    });

    await taskRunner.run();

    expect(scheduleCasesAnalyticsSyncTasksForOwnerMock).toHaveBeenCalledTimes(2);
    expect(scheduleCasesAnalyticsSyncTasksForOwnerMock).toHaveBeenCalledWith(
      expect.objectContaining({ spaceId: 'default', owner: 'securitySolution' })
    );
    expect(scheduleCasesAnalyticsSyncTasksForOwnerMock).toHaveBeenCalledWith(
      expect.objectContaining({ spaceId: 'default', owner: 'observability' })
    );
  });
});

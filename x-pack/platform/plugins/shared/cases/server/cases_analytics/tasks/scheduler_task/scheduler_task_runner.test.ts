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
import { getAllSpacesWithCases } from '../../utils';
import { createCasesAnalyticsIndexesForSpaceId, scheduleCasesAnalyticsSyncTasks } from '../..';
import { SchedulerTaskRunner } from './scheduler_task_runner';

jest.mock('../../utils');
const getAllSpacesWithCasesMock = getAllSpacesWithCases as jest.Mock;

jest.mock('../..');
const createCasesAnalyticsIndexesForSpaceIdMock =
  createCasesAnalyticsIndexesForSpaceId as jest.Mock;
const scheduleCasesAnalyticsSyncTasksMock = scheduleCasesAnalyticsSyncTasks as jest.Mock;

describe('SchedulerTaskRunner', () => {
  const initialSpaces = ['default', 'another-one'];
  const logger = loggingSystemMock.createLogger();
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const getESClient = jest.fn().mockResolvedValue(esClient);
  const getTaskManager = jest.fn().mockResolvedValue(taskManagerMock.createSetup());
  const getUnsecureSavedObjectsClient = jest.fn().mockResolvedValue(savedObjectsClientMock);
  getAllSpacesWithCasesMock.mockResolvedValue(initialSpaces);

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
    createCasesAnalyticsIndexesForSpaceIdMock.mockResolvedValue(undefined);

    esClient.indices.exists.mockResolvedValue(true);
  });

  it('should not run if analytics index is disabled', async () => {
    const taskRunner = new SchedulerTaskRunner({
      getUnsecureSavedObjectsClient,
      logger,
      analyticsConfig: analyticsConfigDisabled,
      getTaskManager,
      getESClient,
    });

    await taskRunner.run();

    expect(getAllSpacesWithCases).not.toHaveBeenCalled();
  });

  it('should schedule sync tasks for all spaces with cases', async () => {
    const taskRunner = new SchedulerTaskRunner({
      getUnsecureSavedObjectsClient,
      logger,
      analyticsConfig,
      getTaskManager,
      getESClient,
    });

    await taskRunner.run();

    expect(scheduleCasesAnalyticsSyncTasksMock).toHaveBeenCalledTimes(2);
    expect(scheduleCasesAnalyticsSyncTasksMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        spaceId: initialSpaces[0],
      })
    );
    expect(scheduleCasesAnalyticsSyncTasksMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        spaceId: initialSpaces[1],
      })
    );
  });

  it('should create analytics indexes for spaces if they do not exist yet', async () => {
    // only the first space should trigger index creation
    esClient.indices.exists.mockResolvedValueOnce(false);

    const taskRunner = new SchedulerTaskRunner({
      getUnsecureSavedObjectsClient,
      logger,
      analyticsConfig,
      getTaskManager,
      getESClient,
    });

    await taskRunner.run();

    expect(createCasesAnalyticsIndexesForSpaceIdMock).toHaveBeenCalledTimes(1);
    expect(createCasesAnalyticsIndexesForSpaceIdMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        spaceId: initialSpaces[0],
      })
    );
    expect(scheduleCasesAnalyticsSyncTasksMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        spaceId: initialSpaces[1],
      })
    );
  });
});

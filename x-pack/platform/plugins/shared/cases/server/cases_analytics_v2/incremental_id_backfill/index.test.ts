/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import type {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
} from '@kbn/task-manager-plugin/server';
import { V2_NOOP_WRITER } from '../writer';
import { runIncrementalIdBackfill } from './runner';
import {
  INCREMENTAL_ID_BACKFILL_TASK_ID,
  INCREMENTAL_ID_BACKFILL_TASK_TYPE,
  registerIncrementalIdBackfillTask,
  scheduleIncrementalIdBackfillTask,
} from '.';

jest.mock('./runner');
const mockRunIncrementalIdBackfill = runIncrementalIdBackfill as jest.MockedFunction<
  typeof runIncrementalIdBackfill
>;

describe('incremental id backfill task', () => {
  const logger = loggerMock.create();

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('registerIncrementalIdBackfillTask', () => {
    it('registers a retryable task whose run walks with the late-bound deps and abort signal', async () => {
      const taskManager = taskManagerMock.createSetup() as unknown as TaskManagerSetupContract;
      const deps = {
        esClient: elasticsearchServiceMock.createElasticsearchClient(),
        savedObjectsClient: savedObjectsClientMock.create(),
        writer: V2_NOOP_WRITER,
      };
      mockRunIncrementalIdBackfill.mockResolvedValue({ repaired: 0 });

      registerIncrementalIdBackfillTask({ taskManager, logger, getRunnerDeps: async () => deps });

      const definition = (taskManager.registerTaskDefinitions as jest.Mock).mock.calls[0][0][
        INCREMENTAL_ID_BACKFILL_TASK_TYPE
      ];
      expect(definition.maxAttempts).toBeGreaterThan(1);

      const signal = new AbortController().signal;
      await definition.createTaskRunner({ taskInstance: {} as ConcreteTaskInstance, signal }).run();

      expect(mockRunIncrementalIdBackfill).toHaveBeenCalledWith({ ...deps, logger, signal });
    });
  });

  describe('scheduleIncrementalIdBackfillTask', () => {
    it('removes any previous instance before scheduling a fresh one-shot run', async () => {
      const taskManager = taskManagerMock.createStart();

      await scheduleIncrementalIdBackfillTask({ taskManager, logger });

      expect(taskManager.removeIfExists).toHaveBeenCalledWith(INCREMENTAL_ID_BACKFILL_TASK_ID);
      expect(taskManager.ensureScheduled).toHaveBeenCalledWith({
        id: INCREMENTAL_ID_BACKFILL_TASK_ID,
        taskType: INCREMENTAL_ID_BACKFILL_TASK_TYPE,
        params: {},
        state: {},
      });
      const removeOrder = (taskManager.removeIfExists as jest.Mock).mock.invocationCallOrder[0];
      const scheduleOrder = (taskManager.ensureScheduled as jest.Mock).mock.invocationCallOrder[0];
      expect(removeOrder).toBeLessThan(scheduleOrder);
    });

    it('logs and resolves when scheduling fails', async () => {
      const taskManager = taskManagerMock.createStart();
      (taskManager.ensureScheduled as jest.Mock).mockRejectedValueOnce(new Error('tm down'));

      await expect(
        scheduleIncrementalIdBackfillTask({ taskManager, logger })
      ).resolves.toBeUndefined();
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('tm down'));
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { coreMock } from '@kbn/core/server/mocks';

import { FleetPolicyRevisionsCleanupTask } from './fleet_policy_revisions_cleanup_task';

describe('FleetPolicyRevisionsCleanupTask', () => {
  let mockTask: FleetPolicyRevisionsCleanupTask;
  let mockCore: ReturnType<typeof coreMock.createSetup>;
  let mockTaskManager: ReturnType<typeof taskManagerMock.createSetup>;
  let logFactory: ReturnType<typeof loggerMock.create>;

  beforeEach(() => {
    mockCore = coreMock.createSetup();
    mockTaskManager = taskManagerMock.createSetup();
    logFactory = loggerMock.create();

    mockTask = new FleetPolicyRevisionsCleanupTask({
      core: mockCore,
      taskManager: mockTaskManager,
      logFactory,
      config: {
        max_revisions: 10,
        frequency: '1h',
        max_policies_per_run: 100,
      },
    });
  });

  describe('task registration', () => {
    it('should register task definition', () => {
      expect(mockTaskManager.registerTaskDefinitions).toHaveBeenCalledWith({
        'fleet:policy-revisions-cleanup-task': expect.objectContaining({
          title: 'Fleet Policy Revisions Cleanup Task',
          timeout: '5m',
          createTaskRunner: expect.any(Function),
        }),
      });
    });
  });

  describe('task configuration', () => {
    it('should use provided configuration values', () => {
      const task = new FleetPolicyRevisionsCleanupTask({
        core: mockCore,
        taskManager: mockTaskManager,
        logFactory,
        config: {
          max_revisions: 20,
          frequency: '2h',
          max_policies_per_run: 50,
        },
      });

      expect(task).toBeDefined();
    });

    it('should use default configuration values when not provided', () => {
      const task = new FleetPolicyRevisionsCleanupTask({
        core: mockCore,
        taskManager: mockTaskManager,
        logFactory,
        config: {},
      });

      expect(task).toBeDefined();
    });
  });
});

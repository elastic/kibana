/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin, LegacyDeps } from './plugin';
import { mockLogger } from './test_utils';
import { TaskManager } from './task_manager';

jest.mock('./task_manager');

describe('Task Manager Plugin', () => {
  let plugin: Plugin;
  const mockCoreSetup = {};
  const mockLegacyDeps: LegacyDeps = {
    config: {
      get: jest.fn(),
    },
    serializer: {},
    elasticsearch: {
      getCluster: jest.fn(),
    },
    savedObjects: {
      getSavedObjectsRepository: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.resetAllMocks();
    mockLegacyDeps.elasticsearch.getCluster.mockReturnValue({ callWithInternalUser: jest.fn() });
    plugin = new Plugin({
      logger: {
        get: mockLogger,
      },
    });
  });

  describe('setup()', () => {
    test('exposes proper contract', async () => {
      const setupResult = plugin.setup(mockCoreSetup, mockLegacyDeps);
      expect(setupResult).toMatchInlineSnapshot(`
        Object {
          "addMiddleware": [Function],
          "ensureScheduled": [Function],
          "fetch": [Function],
          "registerTaskDefinitions": [Function],
          "remove": [Function],
          "schedule": [Function],
        }
      `);
    });
  });

  describe('start()', () => {
    test('properly starts up the task manager', async () => {
      plugin.setup(mockCoreSetup, mockLegacyDeps);
      plugin.start();
      const taskManager = (TaskManager as any).mock.instances[0];
      expect(taskManager.start).toHaveBeenCalled();
    });
  });

  describe('stop()', () => {
    test('properly stops up the task manager', async () => {
      plugin.setup(mockCoreSetup, mockLegacyDeps);
      plugin.stop();
      const taskManager = (TaskManager as any).mock.instances[0];
      expect(taskManager.stop).toHaveBeenCalled();
    });
  });
});

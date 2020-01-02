/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin, LegacyDeps } from './plugin';
import { mockLogger } from './test_utils';
import { TaskManager } from './task_manager';
import { CoreSetup, UuidServiceSetup } from 'kibana/server';

jest.mock('./task_manager');

describe('Task Manager Plugin', () => {
  let plugin: Plugin;
  const uuid: UuidServiceSetup = {
    getInstanceUuid() {
      return 'some-uuid';
    },
  };
  const mockCoreSetup = {
    uuid,
  } as CoreSetup;

  const mockLegacyDeps: LegacyDeps = {
    config: {},
    serializer: {},
    elasticsearch: {
      getCluster: jest.fn(),
    },
    savedObjects: {
      getSavedObjectsRepository: jest.fn(),
    },
    logger: mockLogger(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
    mockLegacyDeps.elasticsearch.getCluster.mockReturnValue({ callWithInternalUser: jest.fn() });
    plugin = new Plugin();
  });

  describe('setup()', () => {
    test('exposes the underlying TaskManager', async () => {
      const setupResult = plugin.setup(mockCoreSetup, mockLegacyDeps);
      expect(setupResult).toMatchInlineSnapshot(`
        TaskManager {
          "addMiddleware": [MockFunction],
          "assertUninitialized": [MockFunction],
          "attemptToRun": [MockFunction],
          "ensureScheduled": [MockFunction],
          "fetch": [MockFunction],
          "registerTaskDefinitions": [MockFunction],
          "remove": [MockFunction],
          "runNow": [MockFunction],
          "schedule": [MockFunction],
          "start": [MockFunction],
          "stop": [MockFunction],
          "waitUntilStarted": [MockFunction],
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import { eventLogMock } from '@kbn/event-log-plugin/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';

import {
  TaskManagerDependenciesPlugin,
  type TaskManagerDependenciesPluginSetup,
  type TaskManagerDependenciesPluginStart,
} from './plugin';

const coreSetup = coreMock.createSetup();
const coreStart = coreMock.createStart();

const setupPlugins: TaskManagerDependenciesPluginSetup = {
  eventLog: eventLogMock.createSetup(),
  taskManager: taskManagerMock.createSetup(),
  encryptedSavedObjects: encryptedSavedObjectsMock.createSetup(),
};

const startPlugins: TaskManagerDependenciesPluginStart = {
  eventLog: eventLogMock.createStart(),
  taskManager: taskManagerMock.createStart(),
  encryptedSavedObjects: encryptedSavedObjectsMock.createStart(),
};

describe('Task Manager Dependencies Plugin', () => {
  describe('setup()', () => {
    test('calls registerType on the ESO plugin', async () => {
      const plugin = new TaskManagerDependenciesPlugin();
      plugin.setup(coreSetup, setupPlugins);
      expect(setupPlugins.encryptedSavedObjects.registerType).toHaveBeenCalled();
    });

    test('calls registerCanEncryptedSavedObjects on the taskManager plugin', async () =>{
      const plugin = new TaskManagerDependenciesPlugin();
      plugin.setup(coreSetup, setupPlugins);
      expect(setupPlugins.taskManager.registerCanEncryptedSavedObjects).toHaveBeenCalled();
    });

    test('calls registerEventLogService on the taskManager plugin', async () => {
      const plugin = new TaskManagerDependenciesPlugin();
      plugin.setup(coreSetup, setupPlugins);
      expect(setupPlugins.taskManager.registerEventLogService).toHaveBeenCalled();
    });
  });

  describe('start()', () => {
    test('calls registerEncryptedSavedObjectsClient on the taskManager plugin', async () => {
      const plugin = new TaskManagerDependenciesPlugin();
      plugin.setup(coreSetup, setupPlugins);
      plugin.start(coreStart, startPlugins);
      expect(startPlugins.taskManager.registerEncryptedSavedObjectsClient).toHaveBeenCalled();
    });
  });
});

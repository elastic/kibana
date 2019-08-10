/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TaskManager } from './task_manager';

export interface PluginSetupContract {
  fetch: TaskManager['fetch'];
  remove: TaskManager['remove'];
  schedule: TaskManager['schedule'];
  addMiddleware: TaskManager['addMiddleware'];
  registerTaskDefinitions: TaskManager['registerTaskDefinitions'];
}

interface LegacyDeps {
  log: any;
  config: any;
  serializer: any;
  elasticsearch: any;
  savedObjects: any;
}

export class Plugin {
  private taskManager?: TaskManager;

  // TODO: Make sync like new platform
  public setup(
    core: {},
    { config, serializer, elasticsearch, savedObjects, log }: LegacyDeps
  ): PluginSetupContract {
    const { callWithInternalUser } = elasticsearch.getCluster('admin');
    const savedObjectsRepository = savedObjects.getSavedObjectsRepository(callWithInternalUser, [
      'task',
    ]);

    const taskManager = new TaskManager({
      config,
      savedObjectsRepository,
      serializer,
      callWithInternalUser,
      log,
    });
    this.taskManager = taskManager;

    return {
      fetch: (...args) => taskManager.fetch(...args),
      remove: (...args) => taskManager.remove(...args),
      schedule: (...args) => taskManager.schedule(...args),
      addMiddleware: (...args) => taskManager.addMiddleware(...args),
      registerTaskDefinitions: (...args) => taskManager.registerTaskDefinitions(...args),
    };
  }

  public start() {
    if (this.taskManager) {
      this.taskManager.start();
    }
  }

  public stop() {
    // TODO: Cancel running tasks
  }
}

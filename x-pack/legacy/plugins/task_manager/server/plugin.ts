/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger } from './types';
import { TaskManager } from './task_manager';

export interface PluginSetupContract {
  fetch: TaskManager['fetch'];
  remove: TaskManager['remove'];
  schedule: TaskManager['schedule'];
  runNow: TaskManager['runNow'];
  ensureScheduled: TaskManager['ensureScheduled'];
  addMiddleware: TaskManager['addMiddleware'];
  registerTaskDefinitions: TaskManager['registerTaskDefinitions'];
}

export interface LegacyDeps {
  config: any;
  serializer: any;
  elasticsearch: any;
  savedObjects: any;
}

interface PluginInitializerContext {
  logger: {
    get: () => Logger;
  };
}

export class Plugin {
  private logger: Logger;
  private taskManager?: TaskManager;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  // TODO: Make asynchronous like new platform
  public setup(
    core: {},
    { config, serializer, elasticsearch, savedObjects }: LegacyDeps
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
      logger: this.logger,
    });
    this.taskManager = taskManager;

    return {
      fetch: (...args) => taskManager.fetch(...args),
      remove: (...args) => taskManager.remove(...args),
      schedule: (...args) => taskManager.schedule(...args),
      runNow: (...args) => taskManager.runNow(...args),
      ensureScheduled: (...args) => taskManager.ensureScheduled(...args),
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
    if (this.taskManager) {
      this.taskManager.stop();
    }
  }
}

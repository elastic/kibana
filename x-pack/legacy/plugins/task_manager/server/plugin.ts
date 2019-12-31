/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup } from 'kibana/server';
import { Logger } from './types';
import { TaskManager } from './task_manager';

export interface PluginContract {
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
  logger: Logger;
}

export class Plugin {
  private taskManager?: TaskManager;

  constructor() {}

  // TODO: Make asynchronous like new platform
  public setup(
    core: CoreSetup,
    { logger, config, serializer, elasticsearch, savedObjects }: LegacyDeps
  ): PluginContract {
    const { callWithInternalUser } = elasticsearch.getCluster('admin');
    const savedObjectsRepository = savedObjects.getSavedObjectsRepository(callWithInternalUser, [
      'task',
    ]);

    this.taskManager = new TaskManager({
      taskManagerId: core.uuid.getInstanceUuid(),
      config,
      savedObjectsRepository,
      serializer,
      callWithInternalUser,
      logger,
    });

    return this.taskManager;
  }

  public start(): PluginContract {
    this.taskManager!.start();
    return this.taskManager!;
  }

  public stop() {
    this.taskManager!.stop();
  }
}

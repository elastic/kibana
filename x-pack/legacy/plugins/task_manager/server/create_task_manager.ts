/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, IClusterClient } from 'kibana/server';
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

export interface LifecycleContract {
  start: TaskManager['start'];
  stop: TaskManager['stop'];
}

export interface LegacyDeps {
  config: any;
  serializer: any;
  elasticsearch: Pick<IClusterClient, 'callAsInternalUser'>;
  savedObjects: any;
  logger: Logger;
}

export function createTaskManager(
  core: CoreSetup,
  { logger, config, serializer, elasticsearch: { callAsInternalUser }, savedObjects }: LegacyDeps
) {
  const savedObjectsRepository = savedObjects.getSavedObjectsRepository(callAsInternalUser, [
    'task',
  ]);

  return new TaskManager({
    taskManagerId: core.uuid.getInstanceUuid(),
    config,
    savedObjectsRepository,
    serializer,
    callAsInternalUser,
    logger,
  });
}

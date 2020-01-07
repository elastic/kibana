/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  IClusterClient,
  SavedObjectsSerializer,
  SavedObjectsSchema,
  CoreSetup,
  SavedObjectsClientContract,
} from '../../../../../src/core/server';
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
  savedObjectSchemas: any;
  elasticsearch: Pick<IClusterClient, 'callAsInternalUser'>;
  savedObjectsRepository: SavedObjectsClientContract;
  logger: Logger;
}

export function createTaskManager(
  core: CoreSetup,
  {
    logger,
    config,
    savedObjectSchemas,
    elasticsearch: { callAsInternalUser },
    savedObjectsRepository,
  }: LegacyDeps
) {
  // as we use this Schema solely to interact with Tasks, we
  // can initialise it with solely the Tasks schema
  const serializer = new SavedObjectsSerializer(new SavedObjectsSchema(savedObjectSchemas));
  return new TaskManager({
    taskManagerId: core.uuid.getInstanceUuid(),
    config,
    savedObjectsRepository,
    serializer,
    callAsInternalUser,
    logger,
  });
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { CoreStart } from '@kbn/core-lifecycle-server';
import type { TaskScheduling } from '../task_scheduling';
import type { TaskTypeDictionary } from '../task_type_dictionary';
import type { TaskManagerStartContract } from '..';
import type { TaskManagerPluginsStart } from '../plugin';
export declare const TASK_ID = 'delete_inactive_background_task_nodes';
export declare const CLEANUP_INTERVAL = '1m';
export declare const CLEANUP_LOOKBACK = '5m';
export declare function scheduleDeleteInactiveNodesTaskDefinition(
  logger: Logger,
  taskScheduling: TaskScheduling
): Promise<void>;
export declare function registerDeleteInactiveNodesTaskDefinition(
  logger: Logger,
  coreStartServices: () => Promise<[CoreStart, TaskManagerPluginsStart, TaskManagerStartContract]>,
  taskTypeDictionary: TaskTypeDictionary
): void;
export declare function taskRunner(
  logger: Logger,
  coreStartServices: () => Promise<[CoreStart, TaskManagerPluginsStart, TaskManagerStartContract]>
): () => {
  run(): Promise<{
    state: {};
    schedule: {
      interval: string;
    };
  }>;
};

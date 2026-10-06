/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiKeyOptions, ConcreteTaskInstance } from '../task';
import type { TaskStore, BulkGetResult } from '../task_store';
import type { BulkUpdateTaskResult } from '../task_scheduling';
export declare const MAX_RETRIES = 2;
export interface RetryableBulkUpdateOpts {
  taskIds: string[];
  getTasks: (taskIds: string[]) => Promise<BulkGetResult>;
  filter: (task: ConcreteTaskInstance) => boolean;
  map: (task: ConcreteTaskInstance, i: number, arr: ConcreteTaskInstance[]) => ConcreteTaskInstance;
  store: TaskStore;
  validate: boolean;
  mergeAttributes?: boolean;
  options?: ApiKeyOptions;
}
export declare function retryableBulkUpdate({
  taskIds,
  getTasks,
  filter,
  map,
  store,
  validate,
  mergeAttributes,
  options,
}: RetryableBulkUpdateOpts): Promise<BulkUpdateTaskResult>;

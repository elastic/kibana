/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { type Options as PRetryOptions } from 'p-retry';
import type { ConcreteTaskInstance, PartialConcreteTaskInstance } from '../task';
import type { Updatable } from './task_runner';
export declare function resolveTaskDocumentConflicts(
  opts: ResolveTaskDocumentConflictsOpts
): Promise<void>;
interface ResolveTaskDocumentConflictsOpts {
  taskId: string;
  partialTask: PartialConcreteTaskInstance;
  originalTask: ConcreteTaskInstance;
  bufferedTaskStore: Updatable;
  logger: Logger;
  pRetryOptions?: PRetryOptions;
}
export {};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TaskManager as TaskManagerClass } from './task_manager';

export type TaskManager = PublicMethodsOf<TaskManagerClass>;

export interface Logger {
  info(message: string): void;
  debug(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

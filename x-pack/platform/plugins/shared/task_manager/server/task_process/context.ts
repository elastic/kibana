/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FakeRequestEnricher } from '@kbn/core-security-server';
import type { TaskRegisterDefinition } from '../task_type_dictionary';
import type { TaskHost, TaskTypeModule } from '../task_type_module';
import type { TaskProcessInit } from './wire';

/**
 * What a task process was started with. The plugins bundled into the process are created by Core's
 * plugin system, which has no way to hand them anything, so they read it from here. It is set once,
 * before Core starts.
 */
export interface TaskProcessContext {
  init: TaskProcessInit;
  module: TaskTypeModule;
  /** What plugins contribute, by key; see `TaskTypeModule.contributions`. */
  contributions: Record<string, unknown[]>;
  /** The task definitions plugins registered through Task Manager's contract. */
  definitions: Map<string, TaskRegisterDefinition>;
  enrichFakeRequest?: FakeRequestEnricher;
  /**
   * What plugins ask the process to finish before it answers a run, such as shipping the events the
   * run reported. Added by plugins at setup, run by `flushTaskProcess`.
   */
  flushers: Array<() => Promise<void>>;
  /** Set by the module's plugin: the host its runner gets, once Core has started. */
  host?: Promise<TaskHost>;
}

let current: TaskProcessContext | undefined;

export const setTaskProcessContext = (context: TaskProcessContext) => {
  current = context;
};

export const getTaskProcessContext = (): TaskProcessContext => {
  if (!current) throw new Error('The task process context was read before the process set it');
  return current;
};

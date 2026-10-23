/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AsyncLocalStorage } from 'node:async_hooks';
import { CURRENT_TASK_ACCESSOR, type CurrentTaskContext } from './types';

/**
 * Identifies the task whose code is running. Only `AsyncLocalStorage` is used, never an
 * `async_hooks` hook: on Node 24 it is backed by AsyncContextFrame and costs nothing, whereas any
 * `before`/`after` hook would turn on V8 promise hooks for the whole process.
 */
const store = new AsyncLocalStorage<CurrentTaskContext>();

export const runWithCurrentTask = <T>(context: CurrentTaskContext, fn: () => T): T =>
  store.run(context, fn);

export const getCurrentTask = (): CurrentTaskContext | undefined => store.getStore();

/**
 * Exposes the current task to the watchdog worker, which reads it through an inspector
 * `Runtime.evaluate` while the main thread is blocked. Not enumerable, only installed while the
 * watchdog runs.
 */
export const installCurrentTaskAccessor = (): void => {
  Object.defineProperty(globalThis, CURRENT_TASK_ACCESSOR, {
    value: () => store.getStore() ?? null,
    configurable: true,
    enumerable: false,
    writable: false,
  });
};

export const uninstallCurrentTaskAccessor = (): void => {
  delete (globalThis as Record<symbol, unknown>)[CURRENT_TASK_ACCESSOR];
};

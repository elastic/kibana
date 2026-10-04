/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { EventLoopWatchdog } from './watchdog';
export type { EventLoopWatchdogDeps } from './watchdog';

import type { EventLoopWatchdog } from './watchdog';

let activeWatchdog: EventLoopWatchdog | undefined;

/** Registers (or clears) the process-wide watchdog used by task-runner notifications. */
export const setActiveEventLoopWatchdog = (watchdog: EventLoopWatchdog | undefined): void => {
  activeWatchdog = watchdog;
};

/** Announces a task run start to the watchdog. Safe to call unconditionally. */
export const notifyTaskRunStart = (taskId: string, taskType: string): void =>
  activeWatchdog?.notifyTaskRunStart(taskId, taskType);

/** Announces a task run end to the watchdog. Safe to call unconditionally. */
export const notifyTaskRunEnd = (taskId: string): void => activeWatchdog?.notifyTaskRunEnd(taskId);

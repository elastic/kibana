/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BehaviorSubject } from 'rxjs';
import type { ISavedObjectsRepository, Logger } from '@kbn/core/server';
import type { TaskManagerConfig } from '../config';
import type { TaskExecutionControl } from '../saved_objects/schemas/task_execution_control';
export interface TaskExecutionControlState {
  paused: boolean;
  pausedTaskTypes: string[];
}
export type TaskExecutionControlMutator = (current: TaskExecutionControlState) => {
  paused: boolean;
  pausedTaskTypes: string[];
};
interface TaskExecutionControlServiceParams {
  config: TaskManagerConfig['execution_control'];
  savedObjectsRepository: ISavedObjectsRepository;
  logger: Logger;
}
export declare const DEFAULT_EXECUTION_CONTROL_STATE: TaskExecutionControlState;
export declare class TaskExecutionControlService {
  private readonly pollInterval;
  private readonly savedObjectsRepository;
  private readonly logger;
  private readonly state$;
  private stopped;
  private timer;
  private hasLoggedReadError;
  private startPromise;
  private initialized;
  constructor(opts: TaskExecutionControlServiceParams);
  get state(): BehaviorSubject<TaskExecutionControlState>;
  getState(): TaskExecutionControlState;
  /**
   * Whether the initial control-document read has settled. Consumers gate task
   * claiming on this so a node that (re)starts while the cluster is paused does
   * not claim before the persisted pause state is known.
   */
  isInitialized(): boolean;
  /**
   * Performs an initial read (with bounded retries) and starts the periodic
   * poll. Subsequent calls are no-ops. Never rejects: on a persistent read
   * failure it fails open with the default (unpaused) state and a warning, and
   * the periodic poll corrects the state once Elasticsearch is reachable.
   */
  start(): Promise<void>;
  private initialize;
  private scheduleNextPoll;
  private poll;
  /**
   * Reads the persisted execution control state, returning the default
   * (unpaused) state when no document exists. Throws on any other error.
   */
  private readState;
  private applyState;
  private readAttributes;
  /**
   * Reads the persisted state for the status API. Returns default attributes
   * when no document exists.
   */
  read(): Promise<TaskExecutionControl>;
  /**
   * Read-modify-writes the execution control document, retrying on version
   * conflicts so that concurrent pause/resume calls converge.
   */
  update(
    mutator: TaskExecutionControlMutator,
    {
      username,
    }?: {
      username?: string;
    }
  ): Promise<TaskExecutionControl>;
  private getSavedObject;
  stop(): void;
}
export {};

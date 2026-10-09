/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import type { ISavedObjectsRepository, Logger } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { TaskManagerConfig } from '../config';
import { TASK_EXECUTION_CONTROL_SO_ID } from '../constants';
import { TASK_EXECUTION_CONTROL_SO_NAME } from '../saved_objects';
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

export const DEFAULT_EXECUTION_CONTROL_STATE: TaskExecutionControlState = {
  paused: false,
  pausedTaskTypes: [],
};

// Number of times the initial read is retried before failing open on startup.
const MAX_INITIAL_READ_RETRIES = 3;
const INITIAL_READ_RETRY_DELAY_MS = 1000;
// Number of times a read-modify-write is retried on a version conflict.
const MAX_UPDATE_RETRIES = 3;

const toState = (attributes: TaskExecutionControl): TaskExecutionControlState => ({
  paused: attributes.paused,
  pausedTaskTypes: attributes.paused_task_types,
});

const statesAreEqual = (a: TaskExecutionControlState, b: TaskExecutionControlState): boolean =>
  a.paused === b.paused &&
  a.pausedTaskTypes.length === b.pausedTaskTypes.length &&
  [...a.pausedTaskTypes].sort().join(',') === [...b.pausedTaskTypes].sort().join(',');

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class TaskExecutionControlService {
  private readonly pollInterval: number;
  private readonly savedObjectsRepository: ISavedObjectsRepository;
  private readonly logger: Logger;
  private readonly state$ = new BehaviorSubject<TaskExecutionControlState>(
    DEFAULT_EXECUTION_CONTROL_STATE
  );
  private stopped = false;
  private timer: NodeJS.Timeout | undefined;
  private hasLoggedReadError = false;
  private startPromise: Promise<void> | undefined;
  // Whether the initial control-document read has settled. Until it has, the
  // pause state is unknown, so consumers must treat execution as paused.
  private initialized = false;

  constructor(opts: TaskExecutionControlServiceParams) {
    this.pollInterval = opts.config.poll_interval;
    this.savedObjectsRepository = opts.savedObjectsRepository;
    this.logger = opts.logger;
  }

  public get state(): BehaviorSubject<TaskExecutionControlState> {
    return this.state$;
  }

  public getState(): TaskExecutionControlState {
    return this.state$.getValue();
  }

  /**
   * Whether the initial control-document read has settled. Consumers gate task
   * claiming on this so a node that (re)starts while the cluster is paused does
   * not claim before the persisted pause state is known.
   */
  public isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Performs an initial read (with bounded retries) and starts the periodic
   * poll. Subsequent calls are no-ops. Never rejects: on a persistent read
   * failure it fails open with the default (unpaused) state and a warning, and
   * the periodic poll corrects the state once Elasticsearch is reachable.
   */
  public start(): Promise<void> {
    if (!this.startPromise) {
      this.startPromise = this.initialize();
    }
    return this.startPromise;
  }

  private async initialize(): Promise<void> {
    for (let attempt = 1; attempt <= MAX_INITIAL_READ_RETRIES && !this.stopped; attempt++) {
      try {
        this.applyState(await this.readState());
        this.initialized = true;
        this.scheduleNextPoll();
        return;
      } catch (e) {
        if (attempt < MAX_INITIAL_READ_RETRIES) {
          await delay(INITIAL_READ_RETRY_DELAY_MS);
        } else {
          this.logger.warn(
            `Task execution control state could not be read on startup; assuming execution is not paused. Will retry on the next poll. Error: ${e.message}`
          );
        }
      }
    }
    // Fail open: keep the default state and keep polling so we self-correct.
    this.initialized = true;
    this.scheduleNextPoll();
  }

  private scheduleNextPoll() {
    if (this.stopped) {
      return;
    }
    this.timer = setTimeout(() => this.poll(), this.pollInterval);
  }

  private async poll() {
    if (this.stopped) {
      return;
    }
    try {
      this.applyState(await this.readState());
      this.hasLoggedReadError = false;
    } catch (e) {
      // Keep the last-known state: if Elasticsearch is unreachable, claiming
      // fails anyway, and flipping to unpaused on a transient error would
      // defeat the pause. Log only on the transition into an error state.
      if (!this.hasLoggedReadError) {
        this.hasLoggedReadError = true;
        this.logger.warn(
          `Task execution control state could not be refreshed; keeping the last-known state (paused: ${
            this.getState().paused
          }). Error: ${e.message}`
        );
      }
    } finally {
      this.scheduleNextPoll();
    }
  }

  /**
   * Reads the persisted execution control state, returning the default
   * (unpaused) state when no document exists. Throws on any other error.
   */
  private async readState(): Promise<TaskExecutionControlState> {
    const attributes = await this.readAttributes();
    return attributes ? toState(attributes) : DEFAULT_EXECUTION_CONTROL_STATE;
  }

  private applyState(next: TaskExecutionControlState) {
    if (!statesAreEqual(this.getState(), next)) {
      this.state$.next(next);
    }
  }

  private async readAttributes(): Promise<TaskExecutionControl | null> {
    try {
      const so = await this.savedObjectsRepository.get<TaskExecutionControl>(
        TASK_EXECUTION_CONTROL_SO_NAME,
        TASK_EXECUTION_CONTROL_SO_ID
      );
      return so.attributes;
    } catch (e) {
      if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
        return null;
      }
      throw e;
    }
  }

  /**
   * Reads the persisted state for the status API. Returns default attributes
   * when no document exists.
   */
  public async read(): Promise<TaskExecutionControl> {
    const attributes = await this.readAttributes();
    return (
      attributes ?? {
        paused: false,
        paused_task_types: [],
        updated_at: new Date(0).toISOString(),
      }
    );
  }

  /**
   * Read-modify-writes the execution control document, retrying on version
   * conflicts so that concurrent pause/resume calls converge.
   */
  public async update(
    mutator: TaskExecutionControlMutator,
    { username }: { username?: string } = {}
  ): Promise<TaskExecutionControl> {
    let lastError: Error | undefined;
    for (let attempt = 1; attempt <= MAX_UPDATE_RETRIES && !this.stopped; attempt++) {
      try {
        const so = await this.getSavedObject();
        const current: TaskExecutionControlState = so
          ? toState(so.attributes)
          : DEFAULT_EXECUTION_CONTROL_STATE;
        const mutated = mutator(current);
        const next: TaskExecutionControl = {
          paused: mutated.paused,
          paused_task_types: [...new Set(mutated.pausedTaskTypes)],
          updated_at: new Date().toISOString(),
          updated_by: username,
        };

        if (so) {
          await this.savedObjectsRepository.update<TaskExecutionControl>(
            TASK_EXECUTION_CONTROL_SO_NAME,
            TASK_EXECUTION_CONTROL_SO_ID,
            next,
            { version: so.version, refresh: 'wait_for' }
          );
        } else {
          await this.savedObjectsRepository.create<TaskExecutionControl>(
            TASK_EXECUTION_CONTROL_SO_NAME,
            next,
            { id: TASK_EXECUTION_CONTROL_SO_ID, overwrite: false, refresh: 'wait_for' }
          );
        }

        // Reflect the change locally right away; other nodes converge on the next poll.
        this.applyState(toState(next));
        return next;
      } catch (e) {
        lastError = e;
        if (SavedObjectsErrorHelpers.isConflictError(e) && attempt < MAX_UPDATE_RETRIES) {
          continue;
        }
        throw e;
      }
    }
    throw lastError ?? new Error('Task execution control update failed');
  }

  private async getSavedObject() {
    try {
      return await this.savedObjectsRepository.get<TaskExecutionControl>(
        TASK_EXECUTION_CONTROL_SO_NAME,
        TASK_EXECUTION_CONTROL_SO_ID
      );
    } catch (e) {
      if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
        return null;
      }
      throw e;
    }
  }

  public stop() {
    this.stopped = true;
    if (this.timer) {
      clearTimeout(this.timer);
    }
  }
}

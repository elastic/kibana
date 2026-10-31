/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import {
  CASES_OBSERVABLES_SYNC_TASK_ID,
  OBSERVABLES_SYNC_PASS_VERSION,
} from '../../tasks/observables_sync/constants';

/** Where observables are read from. */
export type ObservablesReadSource = 'index' | 'case';

/** How often a node looks for the completion record of the gating sync pass. */
export const OBSERVABLES_STORAGE_MODE_REFRESH_INTERVAL_MS = 60 * 1000;

interface ObservablesStorageModeOptions {
  /** Absent when Task Manager is disabled: no pass can run, so the case field stays the truth. */
  taskManager?: Pick<TaskManagerStartContract, 'get'>;
  /** The `xpack.cases.observables.readSource` setting. */
  configuredReadSource: ObservablesReadSource;
  logger: Logger;
  /** The pass version that gates this release. Defaults to the version the sync task runs. */
  passVersion?: number;
}

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * Tells a node whether the observables index is complete, which is the rule that governs the move from
 * the case field to the index as the source of truth: a node keeps the case field as the truth until it
 * has seen a completed sync pass whose version is at least the pass version of its release, and it
 * never moves back.
 *
 * The completion record lives in the state of the observables sync task. It is read once at start and
 * then once a minute, so a node notices a pass that completed on another node.
 */
export class ObservablesStorageMode {
  private readonly taskManager?: Pick<TaskManagerStartContract, 'get'>;
  private readonly configuredReadSource: ObservablesReadSource;
  private readonly logger: Logger;
  private readonly passVersion: number;
  private indexFirst = false;
  private timer?: ReturnType<typeof setInterval>;
  private refreshing?: Promise<void>;

  constructor({
    taskManager,
    configuredReadSource,
    logger,
    passVersion = OBSERVABLES_SYNC_PASS_VERSION,
  }: ObservablesStorageModeOptions) {
    this.taskManager = taskManager;
    this.configuredReadSource = configuredReadSource;
    this.logger = logger;
    this.passVersion = passVersion;
  }

  /** Reads the completion record now and then keeps reading it once a minute until `stop` is called. */
  public async start(): Promise<void> {
    if (this.timer || !this.taskManager) {
      return;
    }
    this.timer = setInterval(() => {
      void this.refresh();
    }, OBSERVABLES_STORAGE_MODE_REFRESH_INTERVAL_MS);
    await this.refresh();
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  /** True once a sync pass of this release or a later one has completed. It never goes back to false. */
  public isIndexFirst(): boolean {
    return this.indexFirst;
  }

  /**
   * Where reads come from: the index only when it is complete and the setting allows it, otherwise the
   * case field.
   */
  public getReadSource(): ObservablesReadSource {
    return this.indexFirst && this.configuredReadSource === 'index' ? 'index' : 'case';
  }

  /** Looks up the completion record. A failed lookup keeps the current mode and is tried again later. */
  public refresh(): Promise<void> {
    if (this.indexFirst || !this.taskManager) {
      return Promise.resolve();
    }
    // A slow lookup must not pile up behind the interval.
    this.refreshing ??= this.readCompletionRecord(this.taskManager).finally(() => {
      this.refreshing = undefined;
    });
    return this.refreshing;
  }

  private async readCompletionRecord(
    taskManager: Pick<TaskManagerStartContract, 'get'>
  ): Promise<void> {
    try {
      const task = await taskManager.get(CASES_OBSERVABLES_SYNC_TASK_ID);
      const { completedPassVersion } = task.state as { completedPassVersion?: number };

      if (completedPassVersion !== undefined && completedPassVersion >= this.passVersion) {
        this.indexFirst = true;
        this.stop();
        this.logger.info(
          `The observables index is complete: sync pass ${completedPassVersion} has finished and the index is now the source of truth`
        );
      }
    } catch (error) {
      if (SavedObjectsErrorHelpers.isNotFoundError(error as Error)) {
        // The task is created at start, so it can be missing for a moment on a fresh cluster.
        this.logger.debug(`The observables sync task does not exist yet`);
        return;
      }
      this.logger.warn(
        `Could not read the completion record of the observables sync pass, the case field stays the source of truth: ${errorMessage(
          error
        )}`
      );
    }
  }
}

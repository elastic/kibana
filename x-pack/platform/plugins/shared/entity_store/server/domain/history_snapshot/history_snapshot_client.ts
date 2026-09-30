/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import moment from 'moment';
import { entityStoreMetrics } from '../../monitor/metrics';
import type { EntityStoreGlobalStateClient } from '../saved_objects';
import { createIndex, reindex, updateByQueryWithScript } from '../../infra/elasticsearch';
import { getLatestEntitiesIndexName } from '../../../common/domain/entity_index';
import { getErrorMessage } from '../../../common';
import { DEFAULT_HISTORY_SNAPSHOT_RETENTION_DAYS } from '../saved_objects';
import {
  getHistorySnapshotIndexName,
  getLegacySecurityHistorySnapshotIndexName,
} from '../asset_manager/history_snapshot_index';
import { resolveLatestEntitiesIndexName } from '../asset_manager/resolve_entity_store_indices';
import { getHistorySnapshotTaskId } from '../../tasks/config';
import { HISTORY_SNAPSHOT_RESET_SCRIPT } from './constants';
import { deleteExpiredHistorySnapshots } from './expire_history_snapshots';

export type RunHistorySnapshotResult =
  | { ok: true; historySnapshotIndex: string; docCount: number; resetCount: number }
  | { ok: true; skipped: true }
  | { ok: false; error: Error };

export interface RunHistorySnapshotOptions {
  abortSignal?: AbortSignal;
}

export { HISTORY_SNAPSHOT_RESET_SCRIPT } from './constants';

const POLL_INTERVAL_MS = 30 * 1000;
const POLL_MIN_INTERVAL_MS = 5 * 1000;

export interface HistorySnapshotClientDependencies {
  logger: Logger;
  esClient: ElasticsearchClient;
  internalEsClient: ElasticsearchClient;
  namespace: string;
  globalStateClient: EntityStoreGlobalStateClient;
  taskManager: TaskManagerStartContract;
}

export class HistorySnapshotClient {
  private readonly logger: Logger;
  private readonly esClient: ElasticsearchClient;
  private readonly internalEsClient: ElasticsearchClient;
  private readonly namespace: string;
  private readonly globalStateClient: EntityStoreGlobalStateClient;
  private readonly taskManager: TaskManagerStartContract;

  constructor({
    logger,
    esClient,
    internalEsClient,
    namespace,
    globalStateClient,
    taskManager,
  }: HistorySnapshotClientDependencies) {
    this.logger = logger;
    this.esClient = esClient;
    this.internalEsClient = internalEsClient;
    this.namespace = namespace;
    this.globalStateClient = globalStateClient;
    this.taskManager = taskManager;
  }

  public async enable(request: KibanaRequest): Promise<void> {
    const globalState = await this.globalStateClient.findOrThrow();
    const taskId = getHistorySnapshotTaskId(this.namespace);

    // Step 1: Enable the task but do NOT schedule it for immediate execution yet.
    // If runSoon were passed here, a worker could claim the task before step 2 updates
    // the global state to 'started', causing runHistorySnapshot to see the old 'stopped'
    // status and skip the run — pushing the next execution out by a full cadence.
    const enableResult = await this.taskManager.bulkEnable([taskId], false, { request });
    const error = enableResult?.errors?.[0];
    if (error) {
      throw new Error(`Failed to enable history snapshot task: ${error?.error?.message}`);
    }

    if (enableResult.tasks.length === 0) {
      // Task was already enabled, no need to proceed further.
      return;
    }

    // Step 2: Persist 'started' status. If this fails, roll back the task enable so
    // the task-enabled flag and the global state status stay in sync.
    try {
      await this.globalStateClient.update({
        historySnapshot: { ...globalState.historySnapshot, status: 'started' },
      });
    } catch (updateErr) {
      await this.taskManager.bulkDisable([taskId], false, { request }).catch((rollbackErr) => {
        this.logger.warn(
          `History snapshot: failed to roll back task enable after state update failure: ${getErrorMessage(
            rollbackErr
          )}`
        );
      });
      throw new Error(
        `Failed to persist history snapshot started status: ${getErrorMessage(updateErr)}`
      );
    }

    // Step 3: Schedule an immediate run. Non-fatal if this fails — the task is enabled
    // and will execute at its next scheduled cadence.
    await this.taskManager.runSoon(taskId).catch((err) => {
      this.logger.warn(
        `History snapshot enabled but runSoon failed; will run at next cadence: ${getErrorMessage(
          err
        )}`
      );
    });

    this.logger.debug(`Enabled history snapshot task ${taskId}`);
  }

  public async disable(
    request: KibanaRequest,
    options?: { clearHistorySnapshots?: boolean }
  ): Promise<void> {
    const globalState = await this.globalStateClient.findOrThrow();
    const taskId = getHistorySnapshotTaskId(this.namespace);

    const result = await this.taskManager.bulkDisable([taskId], false, { request });
    const error = result?.errors?.[0];
    if (error) {
      throw new Error(`Failed to disable history snapshot task: ${error?.error?.message}`);
    }

    if (result.tasks.length === 0) {
      // Task was already disabled, no need to proceed further.
      return;
    }

    // Persist 'stopped' status. If this fails, roll back the task disable so
    // the task-enabled flag and the global state status stay in sync.
    try {
      await this.globalStateClient.update({
        historySnapshot: { ...globalState.historySnapshot, status: 'stopped' },
      });
    } catch (updateErr) {
      await this.taskManager.bulkEnable([taskId], false, { request }).catch((rollbackErr) => {
        this.logger.warn(
          `History snapshot: failed to roll back task disable after state update failure: ${getErrorMessage(
            rollbackErr
          )}`
        );
      });
      throw new Error(
        `Failed to persist history snapshot stopped status: ${getErrorMessage(updateErr)}`
      );
    }
    this.logger.debug(`Disabled history snapshot task ${taskId}`);

    if (options?.clearHistorySnapshots === true) {
      // Do not block response waiting for indices to finish clearing
      this.clearSnapshotIndices()
        .then((numIndices: number) => {
          if (numIndices === 0) {
            this.logger.info(`No history snapshot indices to delete.`);
          } else {
            this.logger.info(`Deleted ${numIndices} history snapshot indices after disabling`);
          }
        })
        .catch((err) => {
          this.logger.error(`Failed to clear history snapshot indices: ${getErrorMessage(err)}`);
        });
    }
  }

  private async clearSnapshotIndices(): Promise<number> {
    const { deleted } = await deleteExpiredHistorySnapshots({
      esClient: this.internalEsClient,
      namespace: this.namespace,
      logger: this.logger,
    });
    return deleted.length;
  }

  public async runHistorySnapshot(
    options: RunHistorySnapshotOptions = {}
  ): Promise<RunHistorySnapshotResult> {
    const { abortSignal } = options;

    const globalState = await this.globalStateClient.findOrThrow();

    if (globalState.historySnapshot?.status !== 'started') {
      this.logger.debug('History snapshot status is not started, skipping run');
      return { ok: true, skipped: true };
    }

    const timestampNow = moment.utc().toISOString();
    const snapshotDate = moment.utc().toDate();

    let result: RunHistorySnapshotResult;
    try {
      const latestIndex = await resolveLatestEntitiesIndexName(this.esClient, this.namespace);
      const historySnapshotIndex =
        latestIndex === getLatestEntitiesIndexName(this.namespace)
          ? getHistorySnapshotIndexName(this.namespace, snapshotDate)
          : getLegacySecurityHistorySnapshotIndexName(this.namespace, snapshotDate);

      await createIndex(this.esClient, historySnapshotIndex, { throwIfExists: false });

      const reindexStart = Date.now();
      const reindexResult = await reindex(this.esClient, {
        source: { index: latestIndex },
        dest: { index: historySnapshotIndex },
        signal: abortSignal,
        waitForTask: {
          logger: this.logger,
          minTimeout: POLL_MIN_INTERVAL_MS,
          maxTimeout: POLL_INTERVAL_MS,
          forever: true,
        },
      });
      entityStoreMetrics.historySnapshotReindexDurationMs.record(Date.now() - reindexStart, {
        namespace: this.namespace,
      });

      const docCount = reindexResult.total;
      if (docCount === 0) {
        await this.updateGlobalStateOnSuccess();
        entityStoreMetrics.historySnapshotSuccess.add(1, { namespace: this.namespace });
        entityStoreMetrics.historySnapshotDocCount.record(0, { namespace: this.namespace });
        return { ok: true, historySnapshotIndex, docCount: 0, resetCount: 0 };
      }

      const resetStart = Date.now();
      const updateResult = await updateByQueryWithScript(this.esClient, {
        index: latestIndex,
        query: { match_all: {} },
        script: HISTORY_SNAPSHOT_RESET_SCRIPT,
        params: { timestampNow },
        signal: abortSignal,
        waitForTask: {
          logger: this.logger,
          minTimeout: POLL_MIN_INTERVAL_MS,
          maxTimeout: POLL_INTERVAL_MS,
          forever: true,
        },
      });
      entityStoreMetrics.historySnapshotResetDurationMs.record(Date.now() - resetStart, {
        namespace: this.namespace,
      });

      await this.updateGlobalStateOnSuccess();
      entityStoreMetrics.historySnapshotSuccess.add(1, { namespace: this.namespace });
      entityStoreMetrics.historySnapshotDocCount.record(docCount, { namespace: this.namespace });
      result = {
        ok: true,
        historySnapshotIndex,
        docCount,
        resetCount: updateResult.updated,
      };
    } catch (err) {
      const caughtError = err instanceof Error ? err : new Error(String(err));
      this.logger.error(`history snapshot failed: ${caughtError.message}`, { error: caughtError });
      await this.updateGlobalStateOnError(caughtError);
      result = { ok: false, error: new Error('History snapshot failed') };
    } finally {
      try {
        await deleteExpiredHistorySnapshots({
          esClient: this.esClient,
          namespace: this.namespace,
          retentionDays:
            globalState.historySnapshot?.retentionDays ?? DEFAULT_HISTORY_SNAPSHOT_RETENTION_DAYS,
          logger: this.logger,
          abortSignal,
        });
      } catch (cleanupErr) {
        this.logger.error(
          `history snapshot: retention cleanup failed: ${getErrorMessage(cleanupErr)}`
        );
      }
    }

    return result;
  }

  private async updateGlobalStateOnSuccess(): Promise<void> {
    try {
      const current = await this.globalStateClient.findOrThrow();
      await this.globalStateClient.update({
        historySnapshot: {
          ...current.historySnapshot,
          lastExecutionTimestamp: moment.utc().toISOString(),
          lastError: undefined,
        },
      });
    } catch (updateErr) {
      this.logger.error(
        `history snapshot: failed to update global state: ${getErrorMessage(updateErr)}`
      );
    }
  }

  private async updateGlobalStateOnError(error: Error): Promise<void> {
    try {
      const current = await this.globalStateClient.findOrThrow();
      await this.globalStateClient.update({
        historySnapshot: {
          ...current.historySnapshot,
          lastError: {
            message: error.message,
            timestamp: moment.utc().toISOString(),
          },
        },
      });
    } catch (updateErr) {
      this.logger.error(
        `history snapshot: failed to update global state: ${getErrorMessage(updateErr)}`
      );
    }
  }
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import pLimit from 'p-limit';
import moment from 'moment';
import { entityStoreMetrics } from '../../monitor/metrics';
import type {
  EntityStoreGlobalState,
  EntityStoreGlobalStateClient,
  HistorySnapshotStatus,
} from '../saved_objects';
import {
  chunkByUrlLength,
  createIndex,
  reindex,
  updateByQueryWithScript,
} from '../../infra/elasticsearch';
import { getLatestEntitiesIndexName } from '../../../common/domain/entity_index';
import { getErrorMessage } from '../../../common';
import {
  getHistorySnapshotIndexName,
  getLegacySecurityHistorySnapshotIndexName,
} from '../asset_manager/history_snapshot_index';
import {
  resolveHistorySnapshotIndexPatterns,
  resolveLatestEntitiesIndexName,
} from '../asset_manager/resolve_entity_store_indices';
import { getHistorySnapshotTaskId } from '../../tasks/config';
import { HISTORY_SNAPSHOT_RESET_SCRIPT } from './constants';

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

const BATCH_CONCURRENCY_LIMIT = 10;

export interface HistorySnapshotClientDependencies {
  logger: Logger;
  esClient: ElasticsearchClient;
  namespace: string;
  globalStateClient: EntityStoreGlobalStateClient;
  taskManager: TaskManagerStartContract;
}

// Whether to run the history snapshot task immediately upon enabling it.
const HISTORY_SNAPSHOT_TASK_RUN_SOON_ON_ENABLE = true;

export class HistorySnapshotClient {
  private readonly logger: Logger;
  private readonly esClient: ElasticsearchClient;
  private readonly namespace: string;
  private readonly globalStateClient: EntityStoreGlobalStateClient;
  private readonly taskManager: TaskManagerStartContract;

  constructor({
    logger,
    esClient,
    namespace,
    globalStateClient,
    taskManager,
  }: HistorySnapshotClientDependencies) {
    this.logger = logger;
    this.esClient = esClient;
    this.namespace = namespace;
    this.globalStateClient = globalStateClient;
    this.taskManager = taskManager;
  }

  public async enable(request: KibanaRequest): Promise<void> {
    await this.setTaskEnabled(true, request);
  }

  public async disable(
    request: KibanaRequest,
    options?: { clearHistorySnapshots?: boolean }
  ): Promise<void> {
    await this.setTaskEnabled(false, request);
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
    const patterns = await resolveHistorySnapshotIndexPatterns(this.esClient, this.namespace);
    const resolvedPerPattern = await Promise.all(
      patterns.map(async (pattern) => {
        try {
          const { indices } = await this.esClient.indices.resolveIndex({ name: pattern });
          return indices.map((index) => index.name);
        } catch {
          return [];
        }
      })
    );
    const indices = resolvedPerPattern.flat();
    if (indices.length > 0) {
      const limit = pLimit(BATCH_CONCURRENCY_LIMIT);
      await Promise.all(
        chunkByUrlLength(indices).map((chunk) =>
          limit(() => this.esClient.indices.delete({ index: chunk }, { ignore: [404] }))
        )
      );
      this.logger.debug(`Cleared history snapshot indices: ${indices.join(', ')}`);
    }
    return indices.length;
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
    const latestIndex = await resolveLatestEntitiesIndexName(this.esClient, this.namespace);
    const historySnapshotIndex =
      latestIndex === getLatestEntitiesIndexName(this.namespace)
        ? getHistorySnapshotIndexName(this.namespace, snapshotDate)
        : getLegacySecurityHistorySnapshotIndexName(this.namespace, snapshotDate);

    try {
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
        await this.updateGlobalStateOnSuccess(globalState);
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

      await this.updateGlobalStateOnSuccess(globalState);
      entityStoreMetrics.historySnapshotSuccess.add(1, { namespace: this.namespace });
      entityStoreMetrics.historySnapshotDocCount.record(docCount, { namespace: this.namespace });
      return {
        ok: true,
        historySnapshotIndex,
        docCount,
        resetCount: updateResult.updated,
      };
    } catch (err) {
      const caughtError = err instanceof Error ? err : new Error(String(err));
      this.logger.error(`history snapshot failed: ${caughtError.message}`, { error: caughtError });
      await this.updateGlobalStateOnError(globalState, caughtError);
      return { ok: false, error: new Error('History snapshot failed') };
    }
  }

  private async setTaskEnabled(enabled: boolean, request: KibanaRequest): Promise<void> {
    const globalState = await this.globalStateClient.findOrThrow();
    const taskId = getHistorySnapshotTaskId(this.namespace);
    const action = enabled ? 'enable' : 'disable';
    const result = enabled
      ? await this.taskManager.bulkEnable([taskId], HISTORY_SNAPSHOT_TASK_RUN_SOON_ON_ENABLE, {
          request,
        })
      : await this.taskManager.bulkDisable([taskId], false, { request });

    // Check for errors
    const error = result?.errors?.[0];
    if (error) {
      throw new Error(`Failed to ${action} history snapshot task: ${error?.error?.message}`);
    }

    const status: HistorySnapshotStatus = enabled ? 'started' : 'stopped';
    await this.globalStateClient.update({
      historySnapshot: {
        ...globalState.historySnapshot,
        status,
      },
    });
    this.logger.debug(`${enabled ? 'Enabled' : 'Disabled'} history snapshot task ${taskId}`);
  }

  private async updateGlobalStateOnSuccess(globalState: EntityStoreGlobalState): Promise<void> {
    try {
      await this.globalStateClient.update({
        historySnapshot: {
          ...globalState.historySnapshot,
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

  private async updateGlobalStateOnError(
    globalState: EntityStoreGlobalState,
    error: Error
  ): Promise<void> {
    try {
      await this.globalStateClient.update({
        historySnapshot: {
          ...globalState.historySnapshot,
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

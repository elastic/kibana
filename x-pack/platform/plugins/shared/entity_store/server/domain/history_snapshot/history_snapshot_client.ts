/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import moment from 'moment';
import type { ReindexResponse } from '@elastic/elasticsearch/lib/api/types';
import { entityStoreMetrics } from '../../monitor/metrics';
import type { EntityStoreGlobalStateClient } from '../saved_objects';
import {
  cancelTask,
  createIndex,
  deleteIndex,
  pollTaskUntil,
  startReindex,
  toReindexResult,
} from '../../infra/elasticsearch';
import { getLatestEntitiesIndexName } from '../../../common/domain/entity_index';
import { getErrorMessage } from '../../../common';
import { DEFAULT_HISTORY_SNAPSHOT_RETENTION_DAYS } from '../saved_objects';
import {
  getHistorySnapshotIndexName,
  getLegacySecurityHistorySnapshotIndexName,
} from '../asset_manager/history_snapshot_index';
import { resolveLatestEntitiesIndexName } from '../asset_manager/resolve_entity_store_indices';
import { parseDurationToMs } from '../../infra/time';
import { getHistorySnapshotTaskId, TasksConfig } from '../../tasks/config';
import { EntityStoreTaskType } from '../../tasks/constants';
import type { HistorySnapshotState } from '../saved_objects';
import { HISTORY_SNAPSHOT_STAMP_SCRIPT } from './constants';
import { deleteExpiredHistorySnapshots } from './expire_history_snapshots';

/** An unfinished snapshot cycle, kept in task state so the next run can resume it. */
export interface HistorySnapshotRun {
  /** `reset` only appears in runs saved by a version that still reset the latest index. */
  phase: 'reindex' | 'reset';
  esTaskId: string;
  latestIndex: string;
  historySnapshotIndex: string;
  timestampNow: string;
  cycleStartedAt: string;
  phaseStartedAt: string;
  docCount?: number;
}

export type RunHistorySnapshotResult =
  | { ok: true; historySnapshotIndex: string; docCount: number }
  | { ok: true; skipped: true }
  | { ok: true; inProgress: true; run: HistorySnapshotRun }
  | { ok: false; error: Error };

export interface RunHistorySnapshotOptions {
  abortSignal?: AbortSignal;
  /** Unfinished cycle returned by a previous call. */
  run?: HistorySnapshotRun;
  /** Epoch milliseconds after which the call stops waiting and returns `inProgress`. */
  deadline?: number;
}

export { HISTORY_SNAPSHOT_STAMP_SCRIPT } from './constants';

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

  public async updateConfig(
    request: KibanaRequest,
    params: Partial<Pick<HistorySnapshotState, 'frequency' | 'retentionDays'>>
  ): Promise<void> {
    const historySnapshot: Partial<Pick<HistorySnapshotState, 'frequency' | 'retentionDays'>> = {};
    if (params.frequency != null) {
      historySnapshot.frequency = params.frequency;
    }
    if (params.retentionDays != null) {
      historySnapshot.retentionDays = params.retentionDays;
    }
    if (Object.keys(historySnapshot).length === 0) {
      return;
    }

    await this.globalStateClient.update({ historySnapshot });

    if (params.frequency != null) {
      await this.reschedule(request, params.frequency);
    }
  }

  private async reschedule(request: KibanaRequest, frequency: string): Promise<void> {
    const taskId = getHistorySnapshotTaskId(this.namespace);
    try {
      // `runAt` applies only when this call creates the task. An existing task has its
      // interval replaced, and Task Manager recomputes the next run from that interval.
      const firstRunAt = new Date(Date.now() + parseDurationToMs(frequency));
      await this.taskManager.ensureScheduled(
        {
          id: taskId,
          taskType: TasksConfig[EntityStoreTaskType.enum.historySnapshot].type,
          runAt: firstRunAt,
          schedule: { interval: frequency },
          state: { namespace: this.namespace },
          params: {},
        },
        { request }
      );
      this.logger.info(`Rescheduled history snapshot task ${taskId} with interval ${frequency}`);
    } catch (err) {
      const message = getErrorMessage(err);
      this.logger.error(`Failed to reschedule history snapshot task: ${message}`);
      throw err;
    }
    await this.resumePausedCycle(taskId);
  }

  /**
   * A new interval replaces the short continuation delay of a cycle that is paused between runs.
   * Run the task now so the cycle is not postponed by up to the new interval.
   */
  private async resumePausedCycle(taskId: string): Promise<void> {
    try {
      const task = await this.taskManager.get(taskId);
      if (task.state?.run) {
        await this.taskManager.runSoon(taskId);
      }
    } catch (err) {
      this.logger.warn(
        `History snapshot: failed to resume the paused cycle after rescheduling: ${getErrorMessage(
          err
        )}`
      );
    }
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

    await this.cancelSavedRun(taskId, request);

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

  private async cancelSavedRun(taskId: string, request: KibanaRequest): Promise<void> {
    let savedRun: HistorySnapshotRun | undefined;
    try {
      await this.taskManager.bulkUpdateState(
        [taskId],
        ({ run, ...state }) => {
          savedRun = run as HistorySnapshotRun | undefined;
          return state;
        },
        { request }
      );
    } catch (err) {
      this.logger.warn(
        `History snapshot: failed to clear the unfinished run from task state: ${getErrorMessage(
          err
        )}`
      );
      return;
    }
    if (savedRun) {
      await this.cancelRun(savedRun);
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

  /**
   * Advances the snapshot cycle: copy latest into a dated history index, stamping each copy with
   * the snapshot time. The latest index is not modified.
   *
   * Pass `deadline` to stop waiting at that time. The result is then `inProgress` with the
   * Elasticsearch task to resume from, and the caller passes it back as `run` on the next call.
   */
  public async runHistorySnapshot(
    options: RunHistorySnapshotOptions = {}
  ): Promise<RunHistorySnapshotResult> {
    const { abortSignal, deadline } = options;

    const globalState = await this.globalStateClient.findOrThrow();

    if (globalState.historySnapshot?.status !== 'started') {
      if (options.run) {
        await this.cancelRun(options.run);
      }
      this.logger.debug('History snapshot status is not started, skipping run');
      return { ok: true, skipped: true };
    }

    let run = options.run;
    let result: RunHistorySnapshotResult;
    try {
      if (run) {
        this.logger.info(
          `Resuming history snapshot ${run.phase} into ${run.historySnapshotIndex} (task ${run.esTaskId})`
        );
      } else {
        run = await this.startCycle(abortSignal);
      }
      result = await this.advance(run, (current) => (run = current), deadline, abortSignal);
    } catch (err) {
      const caughtError = err instanceof Error ? err : new Error(String(err));
      if (abortSignal?.aborted && run) {
        // Task Manager does not keep the state of an aborted run, so nothing would resume this task.
        await this.cancelRun(run);
      }
      this.logger.error(`history snapshot failed: ${caughtError.message}`, { error: caughtError });
      await this.updateGlobalStateOnError(caughtError);
      result = { ok: false, error: new Error('History snapshot failed') };
    }

    if ('inProgress' in result) {
      return result;
    }

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

    return result;
  }

  /**
   * Cancels the Elasticsearch task of an unfinished snapshot cycle.
   */
  public async cancelRun(run: HistorySnapshotRun): Promise<void> {
    this.logger.info(`Cancelling history snapshot ${run.phase} task ${run.esTaskId}`);
    await cancelTask({
      esClient: this.internalEsClient,
      taskId: run.esTaskId,
      logger: this.logger,
    });
  }

  private async startCycle(abortSignal?: AbortSignal): Promise<HistorySnapshotRun> {
    const now = moment.utc();
    const latestIndex = await resolveLatestEntitiesIndexName(this.esClient, this.namespace);
    const historySnapshotIndex =
      latestIndex === getLatestEntitiesIndexName(this.namespace)
        ? getHistorySnapshotIndexName(this.namespace, now.toDate())
        : getLegacySecurityHistorySnapshotIndexName(this.namespace, now.toDate());

    await createIndex(this.esClient, historySnapshotIndex, { throwIfExists: false });

    return this.startCopy(
      {
        phase: 'reindex',
        latestIndex,
        historySnapshotIndex,
        timestampNow: now.toISOString(),
        cycleStartedAt: now.toISOString(),
      },
      abortSignal
    );
  }

  private async startCopy(
    run: Omit<HistorySnapshotRun, 'esTaskId' | 'phaseStartedAt'>,
    abortSignal?: AbortSignal
  ): Promise<HistorySnapshotRun> {
    const esTaskId = await startReindex(this.esClient, {
      source: { index: run.latestIndex },
      dest: { index: run.historySnapshotIndex },
      script: {
        source: HISTORY_SNAPSHOT_STAMP_SCRIPT,
        params: { snapshotTimestamp: run.timestampNow },
      },
      signal: abortSignal,
    });
    this.logger.debug(`Started history snapshot reindex task ${esTaskId}`);
    return { ...run, esTaskId, phaseStartedAt: moment.utc().toISOString() };
  }

  /**
   * Starts the copy again after its Elasticsearch task was lost. The new reindex reads a fresh view
   * of latest, so the partial destination can hold documents that were deleted since, and the old
   * snapshot time would stamp new documents with an earlier time. Start over with an empty
   * destination and a new snapshot time; `cycleStartedAt` keeps the schedule anchor.
   */
  private async restartCopy(
    run: HistorySnapshotRun,
    abortSignal?: AbortSignal
  ): Promise<HistorySnapshotRun> {
    await deleteIndex(this.esClient, run.historySnapshotIndex);
    await createIndex(this.esClient, run.historySnapshotIndex, { throwIfExists: false });
    return this.startCopy({ ...run, timestampNow: moment.utc().toISOString() }, abortSignal);
  }

  private async advance(
    initialRun: HistorySnapshotRun,
    onRunChange: (run: HistorySnapshotRun) => void,
    deadline: number | undefined,
    abortSignal: AbortSignal | undefined
  ): Promise<RunHistorySnapshotResult> {
    let run = initialRun;

    if (run.phase === 'reset') {
      // Saved by a version that still reset the latest index. The copy already finished.
      await this.cancelRun(run);
      return this.completeCycle(run.historySnapshotIndex, run.docCount ?? 0);
    }

    // A disable that arrives during the run cannot see an Elasticsearch task that is not in the task
    // state yet, so check before each step that starts or keeps one.
    const stopIfDisabled = async (): Promise<RunHistorySnapshotResult | undefined> => {
      const { historySnapshot } = await this.globalStateClient.findOrThrow();
      if (historySnapshot?.status === 'started') {
        return undefined;
      }
      this.logger.info('History snapshot was disabled during the run, cancelling it');
      await this.cancelRun(run);
      return { ok: true, skipped: true };
    };

    while (true) {
      const poll = await pollTaskUntil<ReindexResponse>({
        esClient: this.esClient,
        taskId: run.esTaskId,
        deadline,
        pollIntervalMs: POLL_INTERVAL_MS,
        minPollIntervalMs: POLL_MIN_INTERVAL_MS,
        logger: this.logger,
        signal: abortSignal,
      });

      if (poll.status === 'pending') {
        const stopped = await stopIfDisabled();
        return stopped ?? { ok: true, inProgress: true, run };
      }

      if (poll.status === 'missing') {
        const stopped = await stopIfDisabled();
        if (stopped) return stopped;
        this.logger.warn(
          `History snapshot reindex task ${run.esTaskId} no longer exists; starting the copy again from an empty index`
        );
        run = await this.restartCopy(run, abortSignal);
        onRunChange(run);
        continue;
      }

      const { canceled } = poll.response as { canceled?: string };
      if (canceled) {
        throw new Error(`History snapshot reindex task ${run.esTaskId} was cancelled: ${canceled}`);
      }

      entityStoreMetrics.historySnapshotReindexDurationMs.record(
        Date.now() - Date.parse(run.phaseStartedAt),
        { namespace: this.namespace }
      );
      return this.completeCycle(run.historySnapshotIndex, toReindexResult(poll.response).total);
    }
  }

  private async completeCycle(
    historySnapshotIndex: string,
    docCount: number
  ): Promise<RunHistorySnapshotResult> {
    await this.updateGlobalStateOnSuccess();
    entityStoreMetrics.historySnapshotSuccess.add(1, { namespace: this.namespace });
    entityStoreMetrics.historySnapshotDocCount.record(docCount, { namespace: this.namespace });
    return { ok: true, historySnapshotIndex, docCount };
  }

  private async updateGlobalStateOnSuccess(): Promise<void> {
    try {
      // Write only the fields this method changes. Spreading the full current state would
      // snapshot frequency/retentionDays at read time; a conflict retry would then replay
      // those stale values over a concurrent config update.
      await this.globalStateClient.update({
        historySnapshot: {
          lastExecutionTimestamp: moment.utc().toISOString(),
          lastError: null,
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
      // Write only the fields this method changes — same reasoning as updateGlobalStateOnSuccess.
      await this.globalStateClient.update({
        historySnapshot: {
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

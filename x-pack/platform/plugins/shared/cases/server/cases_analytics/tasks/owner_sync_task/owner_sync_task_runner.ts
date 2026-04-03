/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Per-owner analytics sync task runner.
 *
 * Architecture overview
 * ─────────────────────
 *
 *  Kibana Task Manager schedules exactly THREE tasks (one per owner type):
 *
 *    ┌─────────────────────────────────────────────────────────────────────┐
 *    │  OwnerSyncTask (securitySolution)  — runs every 5 min               │
 *    │  OwnerSyncTask (observability)     — runs every 5 min               │
 *    │  OwnerSyncTask (cases)             — runs every 5 min               │
 *    └─────────────────────────────────────────────────────────────────────┘
 *
 *  Each task handles ALL analytics-enabled spaces for its owner in a single
 *  run.  Per-space state (consecutive empty runs, reindex task IDs, …) is
 *  stored in the task-manager state blob so it survives across runs.
 *
 * Run phases (per owner task)
 * ───────────────────────────
 *
 *  1. QUERY  – fetch all (owner, space) pairs with analytics_enabled = true
 *  2. IDLE   – skip spaces whose nextSyncAt is still in the future
 *  3. STATUS – poll ES for the status of any in-flight reindex tasks;
 *              count ongoing tasks toward the concurrency cap
 *  4. MSEARCH – batch-check (500 spaces × 2 sync types per call) whether any
 *               new source documents exist since the last sync attempt
 *  5. FAN-OUT – for each space with new docs:
 *               • reset consecutiveEmptyRuns
 *               • start async _reindex (if ongoingCount < cap)
 *             – for each space with no new docs AND no ongoing reindexes:
 *               • increment consecutiveEmptyRuns
 *               • if >= IDLE_THRESHOLD → mark idle (nextSyncAt = +30 min)
 *               • update configure SO: analytics_sync_status = 'idle'
 *  6. PERSIST – update configure SOs (analytics_last_sync_at when a reindex
 *               completed; analytics_sync_status = 'active' | 'idle')
 *
 * Idle backoff logic
 * ──────────────────
 *
 *  active → idle:  5 consecutive runs with zero new source docs AND no
 *                  in-flight reindex ⇒ nextSyncAt = now + 30 min
 *  idle → active:  when nextSyncAt is past, the space runs again; if new
 *                  docs are found, consecutiveEmptyRuns resets to 0
 *
 * Concurrency cap
 * ───────────────
 *
 *  At most `analyticsConfig.index.reindexConcurrency` ES _reindex operations
 *  run concurrently across ALL spaces × ALL sync types.  The cap counts
 *  both reindexes started in previous runs (still RUNNING in ES) and those
 *  started in the current run.
 *
 *  Serverless: hardcoded to 1 (min/max 1 in config schema).
 *  Traditional: configurable, default 3, max 10.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  TaskErrorSource,
  createTaskRunError,
  throwRetryableError,
  throwUnrecoverableError,
} from '@kbn/task-manager-plugin/server';
import type { Logger } from '@kbn/logging';
import type { ConcreteTaskInstance } from '@kbn/task-manager-plugin/server';
import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import type { CancellableTask } from '@kbn/task-manager-plugin/server/task';
import type { MsearchRequestItem, MsearchResponseItem } from '@elastic/elasticsearch/lib/api/types';
import { isRetryableEsClientError } from '@kbn/core-elasticsearch-server-utils';
import type { Owner } from '../../../../common/constants/types';
import { CASE_CONFIGURE_SAVED_OBJECT } from '../../../../common/constants';
import type { ConfigType } from '../../../config';
import {
  type CAISyncType,
  CAISyncTypes,
  SYNCHRONIZATION_QUERIES_DICTIONARY,
} from '../../constants';
import { destinationIndexBySyncType, sourceIndexBySyncType } from '../../constants';
import { getSpacesWithAnalyticsEnabled } from '../../utils';
import { getIndicesForOwnerAndSpace } from '../..';
import type { ConfigurationPersistedAttributes } from '../../../common/types/configure';

/** Consecutive empty runs before a space enters idle mode. */
const IDLE_THRESHOLD = 5;
/** Duration (ms) of the idle backoff window. */
const IDLE_INTERVAL_MS = 30 * 60 * 1_000; // 30 min
/** Default lookback when there is no previous sync attempt (ms). */
const LOOKBACK_WINDOW_MS = 5 * 60 * 1_000; // 5 min
/** Maximum number of spaces per msearch call (2 sub-queries per space). */
const MSEARCH_CHUNK_SIZE = 500;

// ─── State types ─────────────────────────────────────────────────────────────

interface SyncSubTaskState {
  /** ES async reindex task ID (undefined once completed or failed). */
  esReindexTaskId?: string;
  /** ISO timestamp of the last successfully completed reindex cycle. */
  lastSyncSuccess?: string;
  /** ISO timestamp of the last reindex start attempt. */
  lastSyncAttempt?: string;
}

interface SpaceSyncState {
  /** Number of consecutive task runs that produced zero new source docs. */
  consecutiveEmptyRuns: number;
  /**
   * ISO timestamp after which this space is eligible for another sync run.
   * Present only when the space is in idle mode.
   */
  nextSyncAt?: string;
  /** Per-sync-type sub-task state. */
  syncTasks: Partial<Record<CAISyncType, SyncSubTaskState>>;
}

// Extending Record<string, unknown> so the type is compatible with the
// Task Manager SuccessfulRunResult.state constraint.
export interface OwnerSyncTaskState extends Record<string, unknown> {
  spaceStates: Record<string, SpaceSyncState>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function defaultSpaceState(): SpaceSyncState {
  return { consecutiveEmptyRuns: 0, syncTasks: {} };
}

// ─── Task runner ─────────────────────────────────────────────────────────────

interface OwnerSyncTaskRunnerConstructorParams {
  taskInstance: ConcreteTaskInstance;
  getESClient: () => Promise<ElasticsearchClient>;
  getUnsecureSavedObjectsClient: () => Promise<SavedObjectsClientContract>;
  logger: Logger;
  analyticsConfig: ConfigType['analytics'];
}

export class OwnerSyncTaskRunner implements CancellableTask {
  private readonly owner: Owner;
  private readonly previousState: OwnerSyncTaskState;
  private readonly getESClient: () => Promise<ElasticsearchClient>;
  private readonly getUnsecureSavedObjectsClient: () => Promise<SavedObjectsClientContract>;
  private readonly logger: Logger;
  private readonly analyticsConfig: ConfigType['analytics'];

  constructor({
    taskInstance,
    getESClient,
    getUnsecureSavedObjectsClient,
    logger,
    analyticsConfig,
  }: OwnerSyncTaskRunnerConstructorParams) {
    this.owner = taskInstance.params.owner as Owner;
    this.previousState = (taskInstance.state as OwnerSyncTaskState) ?? { spaceStates: {} };
    this.getESClient = getESClient;
    this.getUnsecureSavedObjectsClient = getUnsecureSavedObjectsClient;
    this.logger = logger;
    this.analyticsConfig = analyticsConfig;
  }

  // ── Public CancellableTask interface ───────────────────────────────────────

  public async run() {
    const executionId = uuidv4();
    const startMs = Date.now();

    if (!this.analyticsConfig.index.enabled) {
      this.logDebug('Analytics index is disabled, skipping owner sync task.', executionId);
      return { state: this.previousState };
    }

    this.logger.info(`[owner-sync-task][${this.owner}] Starting owner sync run`, {
      owner: this.owner,
      executionId,
      tags: ['cai-owner-sync', `cai-owner-sync-${this.owner}`],
    });

    try {
      const [esClient, soClient] = await Promise.all([
        this.getESClient(),
        this.getUnsecureSavedObjectsClient(),
      ]);

      // ── Phase 1: Discover enabled spaces for this owner ──────────────────
      const allEnabledPairs = await getSpacesWithAnalyticsEnabled(soClient);
      const enabledSpaces = allEnabledPairs
        .filter((p) => p.owner === this.owner)
        .map((p) => p.spaceId);

      this.logDebug(`Found ${enabledSpaces.length} analytics-enabled spaces.`, executionId);

      // Build working state — carry over previous, prune removed spaces
      const spaceStates: Record<string, SpaceSyncState> = {};
      for (const spaceId of enabledSpaces) {
        spaceStates[spaceId] = this.previousState.spaceStates[spaceId] ?? defaultSpaceState();
      }

      // ── Phase 2: Partition into idle / runable ────────────────────────────
      //
      // Three buckets:
      //   runableSpaces     — never-idle; processed fully this run
      //   expiredIdleSpaces — idle window elapsed; msearch is checked but the space
      //                       only resumes if new docs exist (idle is never exited
      //                       purely on a timer — only activity wakes a space up)
      //   waitingIdleSpaces — idle window still open; skipped entirely this run
      const now = new Date();
      const waitingIdleSpaces: string[] = [];
      const expiredIdleSpaces: string[] = [];
      const runableSpaces: string[] = [];

      for (const spaceId of enabledSpaces) {
        const state = spaceStates[spaceId];
        if (!state.nextSyncAt) {
          runableSpaces.push(spaceId);
        } else if (new Date(state.nextSyncAt) > now) {
          waitingIdleSpaces.push(spaceId);
        } else {
          // Idle window elapsed — check for new docs before deciding whether to resume
          expiredIdleSpaces.push(spaceId);
        }
      }

      this.logDebug(
        `Partition: ${runableSpaces.length} runable, ` +
          `${expiredIdleSpaces.length} idle (checking docs), ` +
          `${waitingIdleSpaces.length} idle (waiting).`,
        executionId
      );

      if (runableSpaces.length === 0 && expiredIdleSpaces.length === 0) {
        this.logDebug('All spaces idle or waiting — skipping run.', executionId);
        return { state: { spaceStates } };
      }

      // ── Phase 3: Check status of in-flight ES reindex tasks ───────────────
      let ongoingCount = 0;
      // Spaces where a previously-started reindex completed this run; used in
      // Phase 6 to write analytics_last_sync_at even when no new reindex starts.
      const spacesWithCompletedReindex = new Set<string>();
      for (const spaceId of runableSpaces) {
        const spaceState = spaceStates[spaceId];
        for (const syncType of CAISyncTypes) {
          const sub = spaceState.syncTasks[syncType];
          if (sub?.esReindexTaskId) {
            const status = await this.getReindexStatus(esClient, sub.esReindexTaskId, executionId);
            if (status === ReindexStatus.RUNNING) {
              ongoingCount++;
              this.logDebug(
                `[${spaceId}][${syncType}] Reindex task ${sub.esReindexTaskId} still running.`,
                executionId
              );
            } else if (status === ReindexStatus.COMPLETED) {
              this.logDebug(
                `[${spaceId}][${syncType}] Reindex task ${sub.esReindexTaskId} completed.`,
                executionId
              );
              sub.lastSyncSuccess = sub.lastSyncAttempt;
              sub.esReindexTaskId = undefined;
              spacesWithCompletedReindex.add(spaceId);
            } else {
              // FAILED or MISSING — clear so we retry next run
              this.logger.warn(
                `[owner-sync-task][${this.owner}][${spaceId}][${syncType}] ` +
                  `Reindex task ${sub.esReindexTaskId} failed or not found — clearing for retry next run.`,
                {
                  owner: this.owner,
                  spaceId,
                  syncType,
                  executionId,
                  esReindexTaskId: sub.esReindexTaskId,
                  tags: ['cai-owner-sync', `cai-owner-sync-${this.owner}`],
                }
              );
              sub.esReindexTaskId = undefined;
            }
            spaceState.syncTasks[syncType] = sub;
          }
        }
      }

      this.logDebug(`In-flight reindex tasks: ${ongoingCount} running.`, executionId);

      // ── Phase 4: msearch — detect new source docs per (space, syncType) ───
      // Include expired-idle spaces so we can decide whether to resume them.
      const spaceHasNewDocs = await this.batchCheckForNewDocs(
        esClient,
        [...runableSpaces, ...expiredIdleSpaces],
        spaceStates,
        executionId
      );

      // ── Phase 4b: Resolve expired-idle spaces ─────────────────────────────
      // Only promote to runable when new docs exist; otherwise extend the idle
      // window so the space stays idle until something actually changes.
      this.resolveExpiredIdleSpaces(
        expiredIdleSpaces,
        spaceStates,
        spaceHasNewDocs,
        now,
        runableSpaces,
        executionId
      );

      // ── Phase 5: Fan-out — start new reindexes / update idle counters ─────
      const spacesWithSuccessfulSync = await this.fanOutReindexes(
        esClient,
        runableSpaces,
        spaceHasNewDocs,
        spaceStates,
        now,
        ongoingCount,
        executionId
      );

      // ── Phase 6: Persist configure SO updates (fire-and-forget) ──────────
      this.updateConfigureSOs(
        soClient,
        spaceStates,
        now,
        spacesWithSuccessfulSync,
        spacesWithCompletedReindex
      ).catch((err: Error) => {
        this.logger.warn(`[owner-sync-task][${this.owner}] Failed to update configure SOs`, {
          owner: this.owner,
          executionId,
          error: err,
          tags: ['cai-owner-sync', `cai-owner-sync-${this.owner}`],
        });
      });

      this.logger.info(`[owner-sync-task][${this.owner}] Owner sync run complete`, {
        owner: this.owner,
        executionId,
        enabledSpaces: enabledSpaces.length,
        runableSpaces: runableSpaces.length,
        reindexesStarted: spacesWithSuccessfulSync.length,
        ongoingReindexes: ongoingCount,
        durationMs: Date.now() - startMs,
        tags: ['cai-owner-sync', `cai-owner-sync-${this.owner}`],
      });

      return { state: { spaceStates } };
    } catch (e) {
      if (isRetryableEsClientError(e)) {
        this.logger.warn(`[owner-sync-task][${this.owner}] Transient ES error — will retry`, {
          owner: this.owner,
          executionId,
          error: e,
          tags: ['cai-owner-sync', 'cai-owner-sync-error', `cai-owner-sync-${this.owner}`],
        });
        throwRetryableError(createTaskRunError(e, TaskErrorSource.FRAMEWORK), true);
      }
      this.logger.error(`[owner-sync-task][${this.owner}] Unrecoverable sync failure`, {
        owner: this.owner,
        executionId,
        error: e,
        tags: ['cai-owner-sync', 'cai-owner-sync-error', `cai-owner-sync-${this.owner}`],
      });
      throwUnrecoverableError(createTaskRunError(e, TaskErrorSource.FRAMEWORK));
      // unreachable — throwUnrecoverableError always throws
      return undefined;
    }
  }

  public async cancel() {
    this.logger.debug(`[owner-sync-task][${this.owner}] Cancelling owner sync task.`, {
      owner: this.owner,
      tags: ['cai-owner-sync', `cai-owner-sync-${this.owner}`],
    });
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * For each space whose idle window just elapsed, check whether new docs were found.
   * Spaces with new docs are promoted to runable; spaces without docs have their idle
   * window extended — they never leave idle mode purely because of time.
   */
  private resolveExpiredIdleSpaces(
    expiredIdleSpaces: string[],
    spaceStates: Record<string, SpaceSyncState>,
    spaceHasNewDocs: Record<string, boolean>,
    now: Date,
    runableSpaces: string[],
    executionId: string
  ): void {
    for (const spaceId of expiredIdleSpaces) {
      if (spaceHasNewDocs[spaceId]) {
        delete spaceStates[spaceId].nextSyncAt;
        spaceStates[spaceId].consecutiveEmptyRuns = 0;
        runableSpaces.push(spaceId);
        this.logDebug(`[${spaceId}] New docs detected while idle — resuming sync.`, executionId);
      } else {
        spaceStates[spaceId].nextSyncAt = new Date(now.getTime() + IDLE_INTERVAL_MS).toISOString();
        this.logDebug(
          `[${spaceId}] Still idle, no new docs. Next check at ${spaceStates[spaceId].nextSyncAt}.`,
          executionId
        );
      }
    }
  }

  /**
   * Phase 5: for each runable space, start new reindexes or advance idle counters.
   * Returns the list of spaces for which a reindex was successfully started this run.
   *
   * Index-existence is pre-fetched with a single wildcard GET before entering the
   * loop to avoid an O(N) series of sequential indices.exists calls at scale.
   */
  private async fanOutReindexes(
    esClient: ElasticsearchClient,
    runableSpaces: string[],
    spaceHasNewDocs: Record<string, boolean>,
    spaceStates: Record<string, SpaceSyncState>,
    now: Date,
    ongoingCount: number,
    executionId: string
  ): Promise<string[]> {
    const concurrencyCap = this.analyticsConfig.index.reindexConcurrency;
    const spacesWithSuccessfulSync: string[] = [];
    // Local copy so we can increment without mutating the parameter (no-param-reassign).
    let runningCount = ongoingCount;

    // ── Pre-fetch all existing analytics indices in one round-trip ────────────
    // This replaces the per-space await esClient.indices.exists() that would
    // serialise O(N) ES calls inside the loop below.
    const existingIndicesResponse = await esClient.indices.get({
      index: '.internal.cases-analytics*',
      allow_no_indices: true,
      ignore_unavailable: true,
    });
    const existingIndexNames = new Set(Object.keys(existingIndicesResponse));

    for (const spaceId of runableSpaces) {
      const spaceState = spaceStates[spaceId];
      const hasNewDocs = spaceHasNewDocs[spaceId] ?? false;
      const hasOngoing = CAISyncTypes.some(
        (st) => spaceState.syncTasks[st]?.esReindexTaskId !== undefined
      );

      if (!hasNewDocs && !hasOngoing) {
        // Nothing to do this run — track toward idle
        spaceState.consecutiveEmptyRuns++;
        this.logDebug(
          `[${spaceId}] No new docs. Consecutive empty runs: ${spaceState.consecutiveEmptyRuns}.`,
          executionId
        );

        if (spaceState.consecutiveEmptyRuns >= IDLE_THRESHOLD) {
          spaceState.nextSyncAt = new Date(now.getTime() + IDLE_INTERVAL_MS).toISOString();
          // Reset counter so re-entry into idle after the backoff window produces one clean
          // log line rather than an ever-growing "after N consecutive empty runs" message.
          spaceState.consecutiveEmptyRuns = 0;
          this.logger.info(
            `[owner-sync-task][${this.owner}][${spaceId}] Idle mode: no activity detected. ` +
              `Next sync at ${spaceState.nextSyncAt}.`,
            {
              owner: this.owner,
              spaceId,
              executionId,
              nextSyncAt: spaceState.nextSyncAt,
              tags: ['cai-owner-sync', `cai-owner-sync-${this.owner}`],
            }
          );
        }
      } else {
        // Has new docs (or an ongoing reindex from a previous run) — stay active
        if (hasNewDocs) {
          spaceState.consecutiveEmptyRuns = 0;
        }

        // Check whether all destination indices exist for this space (uses pre-fetched set)
        const indices = getIndicesForOwnerAndSpace(spaceId, this.owner);
        const indicesExist = indices.every((idx) => existingIndexNames.has(idx));
        if (!indicesExist) {
          this.logDebug(
            `[${spaceId}] Destination index missing, skipping until creation.`,
            executionId
          );
        } else {
          // Start new reindexes for sync types that don't already have a running task
          for (const syncType of CAISyncTypes) {
            const existingSub: SyncSubTaskState = spaceState.syncTasks[syncType] ?? {};

            if (!existingSub.esReindexTaskId) {
              if (runningCount < concurrencyCap) {
                const taskId = await this.startReindex(
                  esClient,
                  spaceId,
                  syncType,
                  existingSub,
                  executionId
                );
                if (taskId) {
                  spaceState.syncTasks[syncType] = {
                    ...(spaceState.syncTasks[syncType] ?? {}),
                    lastSyncAttempt: now.toISOString(),
                    esReindexTaskId: String(taskId),
                  };
                  runningCount++;
                  spacesWithSuccessfulSync.push(spaceId);
                }
              } else {
                this.logDebug(
                  `[${spaceId}][${syncType}] Concurrency cap (${concurrencyCap}) reached — deferring.`,
                  executionId
                );
              }
            }
          }
        }
      }
    }

    return spacesWithSuccessfulSync;
  }

  /**
   * Check the status of an existing ES reindex task.
   */
  private async getReindexStatus(
    esClient: ElasticsearchClient,
    taskId: string,
    executionId: string
  ): Promise<ReindexStatus> {
    try {
      const response = await esClient.tasks.get({ task_id: taskId });
      if (!response.completed) return ReindexStatus.RUNNING;
      if (response.response?.failures?.length || response.error) return ReindexStatus.FAILED;
      return ReindexStatus.COMPLETED;
    } catch (e) {
      // Task not found (e.g. ES restarted) — treat as failed so we retry
      this.logDebug(
        `Reindex task ${taskId} not found in ES (may have been cleared after restart) — treating as failed.`,
        executionId
      );
      return ReindexStatus.FAILED;
    }
  }

  /**
   * Batch-check for new source documents using msearch.
   * Chunks at MSEARCH_CHUNK_SIZE spaces per call to avoid overwhelming ES.
   *
   * Returns a map from spaceId → true if any syncType has new docs.
   */
  private async batchCheckForNewDocs(
    esClient: ElasticsearchClient,
    spaceIds: string[],
    spaceStates: Record<string, SpaceSyncState>,
    executionId: string
  ): Promise<Record<string, boolean>> {
    const result: Record<string, boolean> = {};

    for (let i = 0; i < spaceIds.length; i += MSEARCH_CHUNK_SIZE) {
      const chunk = spaceIds.slice(i, i + MSEARCH_CHUNK_SIZE);
      const chunkResult = await this.msearchChunk(esClient, chunk, spaceStates, executionId);
      Object.assign(result, chunkResult);
    }

    return result;
  }

  /**
   * Execute a single msearch call for up to MSEARCH_CHUNK_SIZE spaces.
   * Emits 2 sub-queries per space (one per CAISyncType).
   *
   * Each sub-query uses `size: 0` and `track_total_hits: 1` to short-circuit
   * counting at the first matching document (cheapest possible existence check).
   */
  private async msearchChunk(
    esClient: ElasticsearchClient,
    spaceIds: string[],
    spaceStates: Record<string, SpaceSyncState>,
    executionId: string
  ): Promise<Record<string, boolean>> {
    // Build flat array: [header, body, header, body, ...]
    const searches: Array<MsearchRequestItem> = [];
    // Maintain ordered list of (spaceId, syncType) for response parsing
    const order: Array<{ spaceId: string; syncType: CAISyncType }> = [];

    for (const spaceId of spaceIds) {
      for (const syncType of CAISyncTypes) {
        const sourceIndex = sourceIndexBySyncType(syncType);
        const sub = spaceStates[spaceId]?.syncTasks[syncType];
        const since = sub?.lastSyncAttempt
          ? new Date(sub.lastSyncAttempt)
          : new Date(Date.now() - LOOKBACK_WINDOW_MS);

        searches.push({ index: sourceIndex });
        searches.push({
          query: SYNCHRONIZATION_QUERIES_DICTIONARY[syncType](since, spaceId, this.owner),
          size: 0,
          track_total_hits: 1,
        });
        order.push({ spaceId, syncType });
      }
    }

    const { responses } = await esClient.msearch<unknown>({ searches });

    const result: Record<string, boolean> = {};

    for (let idx = 0; idx < order.length; idx++) {
      const { spaceId, syncType } = order[idx];
      const resp = responses[idx] as MsearchResponseItem<unknown>;

      if ('error' in resp) {
        this.logger.warn(
          `[owner-sync-task][${this.owner}][${spaceId}] msearch sub-query error — treating as having new docs`,
          {
            owner: this.owner,
            spaceId,
            syncType,
            executionId,
            msearchError: resp.error,
            tags: ['cai-owner-sync', `cai-owner-sync-${this.owner}`],
          }
        );
        // Err on the side of triggering a sync when uncertain
        result[spaceId] = true;
      } else {
        const total =
          typeof resp.hits?.total === 'number'
            ? resp.hits.total
            : (resp.hits?.total as { value: number } | undefined)?.value ?? 0;

        if (total > 0) {
          result[spaceId] = true;
        } else if (result[spaceId] === undefined) {
          result[spaceId] = false;
        }
      }
    }

    return result;
  }

  /**
   * Start an async ES _reindex for a given (spaceId, syncType).
   * Returns the ES task ID, or undefined if the painless script is missing.
   */
  private async startReindex(
    esClient: ElasticsearchClient,
    spaceId: string,
    syncType: CAISyncType,
    subState: SyncSubTaskState,
    executionId: string
  ): Promise<string | undefined> {
    const destIndex = destinationIndexBySyncType(syncType, spaceId, this.owner);
    const sourceIndex = sourceIndexBySyncType(syncType);

    // Retrieve the painless script ID from the destination index mapping
    let painlessScriptId: string;
    try {
      const mappingResponse = await esClient.indices.getMapping({ index: destIndex });
      painlessScriptId = mappingResponse[destIndex]?.mappings?._meta?.painless_script_id;
      if (!painlessScriptId) {
        this.logger.warn(
          `[owner-sync-task][${this.owner}][${spaceId}][${syncType}] ` +
            `Painless script ID missing from mapping — skipping reindex.`,
          { tags: ['cai-owner-sync', `cai-owner-sync-${this.owner}`] }
        );
        return undefined;
      }
    } catch (e) {
      this.logger.warn(
        `[owner-sync-task][${this.owner}][${spaceId}][${syncType}] Failed to get mapping for ${destIndex}`,
        { owner: this.owner, spaceId, syncType, executionId, destIndex, error: e }
      );
      return undefined;
    }

    // Verify script exists
    try {
      const scriptResponse = await esClient.getScript({ id: painlessScriptId });
      if (!scriptResponse.found) {
        this.logger.warn(
          `[owner-sync-task][${this.owner}][${spaceId}][${syncType}] ` +
            `Painless script ${painlessScriptId} not found — skipping reindex.`,
          { tags: ['cai-owner-sync', `cai-owner-sync-${this.owner}`] }
        );
        return undefined;
      }
    } catch (e) {
      this.logger.warn(
        `[owner-sync-task][${this.owner}][${spaceId}][${syncType}] Failed to retrieve painless script`,
        { owner: this.owner, spaceId, syncType, executionId, painlessScriptId, error: e }
      );
      return undefined;
    }

    const since = subState.lastSyncSuccess
      ? new Date(subState.lastSyncSuccess)
      : new Date(Date.now() - LOOKBACK_WINDOW_MS);

    const reindexResponse = await esClient.reindex({
      // Proceed past version conflicts caused by concurrent case writes
      // rather than failing the entire reindex operation.
      conflicts: 'proceed',
      source: {
        index: sourceIndex,
        query: SYNCHRONIZATION_QUERIES_DICTIONARY[syncType](since, spaceId, this.owner),
      },
      dest: { index: destIndex },
      script: { id: painlessScriptId },
      refresh: true,
      wait_for_completion: false,
    });

    this.logDebug(
      `[${spaceId}][${syncType}] Started reindex task ${reindexResponse.task} ` +
        `(source: ${sourceIndex}, dest: ${destIndex}, since: ${since.toISOString()}).`,
      executionId
    );

    return reindexResponse.task != null ? String(reindexResponse.task) : undefined;
  }

  /**
   * Update analytics_last_sync_at and analytics_sync_status on the configure
   * saved objects for all affected spaces.  Fire-and-forget — caller catches.
   *
   * Uses a single paginated find across all spaces for this owner, then a single
   * bulkUpdate, to avoid the O(N) sequential find+update pattern that would issue
   * 2N SO API calls at 10 000+ space scale.
   */
  private async updateConfigureSOs(
    soClient: SavedObjectsClientContract,
    spaceStates: Record<string, SpaceSyncState>,
    now: Date,
    spacesWithNewSyncStart: string[],
    spacesWithCompletedReindex: Set<string> = new Set()
  ): Promise<void> {
    const syncStartSet = new Set(spacesWithNewSyncStart);
    const spaceIds = Object.keys(spaceStates);
    if (spaceIds.length === 0) return;

    // ── 1. Fetch all configure SOs for this owner across all enabled spaces ──
    const allSOs: Array<{ id: string; namespaces?: string[] }> = [];
    const perPage = 10000;
    let page = 1;
    let lastPageSize: number;

    do {
      const results = await soClient.find<ConfigurationPersistedAttributes>({
        type: CASE_CONFIGURE_SAVED_OBJECT,
        namespaces: ['*'],
        filter:
          `${CASE_CONFIGURE_SAVED_OBJECT}.attributes.owner: "${this.owner}" AND ` +
          `${CASE_CONFIGURE_SAVED_OBJECT}.attributes.analytics_enabled: true`,
        page,
        perPage,
      });

      lastPageSize = results.saved_objects.length;
      allSOs.push(...results.saved_objects);
      page++;
    } while (lastPageSize === perPage);

    // ── 2. Build per-SO attribute patches ────────────────────────────────────
    const bulkObjects: Array<{
      type: string;
      id: string;
      attributes: Partial<ConfigurationPersistedAttributes>;
      namespace?: string;
    }> = [];

    for (const so of allSOs) {
      const spaceId = (so.namespaces ?? []).find((ns) => ns !== '*');
      if (!spaceId || !spaceStates[spaceId]) continue;

      const state = spaceStates[spaceId];
      const isIdle = state.nextSyncAt !== undefined;

      const attributes: Partial<ConfigurationPersistedAttributes> = {
        analytics_sync_status: isIdle ? 'idle' : 'active',
      };

      if (syncStartSet.has(spaceId) || spacesWithCompletedReindex.has(spaceId)) {
        attributes.analytics_last_sync_at = now.toISOString();
      }

      bulkObjects.push({
        type: CASE_CONFIGURE_SAVED_OBJECT,
        id: so.id,
        attributes,
        namespace: spaceId === 'default' ? undefined : spaceId,
      });
    }

    // ── 3. Single bulk update ─────────────────────────────────────────────────
    if (bulkObjects.length > 0) {
      await soClient.bulkUpdate<ConfigurationPersistedAttributes>(bulkObjects);
    }
  }

  private logDebug(message: string, executionId: string) {
    this.logger.debug(`[owner-sync-task][${this.owner}] ${message}`, {
      owner: this.owner,
      executionId,
      tags: ['cai-owner-sync', `cai-owner-sync-${this.owner}`],
    });
  }
}

enum ReindexStatus {
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

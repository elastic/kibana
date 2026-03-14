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
import { type CAISyncType, CAISyncTypes, SYNCHRONIZATION_QUERIES_DICTIONARY } from '../../constants';
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
    if (!this.analyticsConfig.index.enabled) {
      this.logDebug('Analytics index is disabled, skipping owner sync task.');
      return { state: this.previousState };
    }

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

      this.logDebug(`Found ${enabledSpaces.length} analytics-enabled spaces.`);

      // Build working state — carry over previous, prune removed spaces
      const spaceStates: Record<string, SpaceSyncState> = {};
      for (const spaceId of enabledSpaces) {
        spaceStates[spaceId] = this.previousState.spaceStates[spaceId] ?? defaultSpaceState();
      }

      // ── Phase 2: Partition into idle / runable ────────────────────────────
      const now = new Date();
      const idleSpaces: string[] = [];
      const runableSpaces: string[] = [];

      for (const spaceId of enabledSpaces) {
        const state = spaceStates[spaceId];
        if (state.nextSyncAt && new Date(state.nextSyncAt) > now) {
          idleSpaces.push(spaceId);
        } else {
          // Clear idle marker — this space is eligible for a run
          delete state.nextSyncAt;
          runableSpaces.push(spaceId);
        }
      }

      this.logDebug(
        `Partition: ${runableSpaces.length} runable, ${idleSpaces.length} idle (skipped).`
      );

      if (runableSpaces.length === 0) {
        return { state: { spaceStates } };
      }

      // ── Phase 3: Check status of in-flight ES reindex tasks ───────────────
      let ongoingCount = 0;
      for (const spaceId of runableSpaces) {
        const spaceState = spaceStates[spaceId];
        for (const syncType of CAISyncTypes) {
          const sub = spaceState.syncTasks[syncType];
          if (!sub?.esReindexTaskId) continue;

          const status = await this.getReindexStatus(esClient, sub.esReindexTaskId);
          if (status === ReindexStatus.RUNNING) {
            ongoingCount++;
          } else if (status === ReindexStatus.COMPLETED) {
            sub.lastSyncSuccess = sub.lastSyncAttempt;
            sub.esReindexTaskId = undefined;
          } else {
            // FAILED or MISSING — clear so we retry next run
            sub.esReindexTaskId = undefined;
          }
          spaceState.syncTasks[syncType] = sub;
        }
      }

      this.logDebug(`In-flight reindex tasks: ${ongoingCount} running.`);

      // ── Phase 4: msearch — detect new source docs per (space, syncType) ───
      const spaceHasNewDocs = await this.batchCheckForNewDocs(
        esClient,
        runableSpaces,
        spaceStates
      );

      // ── Phase 5: Fan-out — start new reindexes / update idle counters ─────
      const concurrencyCap = this.analyticsConfig.index.reindexConcurrency;
      const spacesWithSuccessfulSync: string[] = [];

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
            `[${spaceId}] No new docs. Consecutive empty runs: ${spaceState.consecutiveEmptyRuns}.`
          );

          if (spaceState.consecutiveEmptyRuns >= IDLE_THRESHOLD) {
            spaceState.nextSyncAt = new Date(now.getTime() + IDLE_INTERVAL_MS).toISOString();
            this.logger.info(
              `[owner-sync-task][${this.owner}][${spaceId}] Entering idle mode after ` +
                `${spaceState.consecutiveEmptyRuns} consecutive empty runs. ` +
                `Next sync at ${spaceState.nextSyncAt}.`,
              { tags: ['cai-owner-sync', `cai-owner-sync-${this.owner}`] }
            );
          }
          continue;
        }

        // Has new docs (or an ongoing reindex from a previous run) — stay active
        if (hasNewDocs) {
          spaceState.consecutiveEmptyRuns = 0;
        }

        // Check whether all destination indices exist for this space
        const indices = getIndicesForOwnerAndSpace(spaceId, this.owner);
        const indicesExist = await esClient.indices.exists({ index: indices });
        if (!indicesExist) {
          this.logDebug(`[${spaceId}] Destination index missing, skipping until creation.`);
          continue;
        }

        // Start new reindexes for sync types that don't already have a running task
        for (const syncType of CAISyncTypes) {
          const sub: SyncSubTaskState = spaceState.syncTasks[syncType] ?? {};

          if (sub.esReindexTaskId) {
            // Already running (counted in phase 3)
            continue;
          }

          if (ongoingCount >= concurrencyCap) {
            this.logDebug(
              `[${spaceId}][${syncType}] Concurrency cap (${concurrencyCap}) reached — deferring.`
            );
            continue;
          }

          const taskId = await this.startReindex(esClient, spaceId, syncType, sub);
          if (taskId) {
            sub.lastSyncAttempt = now.toISOString();
            sub.esReindexTaskId = String(taskId);
            ongoingCount++;
            spacesWithSuccessfulSync.push(spaceId);
          }
          spaceState.syncTasks[syncType] = sub;
        }
      }

      // ── Phase 6: Persist configure SO updates (fire-and-forget) ──────────
      this.updateConfigureSOs(soClient, spaceStates, now, spacesWithSuccessfulSync).catch(
        (err: Error) => {
          this.logger.warn(
            `[owner-sync-task][${this.owner}] Failed to update configure SOs: ${err.message}`
          );
        }
      );

      return { state: { spaceStates } };
    } catch (e) {
      if (isRetryableEsClientError(e)) {
        throwRetryableError(
          createTaskRunError(new Error(this.buildErrorMessage(e.message)), TaskErrorSource.FRAMEWORK),
          true
        );
      }
      throwUnrecoverableError(
        createTaskRunError(
          new Error(this.buildErrorMessage(e.message)),
          TaskErrorSource.FRAMEWORK
        )
      );
      // unreachable — throwUnrecoverableError always throws
      return undefined;
    }
  }

  public async cancel() {
    this.logDebug('Cancelling owner sync task.');
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Check the status of an existing ES reindex task.
   */
  private async getReindexStatus(
    esClient: ElasticsearchClient,
    taskId: string
  ): Promise<ReindexStatus> {
    try {
      const response = await esClient.tasks.get({ task_id: taskId });
      if (!response.completed) return ReindexStatus.RUNNING;
      if (response.response?.failures?.length || response.error) return ReindexStatus.FAILED;
      return ReindexStatus.COMPLETED;
    } catch {
      // Task not found (e.g. ES restarted) — treat as failed so we retry
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
    spaceStates: Record<string, SpaceSyncState>
  ): Promise<Record<string, boolean>> {
    const result: Record<string, boolean> = {};

    for (let i = 0; i < spaceIds.length; i += MSEARCH_CHUNK_SIZE) {
      const chunk = spaceIds.slice(i, i + MSEARCH_CHUNK_SIZE);
      const chunkResult = await this.msearchChunk(esClient, chunk, spaceStates);
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
    spaceStates: Record<string, SpaceSyncState>
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
      const { spaceId } = order[idx];
      const resp = responses[idx] as MsearchResponseItem<unknown>;

      if ('error' in resp) {
        this.logger.warn(
          `[owner-sync-task][${this.owner}][${spaceId}] msearch error: ${JSON.stringify(resp.error)}`
        );
        // Err on the side of triggering a sync when uncertain
        result[spaceId] = true;
        continue;
      }

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
    subState: SyncSubTaskState
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
            `Painless script ID missing from mapping — skipping reindex.`
        );
        return undefined;
      }
    } catch (e) {
      this.logger.warn(
        `[owner-sync-task][${this.owner}][${spaceId}][${syncType}] ` +
          `Failed to get mapping for ${destIndex}: ${e.message}`
      );
      return undefined;
    }

    // Verify script exists
    try {
      const scriptResponse = await esClient.getScript({ id: painlessScriptId });
      if (!scriptResponse.found) {
        this.logger.warn(
          `[owner-sync-task][${this.owner}][${spaceId}][${syncType}] ` +
            `Painless script ${painlessScriptId} not found — skipping reindex.`
        );
        return undefined;
      }
    } catch (e) {
      this.logger.warn(
        `[owner-sync-task][${this.owner}][${spaceId}][${syncType}] ` +
          `Failed to retrieve painless script: ${e.message}`
      );
      return undefined;
    }

    const since = subState.lastSyncSuccess
      ? new Date(subState.lastSyncSuccess)
      : new Date(Date.now() - LOOKBACK_WINDOW_MS);

    const reindexResponse = await esClient.reindex({
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
        `(source: ${sourceIndex}, dest: ${destIndex}, since: ${since.toISOString()}).`
    );

    return reindexResponse.task != null ? String(reindexResponse.task) : undefined;
  }

  /**
   * Update analytics_last_sync_at and analytics_sync_status on the configure
   * saved objects for all affected spaces.  Fire-and-forget — caller catches.
   */
  private async updateConfigureSOs(
    soClient: SavedObjectsClientContract,
    spaceStates: Record<string, SpaceSyncState>,
    now: Date,
    spacesWithNewSyncStart: string[]
  ): Promise<void> {
    const syncStartSet = new Set(spacesWithNewSyncStart);

    for (const [spaceId, state] of Object.entries(spaceStates)) {
      const isIdle = state.nextSyncAt !== undefined;
      const syncStatus = isIdle ? 'idle' : 'active';

      const updates: Partial<ConfigurationPersistedAttributes> = {
        analytics_sync_status: syncStatus,
      };

      if (syncStartSet.has(spaceId)) {
        updates.analytics_last_sync_at = now.toISOString();
      }

      try {
        const results = await soClient.find<ConfigurationPersistedAttributes>({
          type: CASE_CONFIGURE_SAVED_OBJECT,
          namespaces: [spaceId],
          filter: `${CASE_CONFIGURE_SAVED_OBJECT}.attributes.owner: "${this.owner}"`,
          perPage: 1,
        });

        if (results.saved_objects.length === 0) continue;

        const so = results.saved_objects[0];
        await soClient.update<ConfigurationPersistedAttributes>(
          CASE_CONFIGURE_SAVED_OBJECT,
          so.id,
          updates,
          { namespace: spaceId === 'default' ? undefined : spaceId }
        );
      } catch (err) {
        this.logger.warn(
          `[owner-sync-task][${this.owner}][${spaceId}] ` +
            `Failed to update configure SO: ${(err as Error).message}`
        );
      }
    }
  }

  private logDebug(message: string) {
    this.logger.debug(`[owner-sync-task][${this.owner}] ${message}`, {
      tags: ['cai-owner-sync', `cai-owner-sync-${this.owner}`],
    });
  }

  private buildErrorMessage(message: string): string {
    const errorMessage = `[owner-sync-task][${this.owner}] Sync failed. Error: ${message}`;
    this.logger.error(errorMessage, {
      tags: ['cai-owner-sync', 'cai-owner-sync-error', `cai-owner-sync-${this.owner}`],
    });
    return errorMessage;
  }
}

enum ReindexStatus {
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

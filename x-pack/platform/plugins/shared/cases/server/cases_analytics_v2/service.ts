/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  ElasticsearchClient,
  KibanaRequest,
  Logger,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import type { DataViewsServerPluginStart } from '@kbn/data-views-plugin/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { CasesAnalyticsV2DataViewService } from './data_view/service';
import { ensureCaseIndex } from './ensure_indices/case';
import { registerReconciliationTask, scheduleReconciliationTask } from './reconciliation';
import { registerCasesAnalyticsV2Routes } from './routes';
import {
  CasesAnalyticsV2Writer,
  V2_NOOP_WRITER,
  type CasesAnalyticsV2WriterContract,
} from './writer';

interface CasesAnalyticsV2ServiceDeps {
  logger: Logger;
  /** Resolved value of `xpack.cases.analyticsV2.enabled`. When false, every method is a no-op. */
  enabled: boolean;
  /**
   * Resolved value of `xpack.cases.analyticsV2.reconciliationIntervalMinutes`.
   * Drives Task Manager's schedule for the durability-backstop walk. The
   * config schema enforces `min: 5`; the default is 30. Captured at
   * construction time and passed through to `scheduleReconciliationTask`
   * at start.
   */
  reconciliationIntervalMinutes: number;
}

/**
 * Dependencies the service needs at plugin `setup()` time. Setup runs before
 * Kibana is accepting requests; only contracts available in setup are valid
 * here (Task Manager setup, logger, etc.).
 */
interface CasesAnalyticsV2SetupDeps {
  /** Core setup contract — needed by the administrator-route registration. */
  core: CoreSetup;
  taskManager: TaskManagerSetupContract;
}

/**
 * Dependencies the service needs at plugin `start()` time. Start runs once
 * core has finished booting; we get real Elasticsearch + Task Manager start
 * contracts and an internal SO client suitable for scheduled background work.
 */
interface CasesAnalyticsV2StartDeps {
  esClient: ElasticsearchClient;
  taskManager: TaskManagerStartContract;
  /** Internal (no request) SO client used by the reconciliation runner. */
  internalSavedObjectsClient: SavedObjectsClientContract;
  /** Data views plugin start contract — needed to create managed Cases data views. */
  dataViewsService: DataViewsServerPluginStart;
}

/**
 * Per-request inputs for the data view ensure / refresh hooks. The
 * request-scoped SO client lands the data view in the request's space
 * without manual namespace juggling — for "create a data view in space X"
 * we just hand the data views API a client that's already scoped to X.
 */
interface EnsureDataViewForSpaceDeps {
  spaceId: string;
  request: KibanaRequest;
  savedObjectsClient: SavedObjectsClientContract;
}

/**
 * Stable callback handed to consumers (today: the templates service) so
 * they can ask the v2 subsystem to recompute and persist a space's
 * runtime field map after a template-level change. Fire-and-forget — the
 * caller never awaits and never sees errors.
 *
 * Mirrors the writer-proxy pattern: callers hold a reference captured at
 * factory time and the v2 service owns when the underlying work runs (or
 * is a no-op when the feature flag is off).
 */
export type CasesAnalyticsV2DataViewRefresher = (deps: EnsureDataViewForSpaceDeps) => void;

/**
 * No-op refresher used when v2 is disabled or hasn't been wired into the
 * cases client factory. Keeps the templates service oblivious to v2's
 * lifecycle — every code path just calls the refresher unconditionally.
 */
export const V2_NOOP_DATA_VIEW_REFRESHER: CasesAnalyticsV2DataViewRefresher = () => {};

/**
 * Top-level orchestrator for cases-analytics v2: owns index bootstrap,
 * writer lifecycle, reconciliation task registration, per-space data-view
 * ensure, and administrator route registration.
 *
 * Gated by `xpack.cases.analyticsV2.enabled`. When disabled, every method
 * is a no-op; v1 (`server/cases_analytics`) is independent of this flag.
 *
 * Two stable proxies are exposed (`writerProxy`, `dataViewRefresherProxy`)
 * so SO services and the cases client factory can capture references in
 * `setup()`, before the underlying ES client / data-views service exist —
 * the proxy delegates to whichever implementation is current and silently
 * no-ops until `start()` swaps them in.
 *
 * Per-space data view bootstrap is lazy: the request handler context
 * fires `ensureDataViewForSpace` on every cases request; the data view
 * service short-circuits via an in-memory cache after the first success.
 */
export class CasesAnalyticsV2Service {
  private readonly logger: Logger;
  private readonly enabled: boolean;
  private readonly reconciliationIntervalMinutes: number;
  /**
   * Holds the active writer. Starts as `V2_NOOP_WRITER` so calls before
   * `start()` (or when v2 is disabled) silently no-op. Replaced with a real
   * `CasesAnalyticsV2Writer` instance once start runs.
   */
  private writer: CasesAnalyticsV2WriterContract = V2_NOOP_WRITER;
  /**
   * Stable proxy returned to consumers. Methods delegate to the current
   * `this.writer` at call time, so swapping `writer` from no-op to real after
   * SO services have already captured the proxy works correctly.
   */
  private readonly writerProxy: CasesAnalyticsV2WriterContract = {
    upsertCase: (so) => this.writer.upsertCase(so),
    deleteCase: (id) => this.writer.deleteCase(id),
    bulkUpsertCases: (sos) => this.writer.bulkUpsertCases(sos),
    bulkDeleteCases: (ids) => this.writer.bulkDeleteCases(ids),
    bulkUpsertCasesAwait: (sos) => this.writer.bulkUpsertCasesAwait(sos),
  };
  /**
   * Stable refresher returned to consumers. Captured by the cases client
   * factory at initialize time, bound per-request, and handed to the
   * templates service so template create / update / delete can refresh
   * the per-space runtime field map without taking a hard dep on the v2
   * service. No-op when v2 is disabled or before `start()` runs.
   */
  private readonly dataViewRefresherProxy: CasesAnalyticsV2DataViewRefresher = (deps) =>
    this.refreshDataViewForSpace(deps);
  /**
   * Internal SO client captured at start, used by the reconciliation task
   * runner. The runner needs an SO client without a request context (it
   * runs on a Task Manager timer, not a user request).
   */
  private internalSavedObjectsClient: SavedObjectsClientContract | undefined;
  /**
   * Captured at start so the per-space data view ensure can pass the right
   * ES client to the data views service factory.
   */
  private esClient: ElasticsearchClient | undefined;
  /**
   * Data view sub-service. Constructed at start; orchestrates per-space
   * Cases data views and their runtime field maps. `undefined` until start
   * runs (or forever if v2 is disabled).
   */
  private dataViewService: CasesAnalyticsV2DataViewService | undefined;
  /**
   * Task Manager start contract captured at start. Administrator routes
   * registered in `setup()` close over a `getTaskManager()` callback that
   * reads this — the routes need a TM start contract, but they're
   * registered in setup where only the setup contract is available.
   */
  private taskManager: TaskManagerStartContract | undefined;

  constructor(deps: CasesAnalyticsV2ServiceDeps) {
    this.logger = deps.logger.get('cases.analyticsV2');
    this.enabled = deps.enabled;
    this.reconciliationIntervalMinutes = deps.reconciliationIntervalMinutes;
  }

  /**
   * Plugin setup hook. Registers the reconciliation TASK TYPE with Task
   * Manager — Task Manager requires task definitions before any node is
   * accepting requests, so this must run in plugin `setup()`, not `start()`.
   *
   * The task runner's deps (SO client + writer) aren't available yet — we
   * wire them via the `getRunnerDeps` closure, which the task runner invokes
   * at run time (well after `start()` has populated them).
   */
  public setup(deps: CasesAnalyticsV2SetupDeps): void {
    if (!this.enabled) {
      this.logger.debug(
        'cases-analytics v2 disabled (xpack.cases.analyticsV2.enabled=false); skipping setup'
      );
      // Administrator routes are NOT registered when the flag is off:
      // `/state` on a disabled instance returns 404, which health tooling
      // reads as "feature not present here."
      return;
    }
    registerReconciliationTask({
      taskManager: deps.taskManager,
      logger: this.logger,
      getRunnerDeps: async () => {
        // Resolved at task-run time. If reconciliation fires before `start()`
        // has populated `internalSavedObjectsClient` (unlikely; Task Manager
        // waits for start), throwing here gets logged + retried on the
        // next tick.
        if (this.internalSavedObjectsClient == null) {
          throw new Error('cases-analyticsV2: reconciliation fired before service start completed');
        }
        return {
          savedObjectsClient: this.internalSavedObjectsClient,
          writer: this.writerProxy,
        };
      },
    });

    // Register administrator routes. The TM start contract isn't available
    // yet — routes close over `getTaskManager()` which returns
    // `this.taskManager` once `start()` runs. `/reset` also closes over
    // `clearDataViewBootstrapCache()` to wipe the in-memory ensure cache
    // after dropping per-space data views.
    registerCasesAnalyticsV2Routes({
      core: deps.core,
      logger: this.logger,
      getTaskManager: () => this.taskManager ?? null,
      clearDataViewBootstrapCache: () => this.dataViewService?.clearBootstrapCache(),
      enabled: this.enabled,
      reconciliationIntervalMinutes: this.reconciliationIntervalMinutes,
    });
  }

  /**
   * Plugin start hook. When the flag is off, returns at debug level so an
   * administrator who disabled v2 can still confirm the wiring is present.
   *
   * When on: bootstraps `.cases`, swaps the no-op writer for the real one,
   * captures lifecycle references, and schedules the singleton
   * reconciliation task. Bootstrap failures are logged inside
   * `ensureCaseIndex` and never thrown — the cases plugin must keep
   * starting even if analytics has trouble. Per-space data view bootstrap
   * is lazy via `ensureDataViewForSpace`.
   */
  public async start(deps: CasesAnalyticsV2StartDeps): Promise<void> {
    if (!this.enabled) {
      this.logger.debug(
        'cases-analytics v2 disabled (xpack.cases.analyticsV2.enabled=false); skipping start'
      );
      return;
    }
    this.logger.info('cases-analytics v2 starting');

    // Bootstrap the cases index. Idempotent; safe to run on every node start.
    await ensureCaseIndex({ esClient: deps.esClient, logger: this.logger });

    // Swap the no-op writer for the real one. After this point, every call
    // through `writerProxy` reaches Elasticsearch.
    this.writer = new CasesAnalyticsV2Writer({
      esClient: deps.esClient,
      logger: this.logger,
    });

    // Capture lifecycle deps for use after start by the reconciliation task,
    // the administrator routes, and the per-request data-view ensure hook.
    this.internalSavedObjectsClient = deps.internalSavedObjectsClient;
    this.esClient = deps.esClient;
    this.taskManager = deps.taskManager;

    // Construct the per-space data view sub-service. No actual data views
    // are created here — bootstrap is lazy per-request via
    // `ensureDataViewForSpace` below.
    this.dataViewService = new CasesAnalyticsV2DataViewService({
      logger: this.logger,
      dataViewsService: deps.dataViewsService,
      internalSavedObjectsClient: deps.internalSavedObjectsClient,
    });

    // Schedule the singleton reconciliation task. Idempotent; safe under
    // concurrent node starts (Task Manager dedupes by id). Interval is
    // configurable via `xpack.cases.analyticsV2.reconciliationIntervalMinutes`.
    await scheduleReconciliationTask({
      taskManager: deps.taskManager,
      logger: this.logger,
      intervalMinutes: this.reconciliationIntervalMinutes,
    });
  }

  /**
   * Plugin stop hook. Mirrors `start()` — fast-return when disabled. Long-lived
   * resources (timers, Task Manager handles) are released by future commits as
   * they're introduced.
   */
  public stop(): void {
    if (!this.enabled) return;
    this.logger.info('cases-analytics v2 stopping');
  }

  /**
   * Stable writer reference for the cases SO services. Returns the same
   * proxy on every call; delegates to `V2_NOOP_WRITER` until `start()` runs
   * (and forever if the feature flag is off).
   */
  public getWriter(): CasesAnalyticsV2WriterContract {
    return this.writerProxy;
  }

  /**
   * Fire-and-forget hook invoked by the cases request handler context — on
   * every cases request, the v2 service ensures a Cases data view exists in
   * the request's space. Idempotent + cached in-process; the cost is a
   * single `Set.has()` check after the first successful ensure per space.
   *
   * Safe to call when v2 is disabled or before start completes — the
   * underlying service is `undefined` and we short-circuit. Errors are
   * swallowed inside the data view service; nothing here propagates to the
   * request handler.
   */
  public ensureDataViewForSpace(deps: EnsureDataViewForSpaceDeps): void {
    if (!this.enabled || this.dataViewService == null || this.esClient == null) return;
    void this.dataViewService.ensureForSpace({
      spaceId: deps.spaceId,
      savedObjectsClient: deps.savedObjectsClient,
      esClient: this.esClient,
      request: deps.request,
    });
  }

  /**
   * Fire-and-forget hook invoked by the templates service after a template
   * create / update / delete. Same shape as `ensureDataViewForSpace` but
   * routes to `refreshForSpace` so the in-memory bootstrap cache is
   * bypassed — without this, a template change in an already-bootstrapped
   * space wouldn't propagate to the data view until process restart or
   * `/reset`.
   *
   * Safe to call when v2 is disabled or before start completes — same
   * short-circuit semantics as `ensureDataViewForSpace`.
   */
  public refreshDataViewForSpace(deps: EnsureDataViewForSpaceDeps): void {
    if (!this.enabled || this.dataViewService == null || this.esClient == null) return;
    void this.dataViewService.refreshForSpace({
      spaceId: deps.spaceId,
      savedObjectsClient: deps.savedObjectsClient,
      esClient: this.esClient,
      request: deps.request,
    });
  }

  /**
   * Stable refresher reference for the cases client factory to capture at
   * initialize time. Mirrors `getWriter()` — same lifetime semantics, same
   * "always resolvable, may no-op" guarantees.
   */
  public getDataViewRefresher(): CasesAnalyticsV2DataViewRefresher {
    return this.dataViewRefresherProxy;
  }
}

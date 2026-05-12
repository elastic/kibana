/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  ElasticsearchClient,
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
}

/**
 * Dependencies the service needs at plugin `setup()` time. Setup runs before
 * Kibana is accepting requests; only contracts available in setup are valid
 * here (Task Manager setup, logger, etc.).
 */
interface CasesAnalyticsV2SetupDeps {
  /** Core setup contract — needed by the operator-route registration. */
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
  /** Data views plugin start contract — needed to create + update the managed Cases data view. */
  dataViewsService: DataViewsServerPluginStart;
}

/**
 * Top-level orchestrator for cases-analytics v2.
 *
 * Owns the lifecycle of the v2 analytics subsystem: index bootstrap, writer
 * construction, reconciliation task registration, data-view sync (added in a
 * later commit), and operator route registration (later commit). Constructed
 * once in plugin `setup()`; lifecycle hooks (`setup`, `start`, `stop`) fire
 * from the plugin's matching lifecycle hooks.
 *
 * v2 is gated by the `xpack.cases.analyticsV2.enabled` config. When disabled
 * (the default) every method is a no-op — nothing is registered, nothing is
 * scheduled, nothing is written. v1 (`server/cases_analytics`) is unaffected
 * regardless of the v2 flag's state.
 *
 * **Writer access pattern.** The cases SO services consume the writer via
 * `getWriter()` rather than receiving it at construction. Two reasons:
 *   1. The plugin's `setup()` (where SO services are wired) runs before
 *      `start()` (where the writer is constructed with the ES client).
 *   2. Per-request SO service instances need a stable reference even though
 *      the writer's identity changes from `V2_NOOP_WRITER` to the real
 *      writer when start runs.
 * The getter returns a stable proxy that delegates to whichever writer is
 * current — see `writerProxy` below.
 */
export class CasesAnalyticsV2Service {
  private readonly logger: Logger;
  private readonly enabled: boolean;
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
  };
  /**
   * Internal SO client captured at start, used by the reconciliation task
   * runner. The runner needs an SO client without a request context (it runs
   * on a Task Manager timer, not a user request).
   */
  private internalSavedObjectsClient: SavedObjectsClientContract | undefined;
  /**
   * Data view sub-service. Constructed at start (after we have the data
   * views plugin contract); orchestrates the managed Cases data view + its
   * runtime field map.
   */
  private dataViewService: CasesAnalyticsV2DataViewService | undefined;
  /**
   * Task Manager start contract captured at start. Operator routes
   * registered in `setup()` close over a `getTaskManager()` callback that
   * reads this — the routes need a TM start contract, but they're
   * registered in setup where only the setup contract is available.
   */
  private taskManager: TaskManagerStartContract | undefined;

  constructor(deps: CasesAnalyticsV2ServiceDeps) {
    this.logger = deps.logger.get('cases.analyticsV2');
    this.enabled = deps.enabled;
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
      // Note: operator routes are NOT registered when the flag is off. Health
      // tooling that queries `/state` against a disabled instance gets a 404
      // — equivalent to "the feature isn't present here." If we want a
      // discoverable health endpoint regardless of the flag, we can register
      // a thin always-on route here later. Not in this PR.
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

    // Register operator routes. The Task Manager start contract isn't
    // available yet — routes close over a `getTaskManager()` callback that
    // returns `this.taskManager` once `start()` runs.
    registerCasesAnalyticsV2Routes({
      core: deps.core,
      logger: this.logger,
      getTaskManager: () => this.taskManager ?? null,
      enabled: this.enabled,
    });
  }

  /**
   * Plugin start hook.
   *
   * When the feature flag is off, returns immediately at debug log level so an
   * operator who turned the flag off can still confirm the wiring is in place.
   *
   * When on, today: bootstraps the `.cases` index, constructs the real
   * writer, captures the internal SO client for the reconciliation task, and
   * schedules the reconciliation task instance. Future commits add data-view
   * sync and operator route registration.
   *
   * Failures during bootstrap are logged inside `ensureCaseIndex` and never
   * thrown — the cases plugin must keep starting even if analytics has trouble.
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

    // Capture the SO client for the reconciliation task — the runner uses it
    // to walk cases since the last cursor.
    this.internalSavedObjectsClient = deps.internalSavedObjectsClient;
    // Capture the Task Manager start contract so the operator routes (which
    // were registered in setup() but need the start contract) can resolve it.
    this.taskManager = deps.taskManager;

    // Bootstrap the managed Cases data view + apply runtime fields from every
    // template's declared extended fields. Idempotent; safe under concurrent
    // node starts.
    this.dataViewService = new CasesAnalyticsV2DataViewService({
      logger: this.logger,
      esClient: deps.esClient,
      internalSavedObjectsClient: deps.internalSavedObjectsClient,
      dataViewsService: deps.dataViewsService,
    });
    await this.dataViewService.start();

    // Schedule the singleton reconciliation task. Idempotent; safe under
    // concurrent node starts (Task Manager dedupes by id).
    await scheduleReconciliationTask({ taskManager: deps.taskManager, logger: this.logger });
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
}

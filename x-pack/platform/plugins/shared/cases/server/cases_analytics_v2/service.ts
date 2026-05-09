/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { ensureCaseIndex } from './ensure_indices/case';
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
 * Dependencies the service needs at `start()` time but not earlier. Kept as a
 * separate input from constructor deps so plugin `setup()` can build the
 * service without yet having access to ES / Task Manager / data views.
 *
 * Future commits in this PR will extend this with `taskManager`,
 * `savedObjectsClient`, `dataViewsService`.
 */
interface CasesAnalyticsV2StartDeps {
  esClient: ElasticsearchClient;
}

/**
 * Top-level orchestrator for cases-analytics v2.
 *
 * Owns the lifecycle of the v2 analytics subsystem: index bootstrap, writer
 * construction, reconciliation task registration, data-view sync, and operator
 * route registration. Constructed once in plugin `setup()`; `start()` fires
 * from the plugin's `start()` hook (with the lifecycle deps it needs);
 * `stop()` fires on plugin teardown.
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

  constructor(deps: CasesAnalyticsV2ServiceDeps) {
    this.logger = deps.logger.get('cases.analyticsV2');
    this.enabled = deps.enabled;
  }

  /**
   * Plugin start hook.
   *
   * When the feature flag is off, returns immediately at debug log level so an
   * operator who turned the flag off can still confirm the wiring is in place.
   *
   * When on, today: bootstraps the `.cases` index and constructs the writer.
   * Future commits also register the reconciliation task, ensure managed data
   * views, and wire operator routes.
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
   *
   * Wired into the cases SO services in commit 4.
   */
  public getWriter(): CasesAnalyticsV2WriterContract {
    return this.writerProxy;
  }
}

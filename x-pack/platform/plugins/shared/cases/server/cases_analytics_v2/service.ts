/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { ensureCaseIndex } from './ensure_indices/case';

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
 * `savedObjectsClient`, `dataViewsService`, and the cases plugin's writer
 * proxy.
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
 */
export class CasesAnalyticsV2Service {
  private readonly logger: Logger;
  private readonly enabled: boolean;

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
   * When on, today: bootstraps the `.cases` index. Future commits also register
   * the reconciliation task, ensure managed data views, and wire the writer
   * proxy used by the cases SO services.
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
}

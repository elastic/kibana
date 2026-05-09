/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

interface CasesAnalyticsV2ServiceDeps {
  logger: Logger;
  /** Resolved value of `xpack.cases.analyticsV2.enabled`. When false, every method is a no-op. */
  enabled: boolean;
}

/**
 * Top-level orchestrator for cases-analytics v2.
 *
 * Owns the lifecycle of the v2 analytics subsystem: index bootstrap, writer
 * construction, reconciliation task registration, data-view sync, and operator
 * route registration. Constructed once in plugin `setup()`; `start()` and
 * `stop()` fire from the plugin's matching lifecycle hooks.
 *
 * v2 is gated by the `xpack.cases.analyticsV2.enabled` config. When disabled
 * (the default) every method is a no-op — nothing is registered, nothing is
 * scheduled, nothing is written. v1 (`server/cases_analytics`) is unaffected
 * regardless of the v2 flag's state.
 *
 * **Today this class is a skeleton.** Subsequent PRs in the v2 series add:
 *   - index template + bootstrap (`.cases` lookup index)
 *   - fire-and-forget writer hooks invoked by the cases SO services
 *   - reconciliation Task Manager task
 *   - managed data view + extended-fields runtime-field sync
 *   - operator routes (`/state`, `/reconcile/run_soon`, `/reset`)
 */
export class CasesAnalyticsV2Service {
  private readonly logger: Logger;
  private readonly enabled: boolean;

  constructor(deps: CasesAnalyticsV2ServiceDeps) {
    this.logger = deps.logger.get('cases.analyticsV2');
    this.enabled = deps.enabled;
  }

  /**
   * Plugin start hook. When the feature flag is off, returns immediately at debug
   * log level so an operator who turned the flag off can still confirm the wiring
   * is in place. When on, future commits will perform index bootstrap, register
   * the reconciliation task, ensure data views, and start the writer.
   */
  public start(): void {
    if (!this.enabled) {
      this.logger.debug(
        'cases-analytics v2 disabled (xpack.cases.analyticsV2.enabled=false); skipping start'
      );
      return;
    }
    this.logger.info('cases-analytics v2 starting');
    // Subsequent PRs wire actual behavior here.
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

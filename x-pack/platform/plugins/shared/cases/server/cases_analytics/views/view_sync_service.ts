/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { OWNERS } from '../../../common/constants/owners';
import { buildActivityViewQuery } from './build_activity_view';
import { buildCaseViewQuery } from './build_case_view';
import { buildLifecycleViewQuery } from './build_lifecycle_view';
import {
  CAI_VIEW_REGEN_DEBOUNCE_MS,
  CAI_VIEW_NAMES,
  getCAIViewName,
} from './constants';
import { loadTemplateFieldsUnion } from './template_fields_loader';

export interface ViewSyncStatus {
  /** Last time `regenerateNow` resolved successfully, or null if never. */
  lastRegenAt: Date | null;
  /** Error message from the most recent failed regenerate, or null. */
  lastRegenError: string | null;
  /** True if a regenerate is currently running. */
  regenInFlight: boolean;
}

interface ViewSyncServiceArgs {
  esClient: ElasticsearchClient;
  savedObjectsClient: SavedObjectsClientContract;
  logger: Logger;
  /** Optional debounce override; defaults to CAI_VIEW_REGEN_DEBOUNCE_MS. */
  debounceMs?: number;
}

/**
 * Owns the lifecycle of the 9 cases analytics views (3 surfaces × 3 owners).
 *
 * - `regenerateNow()` rebuilds and PUTs every view. Single-flight: a second
 *   call while one is in-flight returns the same promise.
 * - `scheduleRegeneration()` is the fire-and-forget entrypoint used by the
 *   templates client wrapper. Coalesces bursts of writes into a single
 *   regeneration after `debounceMs`.
 */
export class ViewSyncService {
  private readonly esClient: ElasticsearchClient;
  private readonly savedObjectsClient: SavedObjectsClientContract;
  private readonly logger: Logger;
  private readonly debounceMs: number;

  private timer: NodeJS.Timeout | null = null;
  private inFlight: Promise<void> | null = null;
  private regenAfterCurrent = false;

  private status: ViewSyncStatus = {
    lastRegenAt: null,
    lastRegenError: null,
    regenInFlight: false,
  };

  constructor({ esClient, savedObjectsClient, logger, debounceMs }: ViewSyncServiceArgs) {
    this.esClient = esClient;
    this.savedObjectsClient = savedObjectsClient;
    this.logger = logger;
    this.debounceMs = debounceMs ?? CAI_VIEW_REGEN_DEBOUNCE_MS;
  }

  getStatus(): ViewSyncStatus {
    return { ...this.status };
  }

  getViewNames(): readonly string[] {
    return CAI_VIEW_NAMES;
  }

  /**
   * Force-rebuilds and PUTs all views immediately. Subsequent callers join
   * the same in-flight promise; bursts of regenerates collapse into at
   * most two sequential runs (current + one queued follow-up).
   */
  regenerateNow(): Promise<void> {
    if (this.inFlight) {
      this.regenAfterCurrent = true;
      return this.inFlight;
    }
    this.status.regenInFlight = true;
    this.inFlight = this.regenerateInternal()
      .then(() => {
        this.status.lastRegenAt = new Date();
        this.status.lastRegenError = null;
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : String(err);
        this.status.lastRegenError = message;
        this.logger.error(`ES|QL view regeneration failed: ${message}`, { error: err });
      })
      .finally(() => {
        this.inFlight = null;
        this.status.regenInFlight = false;
        if (this.regenAfterCurrent) {
          this.regenAfterCurrent = false;
          // Use scheduleRegeneration so the follow-up still benefits from
          // the debounce window in case more writes arrived during the
          // current run.
          this.scheduleRegeneration();
        }
      });
    return this.inFlight;
  }

  /**
   * Queue a regeneration to run after `debounceMs` of quiet. Repeated calls
   * within the window reset the timer (coalesces burst writes). If a regen
   * is already in-flight when the timer fires, the follow-up is queued via
   * `regenAfterCurrent` so we never lose a write.
   */
  scheduleRegeneration(): void {
    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.timer = setTimeout(() => {
      this.timer = null;
      // Fire and forget — the caller is the SO write path; we don't want
      // to surface ES errors there.
      void this.regenerateNow();
    }, this.debounceMs);
  }

  /**
   * Cancel any pending debounce and wait for an in-flight regenerate to
   * settle. Called from plugin stop.
   */
  async stop(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.inFlight) {
      await this.inFlight.catch(() => {
        /* swallow — already logged */
      });
    }
  }

  private async regenerateInternal(): Promise<void> {
    for (const owner of OWNERS) {
      const fields = await loadTemplateFieldsUnion(
        owner,
        this.savedObjectsClient,
        this.logger
      );
      await this.putView(getCAIViewName('case', owner), buildCaseViewQuery(owner, fields));
      await this.putView(
        getCAIViewName('case_activity', owner),
        buildActivityViewQuery(owner)
      );
      await this.putView(
        getCAIViewName('case_lifecycle', owner),
        buildLifecycleViewQuery(owner)
      );
    }
    this.logger.debug(`Regenerated ${CAI_VIEW_NAMES.length} cases analytics ES|QL views`);
  }

  private async putView(name: string, query: string): Promise<void> {
    await this.esClient.transport.request(
      {
        method: 'PUT',
        path: `/_query/view/${encodeURIComponent(name)}`,
        body: { query },
      },
      { meta: true }
    );
  }
}

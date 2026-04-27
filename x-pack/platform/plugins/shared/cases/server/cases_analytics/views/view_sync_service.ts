/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { errors as EsErrors } from '@elastic/elasticsearch';
import { OWNERS } from '../../../common/constants/owners';
import { buildActivityViewQuery } from './build_activity_view';
import { buildCaseViewQuery } from './build_case_view';
import { buildLifecycleViewQuery } from './build_lifecycle_view';
import {
  CAI_VIEW_REGEN_DEBOUNCE_MS,
  CAI_VIEW_NAMES,
  getCAIViewName,
} from './constants';
import { loadExtendedFieldsFromMapping } from './mapping_fields_loader';

/**
 * Returns true when the ES error indicates the calling user lacks the
 * manage_view / create_view index privilege required by PUT _query/view.
 * Drives the warn-vs-error split in regenerateNow's catch block.
 */
const isMissingViewPrivilegeError = (err: unknown): boolean => {
  if (!(err instanceof EsErrors.ResponseError)) return false;
  if (err.statusCode !== 403) return false;
  const body = err.body as { error?: { type?: string; reason?: string } } | undefined;
  const type = body?.error?.type ?? '';
  const reason = body?.error?.reason ?? '';
  return type === 'security_exception' && /esql\/view\/put|manage_view|create_view/.test(reason);
};

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

  constructor({ esClient, logger, debounceMs }: ViewSyncServiceArgs) {
    this.esClient = esClient;
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
   *
   * `overrideEsClient` lets a request-scoped caller (the rebuild route)
   * run the PUTs as the current operator instead of kibana_system.
   * `manage_view` is an index-level privilege that kibana_system does
   * not carry by default — until the parallel ES role change ships, an
   * operator with cases-all + manage_view is the only way to land views
   * in production. In dev, the operator is elastic superuser.
   */
  regenerateNow(overrideEsClient?: ElasticsearchClient): Promise<void> {
    if (this.inFlight) {
      this.regenAfterCurrent = true;
      return this.inFlight;
    }
    const esClient = overrideEsClient ?? this.esClient;
    this.status.regenInFlight = true;
    this.inFlight = this.regenerateInternal(esClient)
      .then(() => {
        this.status.lastRegenAt = new Date();
        this.status.lastRegenError = null;
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : String(err);
        this.status.lastRegenError = message;
        if (isMissingViewPrivilegeError(err)) {
          /*
           * Most common cause on this branch: kibana_system lacks the
           * `manage_view` index privilege on `cases.*`. Plugin-start
           * regen always fails here until the parallel ES role change
           * ships. Surface as a clear warn — not error — so the log
           * isn't noisy at startup. Operators can still land views via
           * POST /internal/cases/_analytics/views/_rebuild as a
           * privileged user.
           */
          this.logger.warn(
            `ES|QL view regeneration skipped: ${message}. ` +
              `Run POST /internal/cases/_analytics/views/_rebuild as a user with the cases-all privilege ` +
              `(also requires the manage_view ES index privilege on cases.*) to land the views, ` +
              `or grant manage_view on cases.* to the kibana_system role.`
          );
        } else {
          this.logger.error(`ES|QL view regeneration failed: ${message}`, { error: err });
        }
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

  private async regenerateInternal(esClient: ElasticsearchClient): Promise<void> {
    for (const owner of OWNERS) {
      const fields = await loadExtendedFieldsFromMapping(owner, esClient, this.logger);
      await this.putView(esClient, getCAIViewName('case', owner), buildCaseViewQuery(owner, fields));
      await this.putView(
        esClient,
        getCAIViewName('case_activity', owner),
        buildActivityViewQuery(owner)
      );
      await this.putView(
        esClient,
        getCAIViewName('case_lifecycle', owner),
        buildLifecycleViewQuery(owner)
      );
    }
    this.logger.debug(`Regenerated ${CAI_VIEW_NAMES.length} cases analytics ES|QL views`);
  }

  private async putView(
    esClient: ElasticsearchClient,
    name: string,
    query: string
  ): Promise<void> {
    await esClient.transport.request(
      {
        method: 'PUT',
        path: `/_query/view/${encodeURIComponent(name)}`,
        body: { query },
      },
      { meta: true }
    );
  }
}

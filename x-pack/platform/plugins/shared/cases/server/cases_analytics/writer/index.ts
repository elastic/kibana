/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger, SavedObject } from '@kbn/core/server';
import {
  CASES_DATA_CASE_ALIAS,
  CASES_DATA_CASE_ACTIVITY_ALIAS,
  CASES_DATA_CASE_LIFECYCLE_ALIAS,
} from '../../../common/constants';
import {
  DEFAULT_WRITE_MAX_RETRIES,
  DEFAULT_WRITE_RETRY_INITIAL_DELAY_MS,
  type CasesDataSurface,
} from '../constants';
import type { CasePersistedAttributes } from '../../common/types/case';
import type { UserActionPersistedAttributes } from '../../common/types/user_actions';
import { buildCaseDoc } from './case_doc_builder';
import { buildActivityDoc } from './activity_doc_builder';
import { buildLifecycleDoc } from './lifecycle_doc_builder';
import { withRetry } from './retry';

interface WriterDependencies {
  esClient: ElasticsearchClient;
  logger: Logger;
  /** Resolves the user-action history for a case id. The writer needs this to
   * recompute lifecycle docs. Injected so the writer doesn't have to know about
   * SavedObjectsClient construction or namespacing. */
  fetchActivityForCase: (
    caseId: string
  ) => Promise<Array<SavedObject<UserActionPersistedAttributes>>>;
  /** Resolves the case SO when the writer only has the id. Used by lifecycle recompute. */
  fetchCase: (caseId: string) => Promise<SavedObject<CasePersistedAttributes> | null>;
  maxRetries?: number;
  retryInitialDelayMs?: number;
}

/**
 * Awaited variant of the writer surface — same operations, but each method
 * returns `Promise<boolean>` (true on success, false on failure) instead of
 * fire-and-forget `void`.
 *
 * The reconciliation runner uses this so it can decide whether to advance the
 * watermark based on whether the tick's writes actually succeeded. The
 * synchronous SO-service path doesn't use this — it can't block the API
 * response on analytics writes, so it sticks with the void-returning methods
 * that swallow internally.
 */
export interface AwaitedWriterContract {
  upsertCase: (so: SavedObject<CasePersistedAttributes>) => Promise<boolean>;
  deleteCase: (caseId: string) => Promise<boolean>;
  appendActivity: (so: SavedObject<UserActionPersistedAttributes>) => Promise<boolean>;
  recomputeLifecycle: (caseId: string) => Promise<boolean>;
}

/**
 * Public hook surface invoked from the cases SO services.
 *
 * The four primary methods (`upsertCase`, `deleteCase`, `appendActivity`,
 * `recomputeLifecycle`) are fire-and-forget by contract: callers don't await,
 * any error is logged and swallowed. The reconciliation tail job is the
 * durability backstop.
 *
 * The same operations are also exposed via `awaited.*` for callers that want
 * to know whether the write actually succeeded (today: only the reconciliation
 * runner). Those methods share the same retry policy as the fire-and-forget
 * variants but return a Promise<boolean> instead of swallowing.
 *
 * Constructed once per Kibana node by `CasesAnalyticsService`. The same instance is
 * shared across requests. Internally it depends on resolvers (fetchCase /
 * fetchActivityForCase) supplied at construction time so it stays free of request
 * scope.
 */
export class CasesAnalyticsWriter {
  private readonly esClient: ElasticsearchClient;
  private readonly logger: Logger;
  private readonly fetchCase: WriterDependencies['fetchCase'];
  private readonly fetchActivityForCase: WriterDependencies['fetchActivityForCase'];
  private readonly maxRetries: number;
  private readonly retryInitialDelayMs: number;
  /**
   * Awaited variant. Same operations, but each method returns Promise<boolean>
   * — true on success, false on failure. Bound in the constructor so the
   * methods retain `this` regardless of how callers destructure.
   */
  public readonly awaited: AwaitedWriterContract;

  constructor(deps: WriterDependencies) {
    this.esClient = deps.esClient;
    this.logger = deps.logger.get('cases.analytics.writer');
    this.fetchCase = deps.fetchCase;
    this.fetchActivityForCase = deps.fetchActivityForCase;
    this.maxRetries = deps.maxRetries ?? DEFAULT_WRITE_MAX_RETRIES;
    this.retryInitialDelayMs = deps.retryInitialDelayMs ?? DEFAULT_WRITE_RETRY_INITIAL_DELAY_MS;
    this.awaited = {
      upsertCase: (so) => this.tryAwait('case', so.id, () => this.doUpsertCase(so)),
      deleteCase: (id) => this.tryAwait('case', id, () => this.doDeleteCase(id)),
      appendActivity: (so) =>
        this.tryAwait('case_activity', so.id, () => this.doAppendActivity(so)),
      recomputeLifecycle: (id) =>
        this.tryAwait('case_lifecycle', id, () => this.doRecomputeLifecycle(id)),
    };
  }

  /**
   * Upsert a case document. Called by `CasesService.createCase` and `patchCase`
   * post-success.
   */
  upsertCase(so: SavedObject<CasePersistedAttributes>): void {
    this.logger.debug(`upsertCase id=${so.id} owner=${so.attributes?.owner}`);
    void this.fireAndForget('case', so.id, () => this.doUpsertCase(so));
  }

  /**
   * Hard-delete the case + lifecycle docs. Called by `CasesService.deleteCase` /
   * `bulkDeleteCaseEntities` post-success.
   *
   * Cascades to `case_lifecycle` because that surface is a per-case denormalization
   * keyed on the same id — leaving it behind would skew MTTR/MTTD dashboards
   * with phantom closed cases.
   *
   * Activity rows are intentionally NOT cascaded — activity is append-only for
   * forensic purposes. If a tenant requires hard erasure for compliance, that's a
   * separate operator workflow (currently: manual delete-by-query).
   */
  deleteCase(caseId: string): void {
    void this.fireAndForget('case', caseId, () => this.doDeleteCase(caseId));
  }

  /**
   * Append an activity row. Called by `CaseUserActionService` post-success.
   */
  appendActivity(so: SavedObject<UserActionPersistedAttributes>): void {
    void this.fireAndForget('case_activity', so.id, () => this.doAppendActivity(so));
  }

  /**
   * Recompute and upsert the lifecycle document for a case. Called from the cases
   * client's update path on close/reopen.
   */
  recomputeLifecycle(caseId: string): void {
    void this.fireAndForget('case_lifecycle', caseId, () => this.doRecomputeLifecycle(caseId));
  }

  // --- Private "do" methods. These throw on failure so both the fire-and-forget
  //     and awaited paths can apply their own error handling. ---

  private async doUpsertCase(so: SavedObject<CasePersistedAttributes>): Promise<void> {
    const doc = buildCaseDoc(so);
    await this.esClient.index({
      index: CASES_DATA_CASE_ALIAS,
      id: so.id,
      document: doc,
    });
  }

  private async doDeleteCase(caseId: string): Promise<void> {
    // Both deletes run sequentially inside one logical "case delete" so a
    // partial failure (case doc gone, lifecycle doc still present) is observable
    // through the Promise contract on the awaited path. Reconciliation reruns
    // delete on the next tick if the lifecycle doc is still around.
    await this.deleteByIdSwallow404(CASES_DATA_CASE_ALIAS, caseId);
    await this.deleteByIdSwallow404(CASES_DATA_CASE_LIFECYCLE_ALIAS, caseId);
  }

  private async doAppendActivity(so: SavedObject<UserActionPersistedAttributes>): Promise<void> {
    const doc = buildActivityDoc(so);
    if (doc == null) {
      this.logger.debug(`cases.analytics: user-action ${so.id} has no case reference; skipping`);
      return;
    }
    await this.esClient.index({
      index: CASES_DATA_CASE_ACTIVITY_ALIAS,
      id: so.id,
      document: doc,
    });
  }

  private async doRecomputeLifecycle(caseId: string): Promise<void> {
    const caseSO = await this.fetchCase(caseId);
    if (!caseSO) {
      this.logger.debug(
        `cases.analytics: lifecycle recompute for ${caseId} skipped — case not found`
      );
      return;
    }
    const activity = await this.fetchActivityForCase(caseId);
    const doc = buildLifecycleDoc(caseSO, activity);
    await this.esClient.index({
      index: CASES_DATA_CASE_LIFECYCLE_ALIAS,
      id: caseId,
      document: doc,
    });
  }

  private async deleteByIdSwallow404(index: string, id: string): Promise<void> {
    try {
      await this.esClient.delete({ index, id });
    } catch (err) {
      // 404 is the happy path for a delete: the doc may have never been indexed,
      // or reconciliation hasn't picked it up yet. Swallow at debug.
      if (err?.statusCode === 404 || err?.meta?.statusCode === 404) {
        this.logger.debug(`cases.analytics: ${id} not present in ${index}; skipping`);
        return;
      }
      throw err;
    }
  }

  /**
   * Fire-and-forget wrapper used by the synchronous SO-service hooks. Errors
   * are logged at ERROR and swallowed — the API response must never fail
   * because analytics couldn't write.
   */
  private fireAndForget(
    surface: CasesDataSurface,
    targetId: string,
    op: () => Promise<void>
  ): Promise<void> {
    return withRetry({
      op,
      maxRetries: this.maxRetries,
      initialDelayMs: this.retryInitialDelayMs,
    }).catch((err: Error) => {
      // Logged at ERROR (not WARN) so failures surface in default operator
      // dashboards — silent failures here look identical to "the feature isn't
      // wired up at all" and waste debug time. The error is still NOT
      // propagated to the API caller.
      this.logger.error(
        `cases.analytics write failed [surface=${surface} id=${targetId}]: ${err.message}`,
        { error: err }
      );
    });
  }

  /**
   * Awaited wrapper used by the reconciliation runner. Same retry policy as the
   * fire-and-forget path, but returns whether the write succeeded so the runner
   * can decide whether to advance the watermark. The error is logged once
   * inside (so we don't lose visibility) but NOT thrown — the runner doesn't
   * need to distinguish failure modes, just count them.
   */
  private async tryAwait(
    surface: CasesDataSurface,
    targetId: string,
    op: () => Promise<void>
  ): Promise<boolean> {
    try {
      await withRetry({
        op,
        maxRetries: this.maxRetries,
        initialDelayMs: this.retryInitialDelayMs,
      });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `cases.analytics write failed (awaited) [surface=${surface} id=${targetId}]: ${message}`,
        { error: err }
      );
      return false;
    }
  }
}

export type CasesAnalyticsWriterContract = Pick<
  CasesAnalyticsWriter,
  'upsertCase' | 'deleteCase' | 'appendActivity' | 'recomputeLifecycle' | 'awaited'
>;

/**
 * No-op stand-in for the writer when the analytics feature is disabled. SO
 * services keep an unconditional call shape (no `if (writer)` guard at every
 * call site). The awaited variant returns `Promise.resolve(true)` so a
 * disabled feature looks like "every write succeeded" to the reconciliation
 * runner — which is fine because the runner doesn't run when disabled either.
 */
export const NOOP_WRITER: CasesAnalyticsWriterContract = {
  upsertCase: () => {},
  deleteCase: () => {},
  appendActivity: () => {},
  recomputeLifecycle: () => {},
  awaited: {
    upsertCase: () => Promise.resolve(true),
    deleteCase: () => Promise.resolve(true),
    appendActivity: () => Promise.resolve(true),
    recomputeLifecycle: () => Promise.resolve(true),
  },
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger, SavedObject } from '@kbn/core/server';
import type { CasePersistedAttributes } from '../../common/types/case';
import { CASE_INDEX_NAME } from '../constants';
import { buildCaseDoc } from './case_doc_builder';
import { withRetry } from './retry';

/**
 * Default retry budget for analytics writes. A handful of attempts is enough
 * to ride out a brief ES blip; beyond that, reconciliation is the durability
 * backstop. Kept low so a sustained outage doesn't queue up unbounded
 * background work.
 */
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_INITIAL_DELAY_MS = 250;

interface CasesAnalyticsV2WriterDeps {
  esClient: ElasticsearchClient;
  logger: Logger;
  /** Override for tests. Production uses the defaults. */
  maxRetries?: number;
  /** Override for tests. Production uses the defaults. */
  retryInitialDelayMs?: number;
}

/**
 * Public hook surface invoked from the cases SO services post-write success.
 *
 * The contract is **fire-and-forget**: callers don't await, errors are logged
 * at WARN and never propagate. The cases plugin's primary write path must
 * never fail because analytics had trouble — analytics is a downstream
 * derivation, not part of the user's transactional commit. Reconciliation
 * is the durability backstop: any write that fails its retry budget gets
 * re-emitted on the next tick.
 *
 * **Bulk variants exist for batched writes.** The single-item methods
 * (`upsertCase`, `deleteCase`) call ES once per item. The bulk variants
 * (`bulkUpsertCases`, `bulkDeleteCases`) collapse N writes into one
 * `_bulk` request — required for the SO services' bulk operations and
 * the reconciliation runner's page loop, where naïve per-item dispatch
 * would saturate the ES connection pool on large batches.
 *
 * **`bulkUpsertCasesAwait`** is the only awaitable method. Reconciliation
 * uses it so each page's writes complete before the next page is fetched
 * — bounds concurrency to one in-flight bulk per runner. SO-service hooks
 * never wait on analytics; they use the fire-and-forget variants.
 */
export interface CasesAnalyticsV2WriterContract {
  upsertCase: (so: SavedObject<CasePersistedAttributes>) => void;
  deleteCase: (caseId: string) => void;
  bulkUpsertCases: (sos: Array<SavedObject<CasePersistedAttributes>>) => void;
  bulkDeleteCases: (caseIds: string[]) => void;
  bulkUpsertCasesAwait: (sos: Array<SavedObject<CasePersistedAttributes>>) => Promise<void>;
}

export class CasesAnalyticsV2Writer implements CasesAnalyticsV2WriterContract {
  private readonly esClient: ElasticsearchClient;
  private readonly logger: Logger;
  private readonly maxRetries: number;
  private readonly retryInitialDelayMs: number;

  constructor(deps: CasesAnalyticsV2WriterDeps) {
    this.esClient = deps.esClient;
    this.logger = deps.logger.get('writer');
    this.maxRetries = deps.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.retryInitialDelayMs = deps.retryInitialDelayMs ?? DEFAULT_INITIAL_DELAY_MS;
  }

  /**
   * Upsert the analytics doc for a case. Called by `CasesService.createCase`
   * and `patchCase` post-success. Fire-and-forget: caller does not await.
   */
  public upsertCase(so: SavedObject<CasePersistedAttributes>): void {
    void this.fireAndForget(`case[id=${so.id}]`, () => this.doUpsertCase(so));
  }

  /**
   * Drop the analytics doc for a case. Called by `CasesService.deleteCase`
   * post-success. Fire-and-forget.
   */
  public deleteCase(caseId: string): void {
    void this.fireAndForget(`case[id=${caseId}]`, () => this.doDeleteCase(caseId));
  }

  /**
   * Bulk-upsert N case docs in a single `_bulk` request. Called by
   * `CasesService.bulkCreateCases` and `bulkPatchCases` post-success.
   * Fire-and-forget.
   *
   * **Why bulk instead of N single upserts.** A 1000-case bulk patch would
   * otherwise fire 1000 individual `index` requests into the ES connection
   * pool Kibana shares cluster-wide. Pool saturation and queue back-pressure
   * become visible to other plugins. Collapsing to one bulk request keeps
   * the amplification factor at 1×.
   */
  public bulkUpsertCases(sos: Array<SavedObject<CasePersistedAttributes>>): void {
    if (sos.length === 0) return;
    void this.fireAndForget(`bulk[count=${sos.length}]`, () => this.doBulkUpsertCases(sos));
  }

  /**
   * Bulk-delete N analytics docs in a single `_bulk` request. Called by
   * `CasesService.bulkDeleteCaseEntities` for entries whose SO delete
   * succeeded. Fire-and-forget.
   */
  public bulkDeleteCases(caseIds: string[]): void {
    if (caseIds.length === 0) return;
    void this.fireAndForget(`bulk-delete[count=${caseIds.length}]`, () =>
      this.doBulkDeleteCases(caseIds)
    );
  }

  /**
   * Awaitable bulk-upsert. Same dispatch as `bulkUpsertCases`, but the
   * caller can `await` completion (or post-retry-budget failure-log).
   *
   * Reserved for the reconciliation runner — running a single bulk per page
   * with `await` between pages serializes pages and bounds concurrency to
   * one in-flight bulk at a time. Without this, a 50k-case backfill
   * (`/reset` followed by reconciliation with `lastRunAt: undefined`) would
   * fire ~500 concurrent bulks into the ES connection pool.
   *
   * Never throws — errors are caught + logged inside `fireAndForget`.
   */
  public async bulkUpsertCasesAwait(
    sos: Array<SavedObject<CasePersistedAttributes>>
  ): Promise<void> {
    if (sos.length === 0) return;
    await this.fireAndForget(`bulk-awaited[count=${sos.length}]`, () =>
      this.doBulkUpsertCases(sos)
    );
  }

  // ----- Private "do" methods. Throw on failure so the retry wrapper can see. -----

  private async doUpsertCase(so: SavedObject<CasePersistedAttributes>): Promise<void> {
    const doc = buildCaseDoc(so);
    await this.esClient.index({
      index: CASE_INDEX_NAME,
      id: so.id,
      document: doc,
    });
  }

  private async doDeleteCase(caseId: string): Promise<void> {
    try {
      await this.esClient.delete({ index: CASE_INDEX_NAME, id: caseId });
    } catch (err) {
      // 404 is the happy path: doc may have never been indexed (analytics
      // disabled at create time, or the upsert failed and reconciliation
      // hadn't picked it up yet). Either way, the desired post-state
      // ("doc absent") is already met.
      if (err?.statusCode === 404 || err?.meta?.statusCode === 404) return;
      throw err;
    }
  }

  /**
   * Single `_bulk` request that indexes every supplied case as an upsert
   * (operation type `index`, which overwrites by `_id`). The bulk-level
   * promise resolves whether or not individual items failed — per-item
   * errors (typically mapper exceptions on a single bad doc) are logged
   * but don't trigger retry. Reconciliation is the backstop for those.
   *
   * Throws only on bulk-request-level failure (network, cluster down,
   * etc.), which lets `withRetry` re-attempt the entire batch.
   */
  private async doBulkUpsertCases(sos: Array<SavedObject<CasePersistedAttributes>>): Promise<void> {
    // The ES `_bulk` API takes a flat array alternating between operation
    // headers and document bodies. `operations` types accept arbitrary
    // header shapes; we use plain object literals to avoid pulling in
    // estypes for one line per side.
    const operations: object[] = [];
    for (const so of sos) {
      operations.push({ index: { _index: CASE_INDEX_NAME, _id: so.id } });
      operations.push(buildCaseDoc(so));
    }
    const response = await this.esClient.bulk({ operations });
    if (response.errors) {
      this.logBulkItemErrors(
        'upsert',
        sos.map((so) => so.id),
        response.items,
        'index'
      );
    }
  }

  /**
   * Single `_bulk` request that deletes every supplied case-id. Per-item
   * 404s are silently swallowed (the desired post-state — doc absent — is
   * already met). Other per-item errors are logged but don't trigger
   * retry; reconciliation is the backstop. Throws on bulk-request-level
   * failures so `withRetry` can re-attempt.
   */
  private async doBulkDeleteCases(caseIds: string[]): Promise<void> {
    const operations: object[] = caseIds.map((id) => ({
      delete: { _index: CASE_INDEX_NAME, _id: id },
    }));
    const response = await this.esClient.bulk({ operations });
    if (response.errors) {
      this.logBulkItemErrors('delete', caseIds, response.items, 'delete');
    }
  }

  /**
   * Walk bulk-response items, log per-item errors at WARN. Skips 404s for
   * delete operations — "already absent" is the post-state we want.
   */
  private logBulkItemErrors(
    label: 'upsert' | 'delete',
    ids: string[],
    items: BulkResponseItem[],
    opKey: 'index' | 'delete'
  ): void {
    let logged = 0;
    items.forEach((item, idx) => {
      const op = item[opKey];
      if (op?.error == null) return;
      if (opKey === 'delete' && op.status === 404) return;
      this.logger.warn(
        `cases.analyticsV2 bulk-${label} item failed [id=${ids[idx]}]: ${
          op.error.reason ?? 'unknown'
        }`
      );
      logged++;
    });
    if (logged > 0) {
      this.logger.warn(
        `cases.analyticsV2 bulk-${label} completed with ${logged}/${ids.length} item failures; reconciliation will retry`
      );
    }
  }

  /**
   * Fire-and-forget wrapper. Errors logged at WARN (downgraded from ERROR
   * with the bulk migration — write amplification meant one transient blip
   * could spam thousands of ERROR lines on bulk operations, drowning out
   * real problems and tripping operator alerting). Reconciliation is the
   * proven backstop; a post-retry-budget write failure isn't an alert
   * condition.
   *
   * The returned promise resolves on success OR after the post-retry-budget
   * log. It never rejects. Single-item callers `void` it; reconciliation's
   * awaited variant awaits it for serialization.
   */
  private fireAndForget(targetId: string, op: () => Promise<void>): Promise<void> {
    return withRetry({
      op,
      maxRetries: this.maxRetries,
      initialDelayMs: this.retryInitialDelayMs,
    }).catch((err: Error) => {
      this.logger.warn(
        `cases.analyticsV2 write failed after ${this.maxRetries} retries [${targetId}]: ${err.message}. Reconciliation will retry.`,
        { error: err }
      );
    });
  }
}

/**
 * Minimal shape of a single response item from `esClient.bulk`. The full
 * type from `@elastic/elasticsearch` carries every possible operation
 * shape and ends up needing casts at every use; this captures just the
 * fields the writer needs (status code + error reason), keyed by op type.
 */
interface BulkResponseItem {
  index?: { status?: number; error?: { reason?: string } };
  delete?: { status?: number; error?: { reason?: string } };
}

/**
 * No-op stand-in for the writer when v2 is disabled. SO services keep an
 * unconditional call shape (no `if (writer)` guard at every call site) — when
 * the feature flag is off, the writer they hold is this no-op and the calls
 * compile out to nothing.
 */
export const V2_NOOP_WRITER: CasesAnalyticsV2WriterContract = {
  upsertCase: () => {},
  deleteCase: () => {},
  bulkUpsertCases: () => {},
  bulkDeleteCases: () => {},
  bulkUpsertCasesAwait: async () => {},
};

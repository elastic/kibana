/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger, SavedObject } from '@kbn/core/server';
import type {
  AttachmentPersistedAttributes,
  UnifiedAttachmentAttributes,
} from '../../common/types/attachments_v2';
import { ATTACHMENTS_INDEX_NAME } from '../constants';
import { buildAttachmentDoc } from './attachments_doc_builder';
import { withRetry } from './retry';

/**
 * Default retry budget for attachments writes. Same defaults as the
 * cases + activity writers — a handful of attempts is enough to ride
 * out a brief ES blip; beyond that, reconciliation is the durability
 * backstop.
 */
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_INITIAL_DELAY_MS = 250;

/**
 * HTTP status codes treated as transient failures on a per-item bulk
 * response. Anything else (400 mapper_parsing_exception, 403 forbidden,
 * etc.) is permanent — retrying won't help.
 */
const RETRYABLE_BULK_ITEM_STATUSES = new Set<number>([408, 409, 429, 500, 502, 503, 504]);

/**
 * Source-SO union for the attachments writer. The same writer hooks
 * fire from BOTH source types, which coexist (legacy comments are not
 * back-migrated):
 *   - `AttachmentService` writes against `cases-comments` (legacy SO) —
 *     `AttachmentPersistedAttributes`.
 *   - `AttachmentService` writes against `cases-attachments` (unified
 *     SO) — `UnifiedAttachmentAttributes`.
 * The doc-builder normalizes both into the unified analytics shape.
 * See `buildAttachmentDoc`.
 */
export type AttachmentSource = SavedObject<
  AttachmentPersistedAttributes | UnifiedAttachmentAttributes
>;

interface CasesAttachmentsV2WriterDeps {
  esClient: ElasticsearchClient;
  logger: Logger;
  /** Override for tests. Production uses the defaults. */
  maxRetries?: number;
  /** Override for tests. Production uses the defaults. */
  retryInitialDelayMs?: number;
}

/**
 * Hook surface invoked by the AttachmentService after a successful
 * persisted-write. Attachments are mutable (create + patch + delete),
 * so the contract carries the full upsert + delete + cascade shape —
 * mirrors the cases-surface writer (not the activity-surface writer,
 * which omits the patch and per-id-delete paths).
 *
 * Fire-and-forget: callers don't await, errors log at WARN and never
 * propagate. The attachment SO write must never fail because analytics
 * had trouble; reconciliation re-emits anything that exhausts its
 * retry budget.
 *
 * `bulkUpsertAttachmentsAwait` is the only awaitable method. The
 * reconciliation runner awaits between pages to bound in-flight bulks
 * to one per runner; SO-service hooks always use the fire-and-forget
 * variants.
 */
export interface CasesAttachmentsV2WriterContract {
  upsertAttachment: (so: AttachmentSource) => void;
  deleteAttachment: (id: string) => void;
  bulkUpsertAttachments: (sos: AttachmentSource[]) => void;
  bulkDeleteAttachments: (ids: string[]) => void;
  /**
   * Cascade-delete every analytics doc whose `cases.id` matches one of
   * the supplied case ids. Called from `CasesService.deleteCase` /
   * `bulkDeleteCaseEntities` so the analytics mirror tracks the
   * SO-layer cascade — see writer §1.14 in the README.
   */
  bulkDeleteAttachmentsByCaseIds: (caseIds: string[]) => void;
  bulkUpsertAttachmentsAwait: (sos: AttachmentSource[]) => Promise<void>;
}

export class CasesAttachmentsV2Writer implements CasesAttachmentsV2WriterContract {
  private readonly esClient: ElasticsearchClient;
  private readonly logger: Logger;
  private readonly maxRetries: number;
  private readonly retryInitialDelayMs: number;

  constructor(deps: CasesAttachmentsV2WriterDeps) {
    this.esClient = deps.esClient;
    this.logger = deps.logger.get('attachments-writer');
    this.maxRetries = deps.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.retryInitialDelayMs = deps.retryInitialDelayMs ?? DEFAULT_INITIAL_DELAY_MS;
  }

  /**
   * Upsert the analytics doc for one attachment SO. Fire-and-forget.
   * Called by `AttachmentService.create` / `update` post-success.
   * `update` reuses the same path because the analytics doc is
   * identity-keyed on the SO id and `index` overwrites by `_id`.
   */
  public upsertAttachment(so: AttachmentSource): void {
    void this.fireAndForget(`attachment[id=${so.id}]`, () => this.doUpsertAttachment(so));
  }

  /**
   * Delete the analytics doc for a single attachment SO id. Called by
   * `AttachmentService.bulkDelete` post-success when only one id was
   * deleted. Fire-and-forget. 404s are silently swallowed (the
   * post-state — "doc gone" — is already met).
   */
  public deleteAttachment(id: string): void {
    void this.fireAndForget(`attachment[id=${id}]`, () => this.doDeleteAttachment(id));
  }

  /**
   * Bulk-upsert N attachment docs in a single `_bulk` request. Called
   * by `AttachmentService.bulkCreate` / `bulkUpdate` post-success.
   * Fire-and-forget. Single bulk keeps the per-write amplification
   * factor at 1× regardless of batch size.
   */
  public bulkUpsertAttachments(sos: AttachmentSource[]): void {
    if (sos.length === 0) return;
    void this.fireAndForget(`bulk-upsert[count=${sos.length}]`, () =>
      this.doBulkUpsertAttachments(sos)
    );
  }

  /**
   * Bulk-delete N attachment docs in a single `_bulk` request. Called
   * by `AttachmentService.bulkDelete` post-success. Fire-and-forget.
   * 404s on a per-item basis are silently swallowed (post-state
   * already met).
   */
  public bulkDeleteAttachments(ids: string[]): void {
    if (ids.length === 0) return;
    void this.fireAndForget(`bulk-delete[count=${ids.length}]`, () =>
      this.doBulkDeleteAttachments(ids)
    );
  }

  /**
   * Cascade-delete every analytics attachment doc whose `cases.id`
   * matches one of the supplied case ids. Called by
   * `CasesService.deleteCase` / `bulkDeleteCaseEntities` for case-level
   * deletions. Fire-and-forget. Implementation mirrors the activity
   * writer's `bulkDeleteActionsByCaseIds`: `delete_by_query` rather
   * than `_bulk` because the writer doesn't know which attachment ids
   * existed for the deleted cases, and the SO service has already
   * deleted the source SOs.
   *
   * The reconciliation filter (`updated_at > tracker OR updated_at IS
   * NULL`) won't re-emit a doc whose source SO is gone — but it also
   * can't see the gap to drop it. Without this explicit cascade the
   * analytics doc would survive past the case-SO delete forever.
   */
  public bulkDeleteAttachmentsByCaseIds(caseIds: string[]): void {
    if (caseIds.length === 0) return;
    void this.fireAndForget(`delete-by-cases[count=${caseIds.length}]`, () =>
      this.doDeleteAttachmentsByCaseIds(caseIds)
    );
  }

  /**
   * Awaitable bulk-upsert. Same dispatch as `bulkUpsertAttachments`;
   * reserved for the reconciliation runner so a large attachments
   * backfill awaits between pages instead of firing many concurrent
   * bulks at the ES pool.
   *
   * Throws on bulk-level failure or after retries exhaust on bulks
   * with retryable per-item failures (429 / 503 / etc.).
   * Reconciliation relies on this to keep its cursor pinned: advancing
   * past a tick with a transient blip would leave the affected
   * attachments un-mirrored until they're patched (and freshly-created
   * attachments without a patch never advance their `updated_at`, so
   * those would be stranded indefinitely without the OR-NULL filter
   * branch). Permanent per-item failures (e.g. mapper errors) are
   * logged but do not throw; those docs cannot be repaired by
   * reconciliation and must not freeze every subsequent tick.
   */
  public async bulkUpsertAttachmentsAwait(sos: AttachmentSource[]): Promise<void> {
    if (sos.length === 0) return;
    try {
      await withRetry({
        op: () => this.doBulkUpsertAttachments(sos, { throwOnRetryableItemFailures: true }),
        maxRetries: this.maxRetries,
        initialDelayMs: this.retryInitialDelayMs,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `cases-analyticsV2: attachments bulk-awaited write failed after ${this.maxRetries} retries [count=${sos.length}]: ${message}. Tracker pinned; reconciliation will retry the same window.`,
        { error: err }
      );
      throw err;
    }
  }

  // ----- Private "do" methods. Throw on failure so the retry wrapper can see. -----

  private async doUpsertAttachment(so: AttachmentSource): Promise<void> {
    const doc = buildAttachmentDoc(so);
    await this.esClient.index({
      index: ATTACHMENTS_INDEX_NAME,
      id: so.id,
      document: doc,
    });
  }

  private async doDeleteAttachment(id: string): Promise<void> {
    try {
      await this.esClient.delete({
        index: ATTACHMENTS_INDEX_NAME,
        id,
      });
    } catch (err) {
      // 404 is the post-state we wanted; treat as success. Anything
      // else throws to the retry wrapper.
      if (err?.statusCode === 404 || err?.meta?.statusCode === 404) return;
      throw err;
    }
  }

  /**
   * Single `_bulk` request that indexes every supplied attachment as
   * an upsert (operation type `index`, which overwrites by `_id`). The
   * bulk-level promise resolves regardless of individual item
   * failures; per-item errors (typically mapper exceptions on a single
   * bad doc) are logged but don't trigger retry. Reconciliation is the
   * backstop.
   *
   * Throws only on bulk-request-level failure (network, cluster down,
   * etc.), which lets `withRetry` re-attempt the entire batch.
   */
  private async doBulkUpsertAttachments(
    sos: AttachmentSource[],
    opts?: { throwOnRetryableItemFailures?: boolean }
  ): Promise<void> {
    const operations: object[] = [];
    for (const so of sos) {
      operations.push({ index: { _index: ATTACHMENTS_INDEX_NAME, _id: so.id } });
      operations.push(buildAttachmentDoc(so));
    }
    const response = await this.esClient.bulk({ operations });
    if (!response.errors) return;

    const ids: string[] = [];
    for (const so of sos) ids.push(so.id);
    const { retryableCount } = this.logBulkItemErrors('upsert', ids, response.items, 'index');

    if (opts?.throwOnRetryableItemFailures && retryableCount > 0) {
      throw new Error(
        `cases-analyticsV2: attachments bulk upsert had ${retryableCount}/${sos.length} retryable item failure(s)`
      );
    }
  }

  /**
   * Single `_bulk` request that deletes every supplied attachment id.
   * Per-item 404s are silently swallowed (the post-state — "doc gone"
   * — is already met) so concurrent reset-after-delete races don't
   * spam WARN logs.
   */
  private async doBulkDeleteAttachments(ids: string[]): Promise<void> {
    const operations: object[] = [];
    for (const id of ids) {
      operations.push({ delete: { _index: ATTACHMENTS_INDEX_NAME, _id: id } });
    }
    const response = await this.esClient.bulk({ operations });
    if (!response.errors) return;

    // Filter out 404s before logging; treat them as success.
    const errorItems = response.items.filter((item) => {
      const op = item.delete;
      const status = op?.status ?? 0;
      return op?.error != null && status !== 404;
    });
    if (errorItems.length === 0) return;

    this.logBulkItemErrors('delete', ids, response.items, 'delete');
  }

  private async doDeleteAttachmentsByCaseIds(caseIds: string[]): Promise<void> {
    try {
      await this.esClient.deleteByQuery({
        index: ATTACHMENTS_INDEX_NAME,
        // `refresh: false`: bulk cascade deletes are background work.
        // Forcing a refresh on every case-batch delete would be
        // expensive on tenants that delete in bulk, and the small
        // window where analytics docs survive past the case SO delete
        // is acceptable since this surface is eventually consistent.
        refresh: false,
        // `conflicts: proceed`: a concurrent reconciliation re-emit
        // could race; skip the conflicting doc rather than failing the
        // whole delete-by-query. The next reconciliation tick won't
        // re-emit anyway because the source SO is gone.
        conflicts: 'proceed',
        query: {
          terms: { 'cases.id': caseIds },
        },
      });
    } catch (err) {
      // 404 on the index itself means the bootstrap hasn't happened
      // yet (analytics was enabled mid-flight). Nothing to delete.
      if (err?.statusCode === 404 || err?.meta?.statusCode === 404) return;
      throw err;
    }
  }

  /**
   * Walk bulk-response items, log per-item errors at WARN, and report
   * how many were transient (retryable). 404s on delete operations
   * are skipped (handled in the caller) so they never count toward
   * either the logged or retryable totals.
   */
  private logBulkItemErrors(
    label: 'upsert' | 'delete',
    ids: string[],
    items: BulkResponseItem[],
    opKey: 'index' | 'delete'
  ): { loggedCount: number; retryableCount: number } {
    let loggedCount = 0;
    let retryableCount = 0;
    for (let idx = 0; idx < items.length; idx++) {
      const op = items[idx][opKey];
      // Skip items that succeeded; only failures get logged. 404 on
      // delete is the post-state we wanted, so it's not a failure either.
      if (op?.error != null) {
        const status = op.status ?? 0;
        const is404OnDelete = opKey === 'delete' && status === 404;
        if (!is404OnDelete) {
          const isRetryable = RETRYABLE_BULK_ITEM_STATUSES.has(status);
          if (isRetryable) retryableCount++;

          this.logger.warn(
            `cases-analyticsV2: attachments bulk-${label} item failed [id=${
              ids[idx]
            }, status=${status}, retryable=${isRetryable}]: ${op.error.reason ?? 'unknown'}`
          );
          loggedCount++;
        }
      }
    }
    if (loggedCount > 0) {
      this.logger.warn(
        `cases-analyticsV2: attachments bulk-${label} completed with ${loggedCount}/${ids.length} item failures (${retryableCount} retryable)`
      );
    }
    return { loggedCount, retryableCount };
  }

  /**
   * Fire-and-forget wrapper. Errors log at WARN, not ERROR: bulk write
   * amplification means a transient blip could spam thousands of
   * lines and trip on-call alerting on something reconciliation will
   * repair anyway.
   *
   * The returned promise resolves on success or after the post-retry-
   * budget log; it never rejects. Single-item callers `void` it.
   */
  private fireAndForget(targetId: string, op: () => Promise<void>): Promise<void> {
    return withRetry({
      op,
      maxRetries: this.maxRetries,
      initialDelayMs: this.retryInitialDelayMs,
    }).catch((err: Error) => {
      this.logger.warn(
        `cases-analyticsV2: attachments write failed after ${this.maxRetries} retries [${targetId}]: ${err.message}. Reconciliation will retry.`,
        { error: err }
      );
    });
  }
}

/**
 * Minimal shape of a single response item from `esClient.bulk`. Both
 * `index` (upsert) and `delete` ops are needed because the attachments
 * writer carries an explicit per-id delete path (the activity writer
 * doesn't — user actions cascade-delete only by case id).
 */
interface BulkResponseItem {
  index?: { status?: number; error?: { reason?: string | null } };
  delete?: { status?: number; error?: { reason?: string | null } };
}

/** No-op attachments writer used when v2 is disabled. See `V2_NOOP_WRITER` in `../writer`. */
export const V2_NOOP_ATTACHMENTS_WRITER: CasesAttachmentsV2WriterContract = {
  upsertAttachment: () => {},
  deleteAttachment: () => {},
  bulkUpsertAttachments: () => {},
  bulkDeleteAttachments: () => {},
  bulkDeleteAttachmentsByCaseIds: () => {},
  bulkUpsertAttachmentsAwait: async () => {},
};

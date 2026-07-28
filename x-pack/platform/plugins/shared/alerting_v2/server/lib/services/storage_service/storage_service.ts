/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkRequest, BulkResponse } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import { inject, injectable } from 'inversify';
import type { LoggerServiceContract } from '../logger_service/logger_service';
import { LoggerServiceToken } from '../logger_service/logger_service';

/** Parameters for {@link StorageServiceContract.bulkIndexDocs}. */
export interface BulkIndexDocsParams<TDocument extends Record<string, unknown>> {
  index: string;
  docs: readonly TDocument[];
  /** When `'wait_for'`, the bulk call blocks until the indexed documents are visible to search. Defaults to `false`. */
  refresh?: boolean | 'wait_for';
}

/**
 * A single per-document rejection from a bulk write. The `document` field
 * holds the same reference the caller passed in, so callers correlate the
 * failure back to their input by identity — no positional bookkeeping.
 *
 * Field naming aligns with the plugin's `ErrorResponse` envelope
 * (`{ code, message, details? }`) to keep every error surface in the plugin
 * structurally consistent. Distinct from `ErrorResponse` because this is an
 * INBOUND error transported from Elasticsearch rather than an OUTBOUND API
 * error we author. Concrete differences:
 *
 * - `code` here is Elasticsearch's `error.type` (e.g.
 *   `'mapper_parsing_exception'`). It is NOT part of the alerting v2 HTTP
 *   API contract and is not governed by `ALERTING_V2_ERROR_CODES` — the
 *   catalog is owned by Elasticsearch.
 * - ES's HTTP-shaped per-item status is demoted to `details.statusCode`.
 *   Envelope-level `statusCode` would leak an HTTP concern into an internal
 *   service result; per-item observability data belongs in `details`.
 */
export interface BulkIndexError<TDocument extends Record<string, unknown>> {
  /**
   * Machine-readable identifier for the rejection. Sourced from
   * Elasticsearch's `error.type` (e.g. `'mapper_parsing_exception'`,
   * `'version_conflict_engine_exception'`). Consumers group / branch on
   * this value.
   */
  readonly code: string;
  /** Human-readable reason from ES (`error.reason`). Not stable — do not parse. */
  readonly message: string;
  /**
   * Structured, per-error context. Carries ES-specific fields that don't
   * belong at the envelope level — notably `statusCode` (ES's per-item HTTP
   * status). Shape is open by design: consumers that care about
   * ES-specific transport observability read it from here; consumers that
   * only care about identity + message ignore it.
   */
  readonly details?: Readonly<Record<string, unknown>>;
  /** Target data stream / index the failed write was destined for. */
  readonly index: string;
  /** Reference to the input document that was rejected (same object identity). */
  readonly document: TDocument;
}

/**
 * Per-batch bulk persistence outcome returned by the bulk index methods.
 *
 * A successful call to `esClient.bulk` may still contain per-item errors
 * (`response.errors === true`). Callers get two symmetric arrays back:
 * `docs` for what persisted and `errors` for what didn't. No correlation
 * against the input array is required — consumers iterate the arrays
 * directly.
 *
 * `attempted` is redundant with `docs.length + errors.length` but retained
 * as a caller-facing invariant ("here's the input count I saw"), useful for
 * sanity assertions and logging without walking either array.
 */
export interface BulkIndexResult<TDocument extends Record<string, unknown>> {
  /**
   * Number of documents submitted to the bulk request. Always equal to
   * `docs.length + errors.length`.
   */
  readonly attempted: number;
  /**
   * Documents Elasticsearch acknowledged as created. Each element is the
   * exact reference the caller passed in `params.docs`.
   */
  readonly docs: readonly TDocument[];
  /**
   * Per-document rejections. Empty when all docs persisted. `error.document`
   * carries the input reference so callers can log or replay the failed
   * doc without any correlation step.
   */
  readonly errors: ReadonlyArray<BulkIndexError<TDocument>>;
}

/**
 * Parameters for {@link StorageServiceContract.bulkIndexDocsAcrossIndices}.
 *
 * The doc element is intentionally typed as `Record<string, unknown>` rather
 * than a generic: this method is for heterogeneous batches (different shapes
 * per element), and tying every doc to a single `TDocument` either forces
 * callers to spell out the union or breaks inference. Each caller composes
 * the batch from its own typed inputs and the runtime is shape-agnostic.
 */
export interface BulkIndexDocsAcrossIndicesParams {
  docs: ReadonlyArray<{ index: string; doc: Record<string, unknown> }>;
  /** When `'wait_for'`, the bulk call blocks until the indexed documents are visible to search. Defaults to `false`. */
  refresh?: boolean | 'wait_for';
}

export interface StorageServiceContract {
  /**
   * Bulk-index N documents into a single target index.
   *
   * Resolves with a {@link BulkIndexResult} describing how many docs
   * persisted. A thrown error indicates the entire bulk call failed (network,
   * auth, malformed request); per-doc failures surface via `result.errors`
   * on an otherwise resolved promise.
   */
  bulkIndexDocs<TDocument extends Record<string, unknown>>(
    params: BulkIndexDocsParams<TDocument>
  ): Promise<BulkIndexResult<TDocument>>;

  /**
   * Bulk-index N documents where each doc carries its own target index.
   *
   * Use when one logical operation must atomically fan out across data
   * streams (e.g. writing a rule event and an audit action in one round-trip).
   * Operations are submitted in array order.
   *
   * Same success/error contract as {@link StorageServiceContract.bulkIndexDocs}.
   */
  bulkIndexDocsAcrossIndices(
    params: BulkIndexDocsAcrossIndicesParams
  ): Promise<BulkIndexResult<Record<string, unknown>>>;
}

@injectable()
export class StorageService implements StorageServiceContract {
  constructor(
    private readonly esClient: ElasticsearchClient,
    @inject(LoggerServiceToken) private readonly logger: LoggerServiceContract
  ) {}

  public async bulkIndexDocs<TDocument extends Record<string, unknown>>(
    params: BulkIndexDocsParams<TDocument>
  ): Promise<BulkIndexResult<TDocument>> {
    const entries = params.docs.map((doc) => ({ index: params.index, doc }));
    return this.writeBulk<TDocument>(entries, params.refresh ?? false);
  }

  public async bulkIndexDocsAcrossIndices(
    params: BulkIndexDocsAcrossIndicesParams
  ): Promise<BulkIndexResult<Record<string, unknown>>> {
    return this.writeBulk<Record<string, unknown>>(params.docs, params.refresh ?? false);
  }

  private async writeBulk<TDocument extends Record<string, unknown>>(
    entries: ReadonlyArray<{ index: string; doc: TDocument }>,
    refresh: boolean | 'wait_for'
  ): Promise<BulkIndexResult<TDocument>> {
    if (entries.length === 0) {
      return { attempted: 0, docs: [], errors: [] };
    }

    const operations: NonNullable<BulkRequest<TDocument>['operations']> = entries.flatMap(
      ({ index, doc }) => [{ create: { _index: index } }, doc]
    );

    const indexLabel = Array.from(new Set(entries.map((entry) => entry.index))).join(', ');

    try {
      const response = await this.esClient.bulk({
        operations,
        refresh,
      });

      this.logBulkIndexResponse({ index: indexLabel, docsCount: entries.length, response });

      return this.summarizeBulkResponse<TDocument>({ entries, response });
    } catch (error) {
      this.logger.error({
        error,
        code: 'BULK_INDEX_ERROR',
        type: 'StorageServiceError',
      });

      throw error;
    }
  }

  private summarizeBulkResponse<TDocument extends Record<string, unknown>>({
    entries,
    response,
  }: {
    entries: ReadonlyArray<{ index: string; doc: TDocument }>;
    response: BulkResponse;
  }): BulkIndexResult<TDocument> {
    const attempted = entries.length;

    if (!response.errors) {
      return {
        attempted,
        docs: entries.map((entry) => entry.doc),
        errors: [],
      };
    }

    const docs: TDocument[] = [];
    const errors: Array<BulkIndexError<TDocument>> = [];

    response.items.forEach((item, index) => {
      const entry = entries[index];
      const rejection = item.create?.error;

      if (!rejection) {
        docs.push(entry.doc);
        return;
      }

      errors.push({
        code: rejection.type ?? 'unknown_error',
        message: rejection.reason ?? 'Unknown Elasticsearch bulk error',
        details: { statusCode: item.create?.status ?? 500 },
        index: entry.index,
        document: entry.doc,
      });
    });

    return { attempted, docs, errors };
  }

  private logBulkIndexResponse({
    index,
    docsCount,
    response,
  }: {
    index: string;
    docsCount: number;
    response: BulkResponse;
  }): void {
    this.logFirstBulkIndexItemError(response);
    const message = this.getBulkIndexDebugMessage({ index, docsCount, response });
    this.logger.debug({ message });
  }

  private logFirstBulkIndexItemError(response: BulkResponse): void {
    if (!response.errors) {
      return;
    }

    const firstErrorItem = response.items.find((item) => item.create?.error);
    if (!firstErrorItem) {
      return;
    }

    const error = firstErrorItem.create?.error;
    this.logger.error({
      error: new Error(`[${error?.type ?? 'UNKNOWN_ERROR'}] ${error?.reason ?? 'UNKNOWN_REASON'}`),
      code: 'BULK_INDEX_ERROR',
      type: 'StorageServiceError',
    });
  }

  private getBulkIndexDebugMessage({
    index,
    docsCount,
    response,
  }: {
    index: string;
    docsCount: number;
    response: BulkResponse;
  }): string {
    const failedItemCount = response.items.filter((item) => item.create?.error).length;

    if (!response.errors) {
      return `StorageService: Successfully bulk created ${docsCount} documents to index: ${index}`;
    }

    const successItemCount = docsCount - failedItemCount;
    return `StorageService: Bulk create completed with errors for index: ${index} (successful: ${successItemCount}, failed: ${failedItemCount}, total: ${docsCount})`;
  }
}

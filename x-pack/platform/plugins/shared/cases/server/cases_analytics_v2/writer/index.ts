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
 * at ERROR and never propagate. The cases plugin's primary write path must
 * never fail because analytics had trouble — analytics is a downstream
 * derivation, not part of the user's transactional commit.
 *
 * Reconciliation (added in commit 5) is the durability backstop: any write
 * that fails its retry budget gets re-emitted on the next reconciliation tick.
 */
export interface CasesAnalyticsV2WriterContract {
  upsertCase: (so: SavedObject<CasePersistedAttributes>) => void;
  deleteCase: (caseId: string) => void;
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
    void this.fireAndForget(so.id, () => this.doUpsertCase(so));
  }

  /**
   * Drop the analytics doc for a case. Called by `CasesService.deleteCase` /
   * `bulkDeleteCaseEntities` post-success. Fire-and-forget.
   *
   * In commit 4 we'll wire the cases SO services to call this. PR 2 will
   * extend the cascade to delete activity rows for the case; for now the
   * delete is scoped to `.cases` only.
   */
  public deleteCase(caseId: string): void {
    void this.fireAndForget(caseId, () => this.doDeleteCase(caseId));
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
   * Fire-and-forget wrapper. Errors are logged at ERROR (not WARN) so failures
   * surface in default operator dashboards — silent failures here look
   * identical to "the feature isn't wired up at all" and waste debug time. The
   * error is still NOT propagated to the caller.
   */
  private fireAndForget(targetId: string, op: () => Promise<void>): Promise<void> {
    return withRetry({
      op,
      maxRetries: this.maxRetries,
      initialDelayMs: this.retryInitialDelayMs,
    }).catch((err: Error) => {
      this.logger.error(`cases.analyticsV2 write failed [id=${targetId}]: ${err.message}`, {
        error: err,
      });
    });
  }
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
};

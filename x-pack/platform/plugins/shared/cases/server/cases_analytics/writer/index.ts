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
 * Public hook surface invoked from the cases SO services.
 *
 * Every method is fire-and-forget by contract: callers don't await, and any error
 * is logged and swallowed. The reconciliation tail job is the durability backstop.
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

  constructor(deps: WriterDependencies) {
    this.esClient = deps.esClient;
    this.logger = deps.logger.get('cases.analytics.writer');
    this.fetchCase = deps.fetchCase;
    this.fetchActivityForCase = deps.fetchActivityForCase;
    this.maxRetries = deps.maxRetries ?? DEFAULT_WRITE_MAX_RETRIES;
    this.retryInitialDelayMs = deps.retryInitialDelayMs ?? DEFAULT_WRITE_RETRY_INITIAL_DELAY_MS;
  }

  /**
   * Upsert a case document. Called by `CasesService.createCase` and `patchCase`
   * post-success.
   */
  upsertCase(so: SavedObject<CasePersistedAttributes>): void {
    this.logger.debug(`upsertCase id=${so.id} owner=${so.attributes?.owner}`);
    void this.fireAndForget('case', so.id, async () => {
      const doc = buildCaseDoc(so);
      await this.esClient.index({
        index: CASES_DATA_CASE_ALIAS,
        id: so.id,
        document: doc,
      });
    });
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
    void this.fireAndForget('case', caseId, () =>
      this.deleteByIdSwallow404(CASES_DATA_CASE_ALIAS, caseId)
    );
    void this.fireAndForget('case_lifecycle', caseId, () =>
      this.deleteByIdSwallow404(CASES_DATA_CASE_LIFECYCLE_ALIAS, caseId)
    );
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
   * Append an activity row. Called by `CaseUserActionService` post-success.
   */
  appendActivity(so: SavedObject<UserActionPersistedAttributes>): void {
    void this.fireAndForget('case_activity', so.id, async () => {
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
    });
  }

  /**
   * Recompute and upsert the lifecycle document for a case. Called from the cases
   * client's update path on close/reopen.
   */
  recomputeLifecycle(caseId: string): void {
    void this.fireAndForget('case_lifecycle', caseId, async () => {
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
    });
  }

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
      // The reconciliation task is the durability backstop. Logged at ERROR (not
      // WARN) so failures surface in default operator dashboards — silent failures
      // here look identical to "the feature isn't wired up at all" and waste
      // debug time. The error is still NOT propagated to the API caller.
      this.logger.error(
        `cases.analytics write failed [surface=${surface} id=${targetId}]: ${err.message}`,
        { error: err }
      );
    });
  }
}

/**
 * The writer is conceptually optional — when the analytics feature is disabled, SO
 * services receive `undefined` and skip the hook calls. This no-op stand-in lets the
 * services keep an unconditional call shape without an `if (writer)` guard at every
 * call site, simplifying the wiring once the feature is on by default in a future PR.
 */
export const NOOP_WRITER: Pick<
  CasesAnalyticsWriter,
  'upsertCase' | 'deleteCase' | 'appendActivity' | 'recomputeLifecycle'
> = {
  upsertCase: () => {},
  deleteCase: () => {},
  appendActivity: () => {},
  recomputeLifecycle: () => {},
};

export type CasesAnalyticsWriterContract = Pick<
  CasesAnalyticsWriter,
  'upsertCase' | 'deleteCase' | 'appendActivity' | 'recomputeLifecycle'
>;

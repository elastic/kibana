/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { isResponseError } from '@kbn/es-errors';
import { BulkOperationError } from '@kbn/storage-adapter';
import { v4 as uuidv4 } from 'uuid';
import {
  DEFAULT_IMPROVEMENTS_PAGE_SIZE,
  MAX_IMPROVEMENTS_HISTORY_SIZE,
  MAX_IMPROVEMENTS_PAGE_SIZE,
} from '../../common/constants';
import type {
  Improvement,
  ImprovementResolution,
  ImprovementRevisionInput,
  ImprovementStatus,
  ImprovementTransition,
  ListImprovementsResponse,
} from '../../common/http_api/improvements';
import { IMPROVEMENTS_INDEX } from '../../common/http_api/improvements';
import { ImprovementConflictError, ImprovementNotFoundError } from './errors';
import type { ImprovementsStorageClient } from './storage';
import { createImprovementsStorageClient } from './storage';

/** Only the newest revision of each lineage is a live improvement. */
const LATEST_ONLY: QueryDslQueryContainer = { term: { latest: true } };

/** A bulk item carrying this lost its OCC race; anything else is a genuine failure. */
const VERSION_CONFLICT = 'version_conflict_engine_exception';

interface HeadRevision {
  document: Improvement;
  seqNo: number;
  primaryTerm: number;
}

export interface ListImprovementsOptions {
  aiIndexId?: string;
  status?: ImprovementStatus[];
  from?: number;
  size?: number;
}

/**
 * Improvements-store API. No `spaceId` parameters: the store is global, like the AI index
 * registry it hangs off.
 */
export interface ImprovementsServiceApi {
  ensureIndex(): Promise<void>;

  /**
   * Appends a revision per improvement and clears `latest` on the prior one. Returns what was
   * written, which may be a subset: a lineage someone transitioned mid-batch keeps its head and is
   * left for the next run rather than failing the whole batch.
   */
  write(improvements: ImprovementRevisionInput[]): Promise<Improvement[]>;

  /** Latest revision per `improvement_id`, paginated. */
  list(options?: ListImprovementsOptions): Promise<ListImprovementsResponse>;

  get(improvementId: string): Promise<Improvement | undefined>;

  /**
   * Every improvement for an AI index with its current status, for the run briefing — the runner
   * has to see what was already rejected, and why (`resolution.reason`), so it does not re-propose
   * a fix a reviewer has already turned down.
   */
  historyFor(aiIndexId: string, options?: { size?: number }): Promise<Improvement[]>;

  /** Writes a new revision. Throws {@link ImprovementConflictError} on a concurrent transition. */
  transition(
    improvementId: string,
    to: ImprovementTransition,
    resolution?: ImprovementResolution
  ): Promise<Improvement>;

  deleteByAiIndex(aiIndexId: string): Promise<void>;
}

/**
 * Owns the global `context-engine-improvements` index.
 *
 * The lifecycle is an append log: `improvement_id` is the stable lineage key, `revision_id` is the
 * ES `_id`, and every write — including a transition — appends a revision carrying
 * `previous_revision_id`. `latest: true` marks the head of each lineage and `list`/`get` filter on
 * it, rather than using `collapse`, because `collapse` makes `track_total_hits` count hits instead
 * of groups and the review UI needs an exact total to paginate.
 */
export class ImprovementsService implements ImprovementsServiceApi {
  private readonly esClient: ElasticsearchClient;
  private readonly logger: Logger;
  private readonly storageClient: ImprovementsStorageClient;

  constructor({ esClient, logger }: { esClient: ElasticsearchClient; logger: Logger }) {
    this.esClient = esClient;
    this.logger = logger;
    this.storageClient = createImprovementsStorageClient({ esClient, logger });
  }

  /** Reconciles the index mappings if it exists; the index is created lazily on first write. */
  async ensureIndex(): Promise<void> {
    await this.storageClient.reconcileMappings();
  }

  async write(improvements: ImprovementRevisionInput[]): Promise<Improvement[]> {
    if (improvements.length === 0) {
      return [];
    }

    // Last one wins within a batch: two revisions of the same lineage in one call would otherwise
    // race for the head, and the caller cannot express an ordering between them anyway.
    const byImprovementId = new Map<string, ImprovementRevisionInput>();
    for (const improvement of improvements) {
      byImprovementId.set(improvement.improvement_id, improvement);
    }

    const heads = await this.loadHeads([...byImprovementId.keys()]);
    const conflicted = await this.clearLatest([...heads.values()]);

    // A lineage that lost the race kept its head — its retire operation is the one that failed —
    // so it is left for the next run rather than appended to here. Only the losers are skipped:
    // dropping the whole batch would strand the lineages whose heads were retired successfully.
    if (conflicted.size > 0) {
      this.logger.debug(
        `Skipped ${conflicted.size} improvement lineage(s) transitioned concurrently: ${[
          ...conflicted,
        ].join(', ')}`
      );
    }

    const now = new Date().toISOString();
    const revisions = [...byImprovementId.values()]
      .filter(({ improvement_id: improvementId }) => !conflicted.has(improvementId))
      .map((input): Improvement => {
        const head = heads.get(input.improvement_id);
        return {
          ...input,
          revision_id: uuidv4(),
          ...(head ? { previous_revision_id: head.document.revision_id } : {}),
          latest: true,
          '@timestamp': now,
          suggested_at: input.suggested_at ?? now,
        };
      });

    if (revisions.length === 0) {
      return [];
    }

    await this.indexRevisions(revisions);
    return revisions;
  }

  async list({
    aiIndexId,
    status,
    from = 0,
    size = DEFAULT_IMPROVEMENTS_PAGE_SIZE,
  }: ListImprovementsOptions = {}): Promise<ListImprovementsResponse> {
    const response = await this.searchHeads({
      filter: buildHeadFilter({ aiIndexId, status }),
      from,
      size: Math.min(size, MAX_IMPROVEMENTS_PAGE_SIZE),
    });

    const items = toDocuments(response.hits.hits);
    const total =
      typeof response.hits.total === 'number'
        ? response.hits.total
        : response.hits.total?.value ?? items.length;

    return { items, total };
  }

  async get(improvementId: string): Promise<Improvement | undefined> {
    const response = await this.storageClient.search({
      size: 1,
      track_total_hits: false,
      query: {
        bool: { filter: [LATEST_ONLY, { term: { improvement_id: improvementId } }] },
      },
    });
    return toDocuments(response.hits.hits)[0];
  }

  async historyFor(
    aiIndexId: string,
    { size = MAX_IMPROVEMENTS_HISTORY_SIZE }: { size?: number } = {}
  ): Promise<Improvement[]> {
    // Not `list`: the briefing wants the whole history in one pass, and its cap is the run's
    // context budget rather than a UI page size.
    const response = await this.searchHeads({
      filter: buildHeadFilter({ aiIndexId }),
      from: 0,
      size: Math.min(size, MAX_IMPROVEMENTS_HISTORY_SIZE),
    });
    return toDocuments(response.hits.hits);
  }

  async transition(
    improvementId: string,
    to: ImprovementTransition,
    resolution?: ImprovementResolution
  ): Promise<Improvement> {
    const head = (await this.loadHeads([improvementId])).get(improvementId);
    if (!head) {
      throw new ImprovementNotFoundError(improvementId);
    }

    const conflicted = await this.clearLatest([head]);
    if (conflicted.has(improvementId)) {
      throw new ImprovementConflictError([improvementId]);
    }

    const now = new Date().toISOString();
    const revision: Improvement = {
      ...head.document,
      revision_id: uuidv4(),
      previous_revision_id: head.document.revision_id,
      latest: true,
      '@timestamp': now,
      status: to,
      // A `failed` apply never reached the target, so it gets no `applied_at`; the reason lives on
      // `resolution.error` and the improvement stays actionable for a retry.
      ...(to === 'applied' ? { applied_at: now } : {}),
      ...(to === 'rejected' ? { rejected_at: now } : {}),
      ...(resolution ? { resolution } : {}),
    };

    await this.indexRevisions([revision]);
    return revision;
  }

  /** Removes every revision for an AI index; used when the AI index itself goes away. */
  async deleteByAiIndex(aiIndexId: string): Promise<void> {
    try {
      await this.esClient.deleteByQuery({
        index: IMPROVEMENTS_INDEX,
        query: { term: { ai_index_id: aiIndexId } },
        conflicts: 'proceed',
        refresh: true,
        ignore_unavailable: true,
      });
    } catch (error) {
      if (isResponseError(error) && error.statusCode === 404) {
        return;
      }
      throw error;
    }
  }

  /** The shared head-only read: newest first, with an exact total for pagination. */
  private searchHeads({
    filter,
    from,
    size,
  }: {
    filter: QueryDslQueryContainer[];
    from: number;
    size: number;
  }) {
    return this.storageClient.search({
      from,
      size,
      track_total_hits: true,
      query: { bool: { filter } },
      sort: [{ '@timestamp': { order: 'desc' } }],
    });
  }

  /** Reads the head revision of each lineage together with the OCC metadata needed to retire it. */
  private async loadHeads(improvementIds: string[]): Promise<Map<string, HeadRevision>> {
    if (improvementIds.length === 0) {
      return new Map();
    }

    const response = await this.storageClient.search({
      size: improvementIds.length,
      track_total_hits: false,
      seq_no_primary_term: true,
      query: {
        bool: { filter: [LATEST_ONLY, { terms: { improvement_id: improvementIds } }] },
      },
    });

    const heads = new Map<string, HeadRevision>();
    for (const hit of response.hits.hits) {
      const document = hit._source;
      // OCC needs both; without them the guarded clear below would silently become unguarded.
      if (!document || hit._seq_no === undefined || hit._primary_term === undefined) {
        continue;
      }
      heads.set(document.improvement_id, {
        document,
        seqNo: hit._seq_no,
        primaryTerm: hit._primary_term,
      });
    }
    return heads;
  }

  /**
   * Retires the given heads under optimistic concurrency, before any new revision is written.
   *
   * Doing this first is what serializes concurrent transitions: a losing writer appends nothing
   * for that lineage, instead of leaving the log holding both an `applied` and a `rejected` head
   * for the same improvement — with the change actually applied.
   *
   * Reports the lineages that lost the race rather than throwing, because a bulk applies each
   * operation independently: one conflicting head does not stop the others from being retired. If
   * the caller abandoned the whole batch on the first conflict, those already-retired lineages
   * would be left with no head at all — invisible to every read, and orphaned from the successor
   * a later run would append.
   */
  private async clearLatest(heads: HeadRevision[]): Promise<Set<string>> {
    if (heads.length === 0) {
      return new Set();
    }

    const response = await this.storageClient.bulk({
      operations: heads.map(({ document, seqNo, primaryTerm }) => ({
        index: {
          _id: document.revision_id,
          document: { ...document, latest: false },
          if_seq_no: seqNo,
          if_primary_term: primaryTerm,
        },
      })),
      refresh: 'wait_for',
      throwOnFail: false,
    });

    if (!response.errors) {
      return new Set();
    }

    const lineageByRevisionId = new Map(
      heads.map(({ document }) => [document.revision_id, document.improvement_id])
    );
    const conflicted = new Set<string>();
    const failures: unknown[] = [];

    for (const item of response.items) {
      for (const action of Object.values(item)) {
        if (!action?.error) {
          continue;
        }
        const improvementId = action._id ? lineageByRevisionId.get(action._id) : undefined;
        if (action.error.type === VERSION_CONFLICT && improvementId) {
          conflicted.add(improvementId);
          continue;
        }
        // Anything that is not a lost race keeps its own meaning, and leaves the head it names in
        // an unknown state, so it has to surface rather than be reported as contention.
        failures.push(item);
      }
    }

    if (failures.length > 0) {
      throw new BulkOperationError(
        `Failed to retire ${failures.length} improvement head(s): ${JSON.stringify(failures)}`,
        response
      );
    }

    return conflicted;
  }

  /**
   * Appends revisions, keyed by `revision_id`. `refresh: 'wait_for'` because the review UI reads
   * as soon as a run reports finished, and without it the panel comes back empty on first load.
   */
  private async indexRevisions(revisions: Improvement[]): Promise<void> {
    try {
      await this.storageClient.bulk({
        operations: revisions.map((revision) => ({
          index: { _id: revision.revision_id, document: revision },
        })),
        refresh: 'wait_for',
        throwOnFail: true,
      });
    } catch (error) {
      // The prior heads are already retired, so these lineages have no head until a re-run
      // re-proposes them. Log loudly: the caller sees the failure, but the gap is not obvious.
      this.logger.error(
        `Failed to append ${revisions.length} improvement revision(s); lineage(s) ${revisions
          .map(({ improvement_id: improvementId }) => improvementId)
          .join(', ')} are left without a head: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      throw error;
    }
  }
}

const buildHeadFilter = ({
  aiIndexId,
  status,
}: {
  aiIndexId?: string;
  status?: ImprovementStatus[];
}): QueryDslQueryContainer[] => {
  const filter: QueryDslQueryContainer[] = [LATEST_ONLY];
  if (aiIndexId) {
    filter.push({ term: { ai_index_id: aiIndexId } });
  }
  if (status?.length) {
    filter.push({ terms: { status } });
  }
  return filter;
};

const toDocuments = (hits: Array<{ _source?: Improvement }>): Improvement[] =>
  hits.map((hit) => hit._source).filter((source): source is Improvement => source != null);

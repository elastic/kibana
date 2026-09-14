/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SEVERITY_OPTIONS } from '@kbn/significant-events-schema';
import type {
  Investigation,
  InvestigationPatch,
  InvestigationStatus,
  InvestigationSeverity,
} from '../../../common/investigations/investigation';
import type { InvestigationsStorageClient, InvestigationStorageDoc } from '../storage';
import { InvestigationConflictError } from './errors/investigation_errors';

/**
 * Filters for listing investigations.
 * `impactedEntityName` drives a nested term query on `impactedEntities.name`
 * so cross-entity compound queries evaluate correctly per entity.
 */
export interface ListInvestigationsQuery {
  status?: InvestigationStatus;
  severity?: InvestigationSeverity;
  solution?: string;
  subjectType?: string;
  impactedEntityName?: string;
  concurrencyKey?: string;
  createdAfter?: string;
  createdBefore?: string;
  startedAfter?: string;
  startedBefore?: string;
  completedAfter?: string;
  completedBefore?: string;
  sortField?: 'createdAt' | 'completedAt' | 'severity';
  sortOrder?: 'asc' | 'desc';
  /** Page size — must stay within Elasticsearch's default result window. */
  size: number;
  from: number;
}

/**
 * Filters for aggregation calls. Omits `size`/`from` because counts are
 * over the full matching set rather than a page window.
 */
export interface CountInvestigationsQuery {
  status?: InvestigationStatus;
  solution?: string;
  subjectType?: string;
}

/** Minimal conversation contract needed by InvestigationsService. */
export interface InvestigationsConversationsClient {
  /**
   * Sync investigation state back to the driving conversation's metadata.
   * Called after every upsert so the Agent Builder sidebar shows current state.
   * No-op when the investigation has no linked conversation.
   */
  patchMetadata(conversationId: string, metadata: Record<string, string | null>): Promise<void>;

  /**
   * Batch-read conversations by id. Returns null for any id that is absent or
   * unreadable; does not throw on partial failures — missing items are left-joined
   * as null so the calling investigation record is still returned.
   */
  bulkGet(ids: string[]): Promise<Array<{ id: string; title?: string } | null>>;
}

type QueryFilterList = Array<Record<string, unknown>>;

/**
 * Maps a severity label to a numeric rank so sort clauses operate on a `byte`
 * field rather than a keyword enum. Lower rank = higher severity (most-critical
 * first in ascending sort). Order mirrors SEVERITY_OPTIONS (most-severe first).
 */
const toSeverityRank = (severity: InvestigationSeverity | undefined): number | undefined => {
  if (severity === undefined) {
    return undefined;
  }
  const idx = SEVERITY_OPTIONS.indexOf(severity);
  return idx === -1 ? undefined : idx;
};

const isVersionConflict = (error: unknown): boolean => {
  const status = (error as { statusCode?: number; meta?: { statusCode?: number } })?.statusCode;
  const metaStatus = (error as { meta?: { statusCode?: number } })?.meta?.statusCode;
  return status === 409 || metaStatus === 409;
};

/**
 * Drops `severityRank` before an investigation leaves the service — it is a
 * storage concern and must never reach the API contract.
 */
const stripSeverityRank = ({ severityRank: _severityRank, ...investigation }: Investigation) =>
  investigation;

const toInvestigation = (id: string, source: InvestigationStorageDoc): Investigation => ({
  id,
  ...source,
});

/**
 * Sole writer for the investigations index. Resolves `severityRank` from
 * `severity` before delegating to storage, so callers never supply it directly.
 * Holds a reference to `InvestigationsConversationsClient` to link investigations
 * with Agent Builder conversations (metadata sync, bulk-get enrichment).
 */
export class InvestigationsService {
  constructor(
    private readonly storage: InvestigationsStorageClient,
    private readonly conversationsClient: InvestigationsConversationsClient
  ) {}

  /**
   * Creates or fully replaces a document. Computes `severityRank` from
   * `severity`, then patches conversation metadata so the Agent Builder sidebar
   * reflects the current investigation state.
   */
  async upsert(spaceId: string, doc: InvestigationStorageDoc): Promise<Investigation> {
    const severityRank = toSeverityRank(doc.severity);
    const document: InvestigationStorageDoc = {
      ...doc,
      spaceId,
      severityRank,
    };

    let indexed: { _id?: string; _seq_no?: number; _primary_term?: number };
    try {
      indexed = await this.storage.index({ id: document.conversationId, document });
    } catch (error) {
      if (isVersionConflict(error)) {
        throw new InvestigationConflictError(
          `Investigation for conversation [${document.conversationId}] was modified concurrently`
        );
      }
      throw error;
    }

    const id = indexed._id ?? document.conversationId ?? '';
    const investigation = toInvestigation(id, document);

    if (document.conversationId) {
      await this.conversationsClient.patchMetadata(document.conversationId, {
        status: document.status ?? null,
        severity: document.severity ?? null,
        summary: document.summary ?? null,
      });
    }

    return stripSeverityRank(investigation);
  }

  /**
   * Lists investigations with pagination and optional severity-count facets.
   *
   * Leg 1: Elasticsearch query on `.kibana-investigations`. Filters by
   * `spaceId` (always), optional `status`, `severity`, `solution`,
   * `subjectType`, and `impactedEntityName` (nested query on
   * `impactedEntities.name`). Sorted by `severityRank asc`, `createdAt desc`,
   * `conversationId asc` for stable pagination.
   *
   * Leg 1b (facets): Same filter **minus** the `severity` clause, size:0,
   * terms aggregation on the `severity` field, zero-filled for all
   * `SEVERITY_OPTIONS` values so the caller always receives a complete map.
   *
   * Leg 2 (conversation join): `bulkGet` on the page's conversation IDs,
   * left-joined — records whose conversation is absent or unreadable are still
   * returned (the conversation field is simply omitted).
   */
  async list(
    spaceId: string,
    query: ListInvestigationsQuery
  ): Promise<{ items: Investigation[]; total: number; severityCounts: Record<string, number> }> {
    // Base filter shared by both the main query and the facet query.
    const baseFilter: QueryFilterList = [{ term: { spaceId } }];

    if (query.status) {
      baseFilter.push({ term: { status: query.status } });
    }
    if (query.solution) {
      baseFilter.push({ term: { solution: query.solution } });
    }
    if (query.subjectType) {
      baseFilter.push({ term: { subjectType: query.subjectType } });
    }
    if (query.impactedEntityName) {
      baseFilter.push({
        nested: {
          path: 'impactedEntities',
          query: { term: { 'impactedEntities.name': query.impactedEntityName } },
        },
      });
    }

    // Leg 1: main paginated query — includes severity filter when requested.
    const mainFilter: QueryFilterList = [...baseFilter];
    if (query.severity) {
      mainFilter.push({ term: { severity: query.severity } });
    }

    const [mainResponse, facetResponse] = await Promise.all([
      // Leg 1
      this.storage.search({
        track_total_hits: true,
        size: query.size,
        from: query.from,
        query: { bool: { filter: mainFilter } },
        sort: [
          { severityRank: { order: 'asc' } },
          { createdAt: { order: 'desc' } },
          { conversationId: { order: 'asc' } },
        ],
      }),
      // Leg 1b — same filter WITHOUT severity so counts cover the full set.
      this.storage.search({
        track_total_hits: false,
        size: 0,
        from: 0,
        query: { bool: { filter: baseFilter } },
        aggs: {
          severity_counts: {
            terms: { field: 'severity', size: SEVERITY_OPTIONS.length },
          },
        },
      }),
    ]);

    // Collect investigation records from leg 1.
    const hits = mainResponse.hits.hits.filter(
      (hit): hit is typeof hit & { _id: string } => hit._id !== undefined
    );
    const records = hits.map((hit) =>
      toInvestigation(hit._id, hit._source as InvestigationStorageDoc)
    );

    // Leg 2: enrich with conversation data (left-join — missing/unreadable are null).
    const conversationIds = [
      ...new Set(
        records.map((r) => r.conversationId).filter((id): id is string => id !== undefined)
      ),
    ];
    // Prefixed with `_` because the `Investigation` schema does not yet carry a
    // conversation-title field; the call is retained for future enrichment.
    const _conversations =
      conversationIds.length > 0 ? await this.conversationsClient.bulkGet(conversationIds) : [];
    const items = records.map((record) => {
      return stripSeverityRank(record);
    });

    const total =
      typeof mainResponse.hits.total === 'number'
        ? mainResponse.hits.total
        : mainResponse.hits.total?.value ?? items.length;

    // Zero-fill severity counts so every SEVERITY_OPTIONS value is present.
    const rawBuckets =
      (
        facetResponse as unknown as {
          aggregations?: {
            severity_counts?: { buckets?: Array<{ key: string; doc_count: number }> };
          };
        }
      ).aggregations?.severity_counts?.buckets ?? [];
    const severityCounts: Record<string, number> = Object.fromEntries(
      SEVERITY_OPTIONS.map((sev) => {
        const bucket = rawBuckets.find((b) => b.key === sev);
        return [sev, bucket?.doc_count ?? 0];
      })
    );

    return { items, total, severityCounts };
  }

  /**
   * Retrieves a single investigation by id. Returns null rather than throwing
   * when the document does not exist in the caller's space.
   */
  async get(spaceId: string, id: string): Promise<Investigation | null> {
    const response = await this.storage.search({
      track_total_hits: false,
      size: 1,
      seq_no_primary_term: true,
      query: { bool: { filter: [{ ids: { values: [id] } }, { term: { spaceId } }] } },
    });

    const hit = response.hits.hits[0];
    if (!hit?._source || hit._id === undefined) {
      return null;
    }

    return stripSeverityRank(toInvestigation(hit._id, hit._source as InvestigationStorageDoc));
  }

  /**
   * Partially updates an investigation document. Fetches the existing document,
   * merges the patch fields, then re-upserts. Returns the updated investigation.
   * Throws when the investigation does not exist in the given space.
   */
  async patch(id: string, spaceId: string, patch: InvestigationPatch): Promise<Investigation> {
    const existing = await this.get(spaceId, id);
    if (!existing) {
      throw new Error(`Investigation [${id}] not found in space [${spaceId}]`);
    }
    const { id: _id, ...rest } = existing;
    const merged: InvestigationStorageDoc = { ...rest, ...patch };
    return this.upsert(spaceId, merged);
  }

  /**
   * Cross-space sweep query used by the reconciliation task. Searches the index
   * without a spaceId filter and returns lightweight records (id, createdAt, spaceId)
   * for reconciliation bookkeeping.
   */
  async findAcrossSpaces(query: {
    statuses: readonly InvestigationStatus[];
    sortField: string;
    sortOrder: 'asc' | 'desc';
    page: number;
    size: number;
  }): Promise<{ results: Array<{ id: string; createdAt: string; spaceId: string }>; total: number }> {
    const from = (query.page - 1) * query.size;
    const response = await this.storage.search({
      track_total_hits: true,
      size: query.size,
      from,
      query: { bool: { filter: [{ terms: { status: query.statuses as string[] } }] } },
      sort: [{ [query.sortField]: { order: query.sortOrder } }],
      _source: ['createdAt', 'spaceId'],
    });

    const total =
      typeof response.hits.total === 'number'
        ? response.hits.total
        : response.hits.total?.value ?? 0;

    const results = response.hits.hits
      .filter((hit): hit is typeof hit & { _id: string } => hit._id !== undefined)
      .map((hit) => {
        const source = hit._source as InvestigationStorageDoc;
        return {
          id: hit._id,
          createdAt: source.createdAt,
          spaceId: source.spaceId,
        };
      });

    return { results, total };
  }

  /**
   * Updates a specific investigation in a specific space. Fetches the existing
   * document and re-upserts with the patched fields. Used by the reconciliation
   * task to settle timed-out or missing-execution investigations.
   */
  async updateInSpace(params: {
    id: string;
    spaceId: string;
    patch: { status: InvestigationStatus; completedAt: string; error?: string };
  }): Promise<void> {
    await this.patch(params.id, params.spaceId, params.patch);
  }

  /**
   * Runs a terms aggregation over the `severity` field for the matched set.
   * Zero-fills missing `SEVERITY_OPTIONS` values so the caller always receives
   * a complete map.
   */
  async getSeverityCounts(
    spaceId: string,
    query: CountInvestigationsQuery
  ): Promise<Record<string, number>> {
    const filter: QueryFilterList = [{ term: { spaceId } }];

    if (query.status) {
      filter.push({ term: { status: query.status } });
    }
    if (query.solution) {
      filter.push({ term: { solution: query.solution } });
    }
    if (query.subjectType) {
      filter.push({ term: { subjectType: query.subjectType } });
    }

    const response = await this.storage.search({
      track_total_hits: false,
      size: 0,
      from: 0,
      query: { bool: { filter } },
      aggs: {
        severity_counts: {
          terms: { field: 'severity', size: SEVERITY_OPTIONS.length },
        },
      },
    });

    const buckets =
      (
        response as unknown as {
          aggregations?: {
            severity_counts?: { buckets?: Array<{ key: string; doc_count: number }> };
          };
        }
      ).aggregations?.severity_counts?.buckets ?? [];

    return Object.fromEntries(
      SEVERITY_OPTIONS.map((sev) => {
        const bucket = buckets.find((b) => b.key === sev);
        return [sev, bucket?.doc_count ?? 0];
      })
    );
  }
}

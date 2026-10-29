/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { IndexStorageSettings, IStorageClient } from '@kbn/storage-adapter';
import { StorageIndexAdapter, types } from '@kbn/storage-adapter';

export const kiUsageIndexName = '.contextengine-ki-usage';

/** Ids recorded per call; a query returns at most this many rows an agent can read anyway. */
export const MAX_KI_USAGE_IDS = 1000;
const CONFLICT_RETRIES = 2;
const DAY_MS = 24 * 60 * 60 * 1000;

const storageSettings = {
  name: kiUsageIndexName,
  schema: {
    properties: {
      space: types.keyword({}),
      ki_id: types.keyword({}),
      access_count: types.long({}),
      first_accessed_at: types.date({}),
      last_accessed_at: types.date({}),
      last_enriched_at: types.date({}),
      access_count_at_enrichment: types.long({}),
    },
  },
} satisfies IndexStorageSettings;

interface StoredKiUsage {
  space: string;
  ki_id: string;
  access_count: number;
  first_accessed_at: string;
  last_accessed_at: string;
  last_enriched_at?: string;
  access_count_at_enrichment?: number;
}

type KiUsageStorageClient = IStorageClient<typeof storageSettings, StoredKiUsage>;

/** How often agents read one KI, and when it was last enriched. */
export interface KiUsage {
  ki_id: string;
  access_count: number;
  /** Reads since the last enrichment, or all reads when it was never enriched. */
  new_accesses: number;
  last_accessed_at: string;
  last_enriched_at?: string;
}

export interface KiEnrichmentSelection {
  /** Reads since the last enrichment a KI needs before it is enriched (again). */
  minNewAccesses: number;
  /** Days that must pass after an enrichment before the KI is enriched again. */
  minDaysBetweenEnrichments: number;
  limit: number;
}

export interface KiUsageServiceApi {
  /** Counts one read of each KI an agent was shown. */
  recordAccess(params: { spaceId: string; kiIds: string[] }): Promise<void>;
  getUsage(params: { spaceId: string; kiIds: string[] }): Promise<KiUsage[]>;
  /** Marks KIs enriched now, so their reads count again from here. */
  recordEnrichment(params: { spaceId: string; kiIds: string[] }): Promise<void>;
}

/** KI ids are long and free-form, so the document id is a hash of the space and the id. */
const usageDocId = (spaceId: string, kiId: string): string =>
  createHash('sha256').update(`${spaceId}\n${kiId}`).digest('hex');

const unique = (ids: string[]): string[] => [...new Set(ids)].slice(0, MAX_KI_USAGE_IDS);

const toUsage = (stored: StoredKiUsage): KiUsage => ({
  ki_id: stored.ki_id,
  access_count: stored.access_count,
  new_accesses: stored.access_count - (stored.access_count_at_enrichment ?? 0),
  last_accessed_at: stored.last_accessed_at,
  ...(stored.last_enriched_at !== undefined && { last_enriched_at: stored.last_enriched_at }),
});

/** The KIs due for enrichment, most read since their last enrichment first. */
export const selectDueForEnrichment = (
  usage: KiUsage[],
  { minNewAccesses, minDaysBetweenEnrichments, limit }: KiEnrichmentSelection,
  now: Date
): KiUsage[] =>
  usage
    .filter(
      ({ new_accesses: newAccesses, last_enriched_at: lastEnrichedAt }) =>
        newAccesses >= minNewAccesses &&
        (lastEnrichedAt === undefined ||
          now.getTime() - new Date(lastEnrichedAt).getTime() >= minDaysBetweenEnrichments * DAY_MS)
    )
    .sort(
      (a, b) =>
        b.new_accesses - a.new_accesses || b.last_accessed_at.localeCompare(a.last_accessed_at)
    )
    .slice(0, limit);

/**
 * Per-space read counts of KIs, kept apart from the KIs so counting a read never writes a KI
 * revision. Counts are best effort: a read racing another read of the same KI is retried, then
 * dropped.
 */
export class KiUsageService implements KiUsageServiceApi {
  private readonly esClient: ElasticsearchClient;
  private readonly storage: KiUsageStorageClient;
  private readonly getNow: () => Date;

  constructor({
    esClient,
    logger,
    getNow = () => new Date(),
  }: {
    esClient: ElasticsearchClient;
    logger: Logger;
    getNow?: () => Date;
  }) {
    this.storage = new StorageIndexAdapter<typeof storageSettings, StoredKiUsage>(
      esClient,
      logger,
      storageSettings
    ).getClient();
    this.esClient = esClient;
    this.getNow = getNow;
  }

  async recordAccess({ spaceId, kiIds }: { spaceId: string; kiIds: string[] }): Promise<void> {
    await this.update(spaceId, unique(kiIds), (existing, kiId, now) => ({
      space: spaceId,
      ki_id: kiId,
      access_count: (existing?.access_count ?? 0) + 1,
      first_accessed_at: existing?.first_accessed_at ?? now,
      last_accessed_at: now,
      ...(existing?.last_enriched_at !== undefined && {
        last_enriched_at: existing.last_enriched_at,
      }),
      ...(existing?.access_count_at_enrichment !== undefined && {
        access_count_at_enrichment: existing.access_count_at_enrichment,
      }),
    }));
  }

  async recordEnrichment({ spaceId, kiIds }: { spaceId: string; kiIds: string[] }): Promise<void> {
    await this.update(spaceId, unique(kiIds), (existing, kiId, now) => ({
      space: spaceId,
      ki_id: kiId,
      access_count: existing?.access_count ?? 0,
      first_accessed_at: existing?.first_accessed_at ?? now,
      last_accessed_at: existing?.last_accessed_at ?? now,
      last_enriched_at: now,
      access_count_at_enrichment: existing?.access_count ?? 0,
    }));
  }

  async getUsage({ spaceId, kiIds }: { spaceId: string; kiIds: string[] }): Promise<KiUsage[]> {
    const ids = unique(kiIds);
    if (ids.length === 0) {
      return [];
    }
    const stored = await this.read(spaceId, ids);
    return [...stored.values()].map(({ document }) => toUsage(document));
  }

  private async read(
    spaceId: string,
    kiIds: string[]
  ): Promise<Map<string, { document: StoredKiUsage; seqNo?: number; primaryTerm?: number }>> {
    if (!(await this.storage.existsIndex())) {
      return new Map();
    }
    // A get by id is realtime; a search would miss a read counted a moment ago and lose it.
    const { docs } = await this.esClient.mget<StoredKiUsage>({
      index: kiUsageIndexName,
      ids: kiIds.map((kiId) => usageDocId(spaceId, kiId)),
    });
    return new Map(
      docs.flatMap((doc) =>
        'found' in doc && doc.found && doc._source?.space === spaceId
          ? [
              [
                doc._source.ki_id,
                { document: doc._source, seqNo: doc._seq_no, primaryTerm: doc._primary_term },
              ],
            ]
          : []
      )
    );
  }

  /** Read-modify-write with optimistic concurrency; a lost race is retried. */
  private async update(
    spaceId: string,
    kiIds: string[],
    next: (existing: StoredKiUsage | undefined, kiId: string, now: string) => StoredKiUsage
  ): Promise<void> {
    let pending = kiIds;
    for (let attempt = 0; attempt <= CONFLICT_RETRIES && pending.length > 0; attempt++) {
      const existing = await this.read(spaceId, pending);
      const now = this.getNow().toISOString();
      const { items } = await this.storage.bulk({
        operations: pending.map((kiId) => {
          const current = existing.get(kiId);
          const document = next(current?.document, kiId, now);
          const _id = usageDocId(spaceId, kiId);
          return current?.seqNo !== undefined && current.primaryTerm !== undefined
            ? {
                index: {
                  _id,
                  document,
                  if_seq_no: current.seqNo,
                  if_primary_term: current.primaryTerm,
                },
              }
            : { create: { _id, document } };
        }),
        throwOnFail: false,
      });
      pending = pending.filter((_, position) => {
        const item = items[position];
        const status = (item?.index ?? item?.create)?.status;
        return status === 409;
      });
    }
  }
}

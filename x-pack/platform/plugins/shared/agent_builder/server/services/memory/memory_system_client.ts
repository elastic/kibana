/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AggregationsCompositeAggregate,
  QueryDslQueryContainer,
} from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { ShortTermMemory, ShortTermMemoryPromotion } from '@kbn/agent-builder-common';
import type {
  ShortTermMemoryConsolidateParams,
  ShortTermMemoryConsolidateResult,
  ShortTermMemoryDecayParams,
  ShortTermMemoryDecayResult,
  ShortTermMemoryMerge,
  ShortTermMemoryOwnerGroup,
  ShortTermMemoryOwnerListParams,
  ShortTermMemoryPromotionListParams,
  ShortTermMemorySystemClient,
} from '@kbn/agent-builder-server';
import { memoryIndexName } from './storage';
import {
  MEMORY_ATTRIBUTES,
  agentFilter,
  agentsFilter,
  attributeField,
  notExpiredFilter,
  ownerFilter,
  promotionAttributes,
  shortTermMemoryTypeFilter,
  spaceFilter,
  toShortTermMemory,
  withoutPromotion,
  type ShortTermMemoryKiDocument,
} from './memory_document';

export const DEFAULT_PROMOTION_LIST_LIMIT = 50;
export const MAX_PROMOTION_LIST_LIMIT = 200;

/** Memories written before promotion was recorded carry no status and count as pending. */
const statusFilter = (statuses: string[]): QueryDslQueryContainer => {
  const field = attributeField(MEMORY_ATTRIBUTES.promotionStatus);
  return {
    bool: {
      should: [
        { terms: { [field]: statuses } },
        ...(statuses.includes('pending') ? [{ bool: { must_not: { exists: { field } } } }] : []),
      ],
      minimum_should_match: 1,
    },
  };
};

export class ShortTermMemorySystemClientImpl implements ShortTermMemorySystemClient {
  private readonly esClient: ElasticsearchClient;
  private readonly getNow: () => Date;

  constructor({
    esClient,
    getNow = () => new Date(),
  }: {
    esClient: ElasticsearchClient;
    getNow?: () => Date;
  }) {
    this.esClient = esClient;
    this.getNow = getNow;
  }

  async listForPromotion({
    spaceId,
    agentIds,
    statuses = ['pending'],
    since,
    limit,
  }: ShortTermMemoryPromotionListParams): Promise<ShortTermMemory[]> {
    const filter: QueryDslQueryContainer[] = [
      shortTermMemoryTypeFilter,
      spaceFilter(spaceId),
      notExpiredFilter(this.getNow()),
      statusFilter(statuses),
      ...agentsFilter(agentIds),
      ...(since !== undefined ? [{ range: { updated_at: { gte: since } } }] : []),
    ];
    const response = await this.esClient.search<ShortTermMemoryKiDocument>({
      index: memoryIndexName,
      ignore_unavailable: true,
      allow_no_indices: true,
      size: Math.min(Math.max(limit ?? DEFAULT_PROMOTION_LIST_LIMIT, 1), MAX_PROMOTION_LIST_LIMIT),
      query: { bool: { filter } },
      // Oldest first: a memory that has waited longest is decided first.
      sort: [{ updated_at: { order: 'asc' } }],
    });
    return response.hits.hits.flatMap((hit) =>
      hit._source ? [toShortTermMemory(hit._source)] : []
    );
  }

  async setPromotion({
    spaceId,
    ids,
    promotion,
  }: {
    spaceId: string;
    ids: string[];
    promotion: Omit<ShortTermMemoryPromotion, 'updated_at'>;
  }): Promise<{ updated: number }> {
    if (ids.length === 0) {
      return { updated: 0 };
    }
    const response = await this.esClient.search<ShortTermMemoryKiDocument>({
      index: memoryIndexName,
      ignore_unavailable: true,
      allow_no_indices: true,
      size: ids.length,
      seq_no_primary_term: true,
      query: {
        bool: {
          filter: [{ terms: { _id: ids } }, shortTermMemoryTypeFilter, spaceFilter(spaceId)],
        },
      },
    });
    const updatedAt = this.getNow().toISOString();
    const operations = response.hits.hits.flatMap((hit) =>
      hit._id && hit._source && hit._seq_no !== undefined && hit._primary_term !== undefined
        ? [
            {
              index: {
                _index: memoryIndexName,
                _id: hit._id,
                // An owner's revision since this read wins; the memory is decided on the next run.
                if_seq_no: hit._seq_no,
                if_primary_term: hit._primary_term,
              },
            },
            {
              ...hit._source,
              attributes: {
                ...withoutPromotion(hit._source.attributes),
                ...promotionAttributes({ ...promotion, updated_at: updatedAt }),
              },
            },
          ]
        : []
    );
    if (operations.length === 0) {
      return { updated: 0 };
    }
    const result = await this.esClient.bulk({ operations, refresh: 'wait_for' });
    const updated = result.items.filter((item) => isSuccess(item.index?.status)).length;
    return { updated };
  }

  async listByOwner({
    spaceId,
    agentIds,
    changedWithinHours,
    maxOwners,
    maxMemoriesPerOwner,
  }: ShortTermMemoryOwnerListParams): Promise<ShortTermMemoryOwnerGroup[]> {
    const now = this.getNow();
    const unexpired: QueryDslQueryContainer[] = [
      shortTermMemoryTypeFilter,
      spaceFilter(spaceId),
      notExpiredFilter(now),
      ...agentsFilter(agentIds),
    ];
    const changedSince =
      changedWithinHours !== undefined
        ? new Date(now.getTime() - changedWithinHours * HOUR_MS).toISOString()
        : undefined;
    const ownersResponse = await this.esClient.search<
      ShortTermMemoryKiDocument,
      Record<'owners', AggregationsCompositeAggregate>
    >({
      index: memoryIndexName,
      ...MISSING_INDEX_OK,
      size: 0,
      query: {
        bool: {
          filter: [
            ...unexpired,
            ...(changedSince !== undefined
              ? [{ range: { updated_at: { gte: changedSince } } }]
              : []),
          ],
        },
      },
      aggs: {
        owners: {
          composite: {
            size: clamp(maxOwners, DEFAULT_OWNER_LIST_LIMIT, MAX_OWNER_LIST_LIMIT),
            sources: [
              { user_id: { terms: { field: attributeField(MEMORY_ATTRIBUTES.userId) } } },
              { agent_id: { terms: { field: attributeField(MEMORY_ATTRIBUTES.agentId) } } },
            ],
          },
        },
      },
    });
    const owners = (
      Array.isArray(ownersResponse.aggregations?.owners.buckets)
        ? ownersResponse.aggregations?.owners.buckets ?? []
        : []
    ).map(({ key }) => ({ userId: String(key.user_id), agentId: String(key.agent_id) }));
    if (owners.length === 0) {
      return [];
    }

    const perOwner = clamp(
      maxMemoriesPerOwner,
      DEFAULT_MEMORIES_PER_OWNER_LIMIT,
      MAX_MEMORIES_PER_OWNER_LIMIT
    );
    const { responses } = await this.esClient.msearch<ShortTermMemoryKiDocument>({
      searches: owners.flatMap(({ userId, agentId }) => [
        { index: memoryIndexName, ...MISSING_INDEX_OK },
        {
          size: perOwner,
          query: { bool: { filter: [...unexpired, ownerFilter(userId), agentFilter(agentId)] } },
          sort: [{ updated_at: { order: 'desc' } }],
        },
      ]),
    });
    return owners.flatMap(({ userId, agentId }, position) => {
      const response = responses[position];
      if (!response || 'error' in response) {
        return [];
      }
      const memories = response.hits.hits.flatMap((hit) =>
        hit._source ? [toShortTermMemory(hit._source)] : []
      );
      return memories.length > 0
        ? [{ user_id: userId, user_name: memories[0].user_name, agent_id: agentId, memories }]
        : [];
    });
  }

  async consolidate({
    spaceId,
    userId,
    agentId,
    merges,
    remove,
    writer,
  }: ShortTermMemoryConsolidateParams): Promise<ShortTermMemoryConsolidateResult> {
    const ids = unique([
      ...merges.flatMap(({ keep_id: keepId, source_ids: sourceIds }) => [keepId, ...sourceIds]),
      ...remove.map(({ id }) => id),
    ]);
    if (ids.length === 0) {
      return { merged: 0, deleted: 0, skipped: 0 };
    }
    // Only this owner's memories are found, so neither a merge nor a removal can reach another's.
    const response = await this.esClient.search<ShortTermMemoryKiDocument>({
      index: memoryIndexName,
      ...MISSING_INDEX_OK,
      size: ids.length,
      seq_no_primary_term: true,
      query: {
        bool: {
          filter: [
            { terms: { _id: ids } },
            shortTermMemoryTypeFilter,
            spaceFilter(spaceId),
            ownerFilter(userId),
            agentFilter(agentId),
          ],
        },
      },
    });
    const found = new Map<string, VersionedMemory>(
      response.hits.hits.flatMap((hit) =>
        hit._id && hit._source && hit._seq_no !== undefined && hit._primary_term !== undefined
          ? [
              [
                hit._id,
                { document: hit._source, seqNo: hit._seq_no, primaryTerm: hit._primary_term },
              ],
            ]
          : []
      )
    );

    const now = this.getNow().toISOString();
    const claimed = new Set<string>();
    const planned: Array<{
      keepId: string;
      sourceIds: string[];
      document: ShortTermMemoryKiDocument;
    }> = [];
    let skipped = 0;
    for (const merge of merges) {
      const members = unique([merge.keep_id, ...merge.source_ids]);
      if (members.length < 2 || members.some((id) => !found.has(id) || claimed.has(id))) {
        skipped++;
        continue;
      }
      members.forEach((id) => claimed.add(id));
      planned.push({
        keepId: merge.keep_id,
        sourceIds: members.filter((id) => id !== merge.keep_id),
        document: mergedDocument({ merge, found, members, now, writer }),
      });
    }

    const writes =
      planned.length > 0
        ? await this.esClient.bulk({
            refresh: 'wait_for',
            operations: planned.flatMap(({ keepId, document }) => {
              const { seqNo, primaryTerm } = found.get(keepId) as VersionedMemory;
              return [
                {
                  index: {
                    _index: memoryIndexName,
                    _id: keepId,
                    if_seq_no: seqNo,
                    if_primary_term: primaryTerm,
                  },
                },
                document,
              ];
            }),
          })
        : { items: [] };
    // A merge whose kept memory was revised meanwhile is dropped, and its sources stay.
    const written = planned.filter((_, position) =>
      isSuccess(writes.items[position]?.index?.status)
    );
    skipped += planned.length - written.length;

    const deleteIds = [
      ...written.flatMap(({ sourceIds }) => sourceIds),
      ...remove.map(({ id }) => id).filter((id) => found.has(id) && !claimed.has(id)),
    ];
    const deletes =
      deleteIds.length > 0
        ? await this.esClient.bulk({
            refresh: 'wait_for',
            operations: unique(deleteIds).map((id) => {
              const { seqNo, primaryTerm } = found.get(id) as VersionedMemory;
              return {
                delete: {
                  _index: memoryIndexName,
                  _id: id,
                  if_seq_no: seqNo,
                  if_primary_term: primaryTerm,
                },
              };
            }),
          })
        : { items: [] };

    return {
      merged: written.length,
      deleted: deletes.items.filter((item) => isSuccess(item.delete?.status)).length,
      skipped,
    };
  }

  async decay({
    spaceId,
    agentIds,
    unusedDays,
  }: ShortTermMemoryDecayParams): Promise<ShortTermMemoryDecayResult> {
    if (!(await this.esClient.indices.exists({ index: memoryIndexName }))) {
      return { expired: 0, unused: 0 };
    }
    const now = this.getNow();
    const cutoff = new Date(now.getTime() - unusedDays * DAY_MS).toISOString();
    const scope = [shortTermMemoryTypeFilter, spaceFilter(spaceId), ...agentsFilter(agentIds)];
    const expired = await this.esClient.deleteByQuery({
      index: memoryIndexName,
      refresh: true,
      conflicts: 'proceed',
      query: {
        bool: { filter: [...scope, { range: { expires_at: { lte: now.toISOString() } } }] },
      },
    });
    // A memory written without an expiry was meant to be kept, so only expiring ones decay.
    const unused = await this.esClient.deleteByQuery({
      index: memoryIndexName,
      refresh: true,
      conflicts: 'proceed',
      query: {
        bool: {
          filter: [
            ...scope,
            { exists: { field: 'expires_at' } },
            { range: { updated_at: { lt: cutoff } } },
          ],
          must_not: [
            { range: { [attributeField(MEMORY_ATTRIBUTES.lastUsedAt)]: { gte: cutoff } } },
          ],
        },
      },
    });
    return { expired: expired.deleted ?? 0, unused: unused.deleted ?? 0 };
  }
}

interface VersionedMemory {
  document: ShortTermMemoryKiDocument;
  seqNo: number;
  primaryTerm: number;
}

/**
 * The kept memory with the merged content. It keeps the longest lifetime of its members (none when
 * any never expires), their latest use and every reference, and is a new candidate for promotion.
 */
const mergedDocument = ({
  merge,
  found,
  members,
  now,
  writer,
}: {
  merge: ShortTermMemoryMerge;
  found: Map<string, VersionedMemory>;
  members: string[];
  now: string;
  writer: ShortTermMemoryConsolidateParams['writer'];
}): ShortTermMemoryKiDocument => {
  const documents = members.map((id) => (found.get(id) as VersionedMemory).document);
  const { document: keeper } = found.get(merge.keep_id) as VersionedMemory;
  const expiries = documents.map(({ expires_at: expiresAt }) => expiresAt);
  const expiresAt = expiries.every((value): value is string => value !== undefined)
    ? latest(expiries)
    : undefined;
  const lastUsedAt = latest(
    documents.flatMap(({ attributes }) => attributes[MEMORY_ATTRIBUTES.lastUsedAt] ?? [])
  );
  const { expires_at: _keeperExpiry, ...rest } = keeper;
  return {
    ...rest,
    title: merge.title,
    description: merge.description,
    content: merge.content,
    tags: merge.tags ?? keeper.tags ?? [],
    updated_at: now,
    ...(expiresAt !== undefined && { expires_at: expiresAt }),
    references: uniqueBy(
      documents.flatMap(({ references }) => references ?? []),
      ({ uri, relation }) => `${relation} ${uri}`
    ),
    attributes: {
      ...withoutPromotion(keeper.attributes),
      ...(lastUsedAt !== undefined && { [MEMORY_ATTRIBUTES.lastUsedAt]: lastUsedAt }),
      ...promotionAttributes({ status: 'pending' }),
    },
    governance: {
      provenance: { created_by: keeper.governance.provenance.created_by, updated_by: writer },
    },
  };
};

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const DEFAULT_OWNER_LIST_LIMIT = 20;
export const MAX_OWNER_LIST_LIMIT = 100;
const DEFAULT_MEMORIES_PER_OWNER_LIMIT = 50;
export const MAX_MEMORIES_PER_OWNER_LIMIT = 100;

/** Searches of a missing index return nothing rather than failing. */
const MISSING_INDEX_OK = { ignore_unavailable: true, allow_no_indices: true } as const;

const clamp = (value: number | undefined, fallback: number, max: number): number =>
  Math.min(Math.max(value ?? fallback, 1), max);

const isSuccess = (status: number | undefined): boolean =>
  status !== undefined && status >= 200 && status < 300;

const unique = (values: string[]): string[] => [...new Set(values)];

const uniqueBy = <T>(values: T[], key: (value: T) => string): T[] => [
  ...new Map(values.map((value) => [key(value), value])).values(),
];

/** ISO 8601 UTC timestamps sort as strings. */
const latest = (values: string[]): string | undefined =>
  values.length > 0 ? values.reduce((max, value) => (value > max ? value : max)) : undefined;

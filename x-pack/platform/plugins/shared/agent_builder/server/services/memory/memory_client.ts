/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import { DEFAULT_SHORT_TERM_MEMORY_TTL_MS, type ShortTermMemory } from '@kbn/agent-builder-common';
import {
  ShortTermMemoryNotFoundError,
  type ScopedShortTermMemoryClient,
  type ShortTermMemoryContent,
  type ShortTermMemoryCreateParams,
  type ShortTermMemoryListParams,
  type ShortTermMemorySearchParams,
} from '@kbn/agent-builder-server';
import { memoryIndexName } from './storage';
import {
  MEMORY_ATTRIBUTES,
  SHORT_TERM_MEMORY_ACCESS_ACTION,
  agentFilter,
  notExpiredFilter,
  ownerFilter,
  promotionAttributes,
  shortTermMemoryTypeFilter,
  spaceFilter,
  toKiType,
  toShortTermMemory,
  withoutPromotion,
  type ShortTermMemoryKiDocument,
} from './memory_document';

export const DEFAULT_MEMORY_LIST_LIMIT = 20;
export const MAX_MEMORY_LIST_LIMIT = 100;

/** Use is recorded at most this often per memory, so recall and every prompt don't each write. */
const MARK_USED_INTERVAL_MS = 60 * 60 * 1000;

const clampLimit = (limit: number | undefined): number =>
  Math.min(Math.max(limit ?? DEFAULT_MEMORY_LIST_LIMIT, 1), MAX_MEMORY_LIST_LIMIT);

/** `undefined` uses the default TTL from `now`; `null` makes the memory non-expiring. */
const resolveExpiresAt = (expiresAt: string | null | undefined, now: Date): string | undefined => {
  if (expiresAt === null) {
    return undefined;
  }
  if (expiresAt === undefined) {
    return new Date(now.getTime() + DEFAULT_SHORT_TERM_MEMORY_TTL_MS).toISOString();
  }
  return new Date(expiresAt).toISOString();
};

/** Searches of a missing index return nothing rather than failing. */
const MISSING_INDEX_OK = { ignore_unavailable: true, allow_no_indices: true } as const;

export class ShortTermMemoryClient implements ScopedShortTermMemoryClient {
  private readonly esClient: ElasticsearchClient;
  private readonly ensureIndex: () => Promise<void>;
  private readonly space: string;
  private readonly userName: string;
  private readonly getNow: () => Date;
  private readonly generateId: () => string;
  public readonly userId: string;

  constructor({
    esClient,
    ensureIndex,
    space,
    user,
    getNow = () => new Date(),
    generateId = uuidv4,
  }: {
    /** The internal user: only Kibana writes short-term memory, and this client filters by owner. */
    esClient: ElasticsearchClient;
    ensureIndex: () => Promise<void>;
    space: string;
    user: { id: string; username: string };
    getNow?: () => Date;
    generateId?: () => string;
  }) {
    this.esClient = esClient;
    this.ensureIndex = ensureIndex;
    this.space = space;
    this.userId = user.id;
    this.userName = user.username;
    this.getNow = getNow;
    this.generateId = generateId;
  }

  async create(params: ShortTermMemoryCreateParams): Promise<ShortTermMemory> {
    await this.ensureIndex();
    const now = this.getNow().toISOString();
    const id = this.generateId();
    const writer = this.writer(params.agentId, params.sessionId);
    const expiresAt = resolveExpiresAt(params.expires_at, this.getNow());
    const document: ShortTermMemoryKiDocument = {
      '@timestamp': now,
      id,
      type: toKiType(params.type),
      title: params.title,
      description: params.description,
      content: params.content,
      tags: params.tags ?? [],
      updated_at: now,
      ...(expiresAt !== undefined && { expires_at: expiresAt }),
      references: [{ uri: `conversation://${params.sessionId}`, relation: 'derived_from' }],
      attributes: {
        [MEMORY_ATTRIBUTES.userId]: this.userId,
        [MEMORY_ATTRIBUTES.userName]: this.userName,
        [MEMORY_ATTRIBUTES.agentId]: params.agentId,
        [MEMORY_ATTRIBUTES.sessionId]: params.sessionId,
        [MEMORY_ATTRIBUTES.space]: this.space,
        ...promotionAttributes({ status: 'pending' }),
      },
      governance: { provenance: { created_by: writer, updated_by: writer } },
      permissions: {
        kibana: {
          privileges: [{ space: this.space, name: [SHORT_TERM_MEMORY_ACCESS_ACTION], count: 1 }],
        },
      },
    };
    await this.esClient.index({
      index: memoryIndexName,
      id,
      document,
      op_type: 'create',
      refresh: 'wait_for',
    });
    return toShortTermMemory(document);
  }

  async update(id: string, changes: Partial<ShortTermMemoryContent>): Promise<ShortTermMemory> {
    const { document: existing, seqNo, primaryTerm } = await this.getOwned(id);
    const now = this.getNow().toISOString();
    const { expires_at: expiresAtChange, type, ...contentChanges } = changes;
    const expiresAt = resolveExpiresAt(expiresAtChange, this.getNow());
    const { expires_at: _previousExpiry, ...rest } = existing;
    const document: ShortTermMemoryKiDocument = {
      ...rest,
      ...contentChanges,
      ...(type !== undefined && { type: toKiType(type) }),
      tags: contentChanges.tags ?? existing.tags ?? [],
      updated_at: now,
      ...(expiresAt !== undefined && { expires_at: expiresAt }),
      // Revised content is a new candidate for promotion.
      attributes: {
        ...withoutPromotion(existing.attributes),
        ...promotionAttributes({ status: 'pending' }),
      },
      governance: {
        provenance: {
          created_by: existing.governance.provenance.created_by,
          updated_by: this.writer(
            existing.attributes[MEMORY_ATTRIBUTES.agentId],
            existing.attributes[MEMORY_ATTRIBUTES.sessionId]
          ),
        },
      },
    };
    await this.esClient.index({
      index: memoryIndexName,
      id,
      document,
      if_seq_no: seqNo,
      if_primary_term: primaryTerm,
      refresh: 'wait_for',
    });
    return toShortTermMemory(document);
  }

  async get(id: string): Promise<ShortTermMemory> {
    return toShortTermMemory((await this.getOwned(id)).document);
  }

  async list({ agentId, limit, includeExpired = false }: ShortTermMemoryListParams = {}): Promise<
    ShortTermMemory[]
  > {
    const response = await this.esClient.search<ShortTermMemoryKiDocument>({
      index: memoryIndexName,
      ...MISSING_INDEX_OK,
      size: clampLimit(limit),
      query: { bool: { filter: this.ownerFilters({ agentId, includeExpired }) } },
      sort: [{ updated_at: { order: 'desc' } }],
    });
    return response.hits.hits.flatMap((hit) =>
      hit._source ? [toShortTermMemory(hit._source)] : []
    );
  }

  async search({ query, agentId, limit }: ShortTermMemorySearchParams): Promise<ShortTermMemory[]> {
    const response = await this.esClient.search<ShortTermMemoryKiDocument>({
      index: memoryIndexName,
      ...MISSING_INDEX_OK,
      size: clampLimit(limit),
      query: {
        bool: {
          filter: this.ownerFilters({ agentId, includeExpired: false }),
          must: [
            {
              multi_match: {
                query,
                fields: ['title^3', 'description^2', 'content', 'tags^2'],
              },
            },
          ],
        },
      },
    });
    return response.hits.hits.flatMap((hit) =>
      hit._source ? [toShortTermMemory(hit._source)] : []
    );
  }

  async delete(id: string): Promise<void> {
    await this.getOwned(id);
    await this.esClient.delete({ index: memoryIndexName, id, refresh: 'wait_for' });
  }

  async deleteAll({ agentId }: { agentId?: string } = {}): Promise<{ deleted: number }> {
    if (!(await this.esClient.indices.exists({ index: memoryIndexName }))) {
      return { deleted: 0 };
    }
    const { deleted } = await this.esClient.deleteByQuery({
      index: memoryIndexName,
      refresh: true,
      conflicts: 'proceed',
      query: { bool: { filter: this.ownerFilters({ agentId, includeExpired: true }) } },
    });
    return { deleted: deleted ?? 0 };
  }

  async markUsed(memories: ShortTermMemory[]): Promise<void> {
    const now = this.getNow();
    const due = memories.filter(
      ({ user_id: userId, space, last_used_at: lastUsedAt }) =>
        userId === this.userId &&
        space === this.space &&
        (lastUsedAt === undefined ||
          now.getTime() - new Date(lastUsedAt).getTime() >= MARK_USED_INTERVAL_MS)
    );
    if (due.length === 0) {
      return;
    }
    const usedAt = now.toISOString();
    await this.esClient.bulk({
      // A partial update leaves the content, `updated_at` and promotion untouched.
      operations: due.flatMap(({ id }) => [
        { update: { _index: memoryIndexName, _id: id, retry_on_conflict: 3 } },
        { doc: { attributes: { [MEMORY_ATTRIBUTES.lastUsedAt]: usedAt } } },
      ]),
    });
  }

  private writer(agentId: string, sessionId: string) {
    return {
      uri: `user://${this.userId}`,
      metadata: { agent_id: agentId, session_id: sessionId },
    };
  }

  private ownerFilters({
    agentId,
    includeExpired,
  }: {
    agentId?: string;
    includeExpired: boolean;
  }): QueryDslQueryContainer[] {
    return [
      shortTermMemoryTypeFilter,
      spaceFilter(this.space),
      ownerFilter(this.userId),
      ...(agentId !== undefined ? [agentFilter(agentId)] : []),
      ...(includeExpired ? [] : [notExpiredFilter(this.getNow())]),
    ];
  }

  /** The memory with this id when the caller owns it in this space; otherwise not found. */
  private async getOwned(id: string): Promise<{
    document: ShortTermMemoryKiDocument;
    seqNo?: number;
    primaryTerm?: number;
  }> {
    const response = await this.esClient.search<ShortTermMemoryKiDocument>({
      index: memoryIndexName,
      ...MISSING_INDEX_OK,
      size: 1,
      seq_no_primary_term: true,
      query: {
        bool: {
          filter: [{ term: { _id: id } }, ...this.ownerFilters({ includeExpired: true })],
        },
      },
    });
    const hit = response.hits.hits[0];
    if (!hit?._source) {
      throw new ShortTermMemoryNotFoundError(id);
    }
    return { document: hit._source, seqNo: hit._seq_no, primaryTerm: hit._primary_term };
  }
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type {
  MemoryNode,
  MemoryCreateRequest,
  MemoryUpdateRequest,
  MemoryListOptions,
  MemorySearchOptions,
  MemoryLink,
  MemoryEdgeType,
  MemoryStatus,
} from '@kbn/agent-builder-common';
import { createSpaceDslFilter } from '../../../utils/spaces';
import {
  createStorage,
  linksToStorage,
  sourceRefsToStorage,
} from './storage';
import type { MemoryStorage, MemoryProperties } from './storage';

/** Maximum number of graph links per memory node */
const MAX_LINKS_PER_NODE = 50;

/** Symmetric edge types that must be maintained bidirectionally */
const SYMMETRIC_EDGE_TYPES: MemoryEdgeType[] = ['related_to', 'same_project'];

export interface MemoryClient {
  get(id: string): Promise<MemoryNode>;
  list(opts?: MemoryListOptions): Promise<MemoryNode[]>;
  create(req: MemoryCreateRequest): Promise<MemoryNode>;
  update(req: MemoryUpdateRequest): Promise<MemoryNode>;
  bulkCreate(reqs: MemoryCreateRequest[]): Promise<MemoryNode[]>;
  delete(id: string): Promise<boolean>;
  search(query: string, opts?: MemorySearchOptions): Promise<MemoryNode[]>;
  addLink(fromId: string, link: MemoryLink): Promise<void>;
  removeLink(fromId: string, targetId: string): Promise<void>;
  updateLinkWeight(fromId: string, targetId: string, weight: number): Promise<void>;
}

interface Document {
  _id: string;
  _source: MemoryProperties;
  _seq_no?: number;
  _primary_term?: number;
}

const fromDoc = (doc: Document): MemoryNode => {
  const { _id, _source } = doc;
  return {
    id: _id,
    type: _source.type,
    subtype: _source.subtype,
    summary: _source.summary,
    full: _source.full,
    confidence: _source.confidence,
    salience: _source.salience ?? 0.5,
    recency: _source.recency,
    utility: _source.utility ?? 0.5,
    stability: _source.stability ?? 0.1,
    access_count: _source.access_count ?? 0,
    reinforcement_score: _source.reinforcement_score ?? 0,
    status: _source.status,
    source_refs: (_source.source_refs ?? []).map((r) => ({
      conversation_id: r.conversation_id,
      round_id: r.round_id,
      message_ids: r.message_ids,
    })),
    links: (_source.links ?? []).map((l) => ({
      target_id: l.target_id,
      type: l.type,
      weight: l.weight,
    })),
    created_at: _source.created_at,
    updated_at: _source.updated_at,
    space: _source.space,
    user_id: _source.user_id,
    user_name: _source.user_name,
    last_used_at: _source.last_used_at,
    last_reinforced_at: _source.last_reinforced_at,
    conflict_refs: _source.conflict_refs,
    retrieval_stats_by_stage: _source.retrieval_stats_by_stage,
  };
};

class MemoryClientImpl implements MemoryClient {
  private readonly storage: MemoryStorage;
  private readonly esClient: ElasticsearchClient;
  private readonly space: string;
  private readonly userName: string;
  private readonly userId?: string;
  private readonly logger: Logger;

  constructor({
    storage,
    esClient,
    space,
    userName,
    userId,
    logger,
  }: {
    storage: MemoryStorage;
    esClient: ElasticsearchClient;
    space: string;
    userName: string;
    userId?: string;
    logger: Logger;
  }) {
    this.storage = storage;
    this.esClient = esClient;
    this.space = space;
    this.userName = userName;
    this.userId = userId;
    this.logger = logger;
  }

  async get(id: string): Promise<MemoryNode> {
    const response = await this.storage.getClient().search({
      track_total_hits: false,
      size: 1,
      query: {
        bool: {
          filter: [createSpaceDslFilter(this.space), { term: { _id: id } }],
        },
      },
    });

    const hits = response.hits.hits;
    if (hits.length === 0) {
      throw new Error(`Memory node not found: ${id}`);
    }

    return fromDoc(hits[0] as Document);
  }

  async list(opts: MemoryListOptions = {}): Promise<MemoryNode[]> {
    const { type, status, size = 100, from = 0 } = opts;

    const filters: QueryDslQueryContainer[] = [createSpaceDslFilter(this.space)];

    if (this.userName) {
      filters.push({ term: { user_name: this.userName } });
    }

    if (type) {
      filters.push({ term: { type } });
    }

    if (status) {
      if (Array.isArray(status)) {
        filters.push({ terms: { status } });
      } else {
        filters.push({ term: { status } });
      }
    }

    const response = await this.storage.getClient().search({
      track_total_hits: false,
      size,
      from,
      query: {
        bool: {
          filter: filters,
        },
      },
      sort: [{ updated_at: { order: 'desc' } }],
    });

    return (response.hits.hits as Document[]).map(fromDoc);
  }

  async create(req: MemoryCreateRequest): Promise<MemoryNode> {
    const now = new Date().toISOString();
    const id = uuidv4();

    const conversationId = req.source_refs?.[0]?.conversation_id;

    const doc: MemoryProperties = {
      space: this.space,
      user_id: this.userId,
      user_name: this.userName,
      conversation_id: conversationId,
      type: req.type,
      subtype: req.subtype,
      summary: req.summary,
      full: req.full,
      full_semantic: req.full,
      confidence: req.confidence,
      salience: req.salience ?? 0.5,
      recency: now,
      utility: req.utility ?? 0.5,
      stability: req.stability ?? 0.1,
      access_count: 0,
      reinforcement_score: 0,
      status: req.status ?? 'candidate',
      created_at: now,
      updated_at: now,
      links: req.links ? linksToStorage(req.links) : [],
      source_refs: req.source_refs ? sourceRefsToStorage(req.source_refs) : [],
    };

    await this.storage.getClient().index({ id, document: doc });

    return this.get(id);
  }

  async update(req: MemoryUpdateRequest): Promise<MemoryNode> {
    const existing = await this.get(req.id);
    const now = new Date().toISOString();

    const updatedDoc: Partial<MemoryProperties> = {
      updated_at: now,
    };

    if (req.summary !== undefined) updatedDoc.summary = req.summary;
    if (req.full !== undefined) updatedDoc.full = req.full;
    if (req.confidence !== undefined) updatedDoc.confidence = req.confidence;
    if (req.salience !== undefined) updatedDoc.salience = req.salience;
    if (req.recency !== undefined) updatedDoc.recency = req.recency;
    if (req.utility !== undefined) updatedDoc.utility = req.utility;
    if (req.stability !== undefined) updatedDoc.stability = req.stability;
    if (req.access_count !== undefined) updatedDoc.access_count = req.access_count;
    if (req.reinforcement_score !== undefined)
      updatedDoc.reinforcement_score = req.reinforcement_score;
    if (req.status !== undefined) updatedDoc.status = req.status;
    if (req.source_refs !== undefined)
      updatedDoc.source_refs = sourceRefsToStorage(req.source_refs);
    if (req.links !== undefined) updatedDoc.links = linksToStorage(req.links);
    if (req.last_used_at !== undefined) updatedDoc.last_used_at = req.last_used_at;
    if (req.last_reinforced_at !== undefined)
      updatedDoc.last_reinforced_at = req.last_reinforced_at;
    if (req.conflict_refs !== undefined) updatedDoc.conflict_refs = req.conflict_refs;
    if (req.retrieval_stats_by_stage !== undefined)
      updatedDoc.retrieval_stats_by_stage = req.retrieval_stats_by_stage;

    // Merge the update into the existing document
    const mergedDoc: MemoryProperties = {
      space: existing.space,
      user_id: existing.user_id,
      user_name: existing.user_name,
      type: existing.type,
      subtype: existing.subtype,
      summary: updatedDoc.summary ?? existing.summary,
      full: updatedDoc.full ?? existing.full,
      confidence: updatedDoc.confidence ?? existing.confidence,
      salience: updatedDoc.salience ?? existing.salience,
      recency: updatedDoc.recency ?? existing.recency,
      utility: updatedDoc.utility ?? existing.utility,
      stability: updatedDoc.stability ?? existing.stability,
      access_count: updatedDoc.access_count ?? existing.access_count,
      reinforcement_score: updatedDoc.reinforcement_score ?? existing.reinforcement_score,
      status: updatedDoc.status ?? existing.status,
      created_at: existing.created_at,
      updated_at: now,
      last_used_at: updatedDoc.last_used_at ?? existing.last_used_at,
      last_reinforced_at: updatedDoc.last_reinforced_at ?? existing.last_reinforced_at,
      links: updatedDoc.links !== undefined ? updatedDoc.links : linksToStorage(existing.links),
      source_refs:
        updatedDoc.source_refs !== undefined
          ? updatedDoc.source_refs
          : sourceRefsToStorage(existing.source_refs),
      conflict_refs: updatedDoc.conflict_refs ?? existing.conflict_refs,
      retrieval_stats_by_stage:
        updatedDoc.retrieval_stats_by_stage ?? existing.retrieval_stats_by_stage,
    };

    await this.storage.getClient().index({ id: req.id, document: mergedDoc });

    return this.get(req.id);
  }

  async bulkCreate(reqs: MemoryCreateRequest[]): Promise<MemoryNode[]> {
    if (reqs.length === 0) {
      return [];
    }

    const now = new Date().toISOString();
    const operations: Array<{ index: { document: MemoryProperties; _id?: string } }> = reqs.map(
      (req) => ({
        index: {
          _id: uuidv4(),
          document: {
            space: this.space,
            user_id: this.userId,
            user_name: this.userName,
            conversation_id: req.source_refs?.[0]?.conversation_id,
            type: req.type,
            subtype: req.subtype,
            summary: req.summary,
            full: req.full,
            full_semantic: req.full,
            confidence: req.confidence,
            salience: req.salience ?? 0.5,
            recency: now,
            utility: req.utility ?? 0.5,
            stability: req.stability ?? 0.1,
            access_count: 0,
            reinforcement_score: 0,
            status: req.status ?? 'candidate',
            created_at: now,
            updated_at: now,
            links: req.links ? linksToStorage(req.links) : [],
            source_refs: req.source_refs ? sourceRefsToStorage(req.source_refs) : [],
          },
        },
      })
    );

    const ids = operations.map((op) => op.index._id!);

    await this.storage.getClient().bulk({ operations });

    // Fetch created nodes
    const results = await Promise.allSettled(ids.map((id) => this.get(id)));
    return results
      .filter((r): r is PromiseFulfilledResult<MemoryNode> => r.status === 'fulfilled')
      .map((r) => r.value);
  }

  async delete(id: string): Promise<boolean> {
    // Verify existence and access
    await this.get(id);

    const response = await this.storage.getClient().delete({ id });
    return response.result === 'deleted';
  }

  async search(query: string, opts: MemorySearchOptions = {}): Promise<MemoryNode[]> {
    const {
      type,
      status = ['candidate', 'provisional', 'established', 'consolidated'] as MemoryStatus[],
      size = 10,
    } = opts;

    const filters: QueryDslQueryContainer[] = [createSpaceDslFilter(this.space)];

    if (this.userName) {
      filters.push({ term: { user_name: this.userName } });
    }

    if (type) {
      filters.push({ term: { type } });
    }

    if (status.length > 0) {
      filters.push({ terms: { status } });
    }

    // BM25 full-text search over summary and full fields
    const bm25Query = {
      bool: {
        should: [
          {
            multi_match: {
              query,
              fields: ['summary^2', 'full'],
              type: 'best_fields' as const,
            },
          },
        ],
        filter: filters,
      },
    };

    const response = await this.storage.getClient().search({
      track_total_hits: false,
      size,
      query: bm25Query,
    });

    return (response.hits.hits as Document[]).map(fromDoc);
  }

  async addLink(fromId: string, link: MemoryLink): Promise<void> {
    const node = await this.get(fromId);

    // Enforce max links cap
    if (node.links.length >= MAX_LINKS_PER_NODE) {
      throw new Error(
        `Cannot add link: node ${fromId} already has ${MAX_LINKS_PER_NODE} links (maximum)`
      );
    }

    // Remove existing link to same target if present
    const existingLinks = node.links.filter((l) => l.target_id !== link.target_id);
    const newLinks = [...existingLinks, link];

    await this.update({
      id: fromId,
      links: newLinks,
    });

    // For symmetric edge types, add the reverse link
    if (SYMMETRIC_EDGE_TYPES.includes(link.type)) {
      try {
        const targetNode = await this.get(link.target_id);
        const reverseExists = targetNode.links.some((l) => l.target_id === fromId);
        if (!reverseExists && targetNode.links.length < MAX_LINKS_PER_NODE) {
          const reverseLinks = [
            ...targetNode.links,
            { target_id: fromId, type: link.type, weight: link.weight },
          ];
          await this.update({
            id: link.target_id,
            links: reverseLinks,
          });
        }
      } catch (err) {
        // Target may not exist or may be inaccessible; non-fatal for symmetric update
        this.logger.warn(
          `Could not add symmetric reverse link from ${link.target_id} to ${fromId}: ${
            (err as Error).message
          }`
        );
      }
    }
  }

  async removeLink(fromId: string, targetId: string): Promise<void> {
    const node = await this.get(fromId);
    const removedLink = node.links.find((l) => l.target_id === targetId);
    const newLinks = node.links.filter((l) => l.target_id !== targetId);

    await this.update({ id: fromId, links: newLinks });

    // For symmetric edges, remove the reverse link too
    if (removedLink && SYMMETRIC_EDGE_TYPES.includes(removedLink.type)) {
      try {
        const targetNode = await this.get(targetId);
        const reverseLinks = targetNode.links.filter((l) => l.target_id !== fromId);
        await this.update({ id: targetId, links: reverseLinks });
      } catch (err) {
        this.logger.warn(
          `Could not remove symmetric reverse link from ${targetId} to ${fromId}: ${
            (err as Error).message
          }`
        );
      }
    }
  }

  async updateLinkWeight(fromId: string, targetId: string, weight: number): Promise<void> {
    const node = await this.get(fromId);
    const newLinks = node.links.map((l) => (l.target_id === targetId ? { ...l, weight } : l));

    await this.update({ id: fromId, links: newLinks });
  }
}

export const createMemoryClient = ({
  esClient,
  space,
  userName,
  userId,
  logger,
}: {
  esClient: ElasticsearchClient;
  space: string;
  userName: string;
  userId?: string;
  logger: Logger;
}): MemoryClient => {
  const storage = createStorage({ logger, esClient });
  return new MemoryClientImpl({ storage, esClient, space, userName, userId, logger });
};

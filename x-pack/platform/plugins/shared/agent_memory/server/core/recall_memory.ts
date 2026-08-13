/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MemoryCategory } from '../storage/memory_storage';
import type { MemoryDocument, MemoryStorage } from '../storage/memory_storage';
import type { ResolvedIdentity } from './resolve_identity';
import { buildRetriever } from '../recall/build_retriever';

export interface RecallMemoryParams {
  query: string;
  category?: MemoryCategory;
  /** Entity ids to boost in the entity recall leg. */
  entities?: string[];
  /** Max results. Default 10, cap 50. */
  limit?: number;
  space_id: string;
  identity: ResolvedIdentity;
}

export interface RecalledMemory {
  id: string;
  title: string;
  description: string;
  category?: string;
  type?: string;
  tags?: string[];
  created_at: string;
  origin?: string;
  assurance?: string;
  author: string;
  author_kind: string;
  revision: number;
}

export interface RecallMemoryResult {
  memories: RecalledMemory[];
}

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 10;

/**
 * Recalls relevant memories using three-leg RRF (BM25 + semantic + entity).
 *
 * Recall fails open: any ES error returns an empty result set rather than
 * propagating to the agent. The caller should log the error for observability.
 *
 * Mandatory filters (G3) are applied unconditionally via `buildRetriever`:
 *  - `space_id` — isolation per Kibana space
 *  - `author` — isolation per user identity
 * These are injected before any caller-supplied params; no param can widen them.
 */
export const recallMemory = async ({
  storage,
  params,
}: {
  storage: MemoryStorage;
  params: RecallMemoryParams;
}): Promise<RecallMemoryResult> => {
  const { query, category, entities, space_id, identity } = params;
  const limit = Math.min(params.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
  const client = storage.getClient();

  try {
    const retriever = buildRetriever({
      query,
      space_id,
      author: identity.author,
      entities,
      category,
      limit,
    });

    const result = await client.search({
      retriever,
      size: limit,
      track_total_hits: false,
      _source: true,
    });

    const memories: RecalledMemory[] = result.hits.hits
      .map((hit) => {
        const doc = hit._source as MemoryDocument;
        if (!doc) return null;
        return {
          id: hit._id ?? doc.id,
          title: doc.title,
          description: doc.description,
          category: doc.memory?.category,
          type: doc.memory?.type,
          tags: doc.tags,
          created_at: doc.created_at,
          origin: doc.memory?.origin,
          assurance: doc.memory?.assurance,
          author: doc.memory?.provenance?.author,
          author_kind: doc.memory?.provenance?.author_kind,
          revision: doc.memory?.revision,
        } as RecalledMemory;
      })
      .filter((m): m is RecalledMemory => m !== null);

    return { memories };
  } catch {
    // Fail open: an unreachable memory service must never stop the agent (G5, D-security).
    return { memories: [] };
  }
};

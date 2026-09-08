/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { MemoryCategory } from '../storage/memory_storage';
import type { MemoryStorage } from '../storage/memory_storage';
import type { ResolvedIdentity } from './resolve_identity';
import {
  buildBeliefFilter,
  buildHybridRecallPipeline,
  buildKeywordRecallPipeline,
} from '../recall/build_retriever';
import { describeError } from './describe_error';

export interface RecallMemoryParams {
  query: string;
  category?: MemoryCategory;
  tags?: string[];
  /** Max results. Default 10, cap 50. */
  limit?: number;
  space_id: string;
  identity: ResolvedIdentity;
  /** Consumer namespace filter. Default 'agent_memory'. */
  namespace?: string;
}

export interface RecalledMemory {
  id: string;
  title: string;
  description: string;
  category?: string;
  type?: string;
  tags?: string[];
  created_at: string;
  author: string;
  author_kind: string;
  revision: number;
  /** 'user' for personal memories, 'space' for team-shared memories. */
  scope?: string;
}

export interface RecallMemoryResult {
  memories: RecalledMemory[];
}

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 10;

/**
 * Recalls relevant memories using hybrid RRF (BM25 + semantic).
 *
 * Recall fails open: any ES error returns an empty result set rather than
 * propagating to the agent. The caller should log the error for observability.
 *
 * Mandatory filters (G3) are applied unconditionally via the ES|QL body filter:
 *  - `space_id` — isolation per Kibana space
 *  - user scope with `scope_id` set to the authenticated identity
 * These are injected before any caller-supplied params; no param can widen them.
 */
export const recallMemory = async ({
  storage,
  params,
  logger,
}: {
  storage: MemoryStorage;
  params: RecallMemoryParams;
  logger: Pick<Logger, 'warn'>;
}): Promise<RecallMemoryResult> => {
  const { query, category, tags, space_id, identity, namespace } = params;
  const limit = Math.min(params.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
  const client = storage.getClient();

  const filter = buildBeliefFilter({
    space_id,
    scope_id: identity.author,
    namespace,
    category,
    tags,
  });

  const searchWithPipeline = async (
    pipeline: ReturnType<typeof buildHybridRecallPipeline>
  ): Promise<RecallMemoryResult> => {
    const result = await client.esql({
      metadata: ['_id', '_index', '_score'],
      pipeline,
      filter,
    });

    const columnIndex = new Map(result.columns.map(({ name }, index) => [name, index]));
    const read = (row: unknown[], column: string): unknown => {
      const index = columnIndex.get(column);
      return index === undefined ? undefined : row[index];
    };
    const toStringArray = (value: unknown): string[] | undefined => {
      if (value == null) return undefined;
      return Array.isArray(value)
        ? value.filter((item) => item != null).map(String)
        : [String(value)];
    };

    const memories: RecalledMemory[] = result.values.map((row) => {
      const revision = read(row, 'revision');
      return {
        id: String(read(row, '_id') ?? ''),
        title: String(read(row, 'title') ?? ''),
        description: String(read(row, 'description') ?? ''),
        category: read(row, 'category') == null ? undefined : String(read(row, 'category')),
        type: read(row, 'memory_type') == null ? undefined : String(read(row, 'memory_type')),
        tags: toStringArray(read(row, 'tags')),
        created_at: String(read(row, 'created_at') ?? ''),
        author: String(read(row, 'author') ?? ''),
        author_kind: String(read(row, 'author_kind') ?? ''),
        revision: typeof revision === 'number' ? revision : Number(revision ?? 0),
        scope: read(row, 'scope') == null ? undefined : String(read(row, 'scope')),
      };
    });

    return { memories };
  };

  try {
    return await searchWithPipeline(buildHybridRecallPipeline({ query, limit }));
  } catch (error) {
    logger.warn(
      `Agent Memory hybrid recall failed; retrying with keyword-only retrieval (${describeError(
        error
      )})`
    );
  }

  try {
    return await searchWithPipeline(buildKeywordRecallPipeline({ query, limit }));
  } catch (error) {
    // Fail open: an unreachable memory service must never stop the agent (G5, D-security).
    logger.warn(
      `Agent Memory keyword recall fallback failed; returning empty results (${describeError(
        error
      )})`
    );
    return { memories: [] };
  }
};

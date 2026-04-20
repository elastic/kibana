/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { MemoryNode, MemoryStatus, RetrievalStage } from '@kbn/agent-builder-common';
import type { AgentBuilderConfig } from '../../../config';
import type { MemoryClient } from '../client';
import { memoryIndexName } from '../client/storage';
import { createSpaceDslFilter } from '../../../utils/spaces';
import {
  retrieveByConversation,
  extractFactsFromConversations,
} from './conversation_retrieval';
import { rerank } from './reranking';
import { applyPostRetrieval } from './post_retrieval';
import { expandWithGraphClosure } from './graph_closure';

const DEFAULT_STATUSES: MemoryStatus[] = ['candidate', 'provisional', 'established', 'consolidated'];

/**
 * Extended options for retrieval methods that need additional context.
 */
export interface RetrievalContext {
  stage?: RetrievalStage;
  size?: number;
  esClient?: ElasticsearchClient;
  space?: string;
  userName?: string;
  config?: AgentBuilderConfig;
  inference?: InferenceServerStart;
  request?: KibanaRequest;
  connectorId?: string;
  loadConversation?: (id: string) => Promise<{ rounds: Array<{ input: { message: string }; response: { message: string } }> } | undefined>;
}

/**
 * Run memory retrieval using the configured method, then apply reranking and post-retrieval steps.
 * Shared across round-start, checkpoint, and remember tool queries.
 */
export const runRetrieval = async (
  method: string,
  memoryClient: MemoryClient,
  query: string,
  logger: Logger,
  opts: RetrievalContext = {}
): Promise<MemoryNode[]> => {
  const { stage, size = 10 } = opts;

  let results: MemoryNode[];

  switch (method) {
    case 'bm25':
      results = await memoryClient.search(query, {
        stage,
        size: size * 2,
        status: DEFAULT_STATUSES,
      });
      break;

    case 'semantic':
      results = await runSemanticRetrieval(query, opts, logger);
      break;

    case 'hybrid':
      results = await runHybridRetrieval(query, memoryClient, opts, logger);
      break;

    case 'conversation': {
      if (!opts.esClient || !opts.space || !opts.config) {
        logger.warn('conversation retrieval: missing required deps, falling back to bm25');
        results = await memoryClient.search(query, { stage, size, status: DEFAULT_STATUSES });
        break;
      }

      const convDeps = {
        esClient: opts.esClient,
        space: opts.space,
        userName: opts.userName ?? '',
        config: opts.config,
        logger,
        inference: opts.inference,
        request: opts.request,
        connectorId: opts.connectorId,
      };

      const { memories, conversationIds } = await retrieveByConversation(query, convDeps);

      if (opts.config.memory.retrieval.conversation.stage === 1) {
        results = memories;
        break;
      }

      if (!opts.loadConversation) {
        logger.warn('conversation retrieval stage 2: loadConversation not available, returning stage 1 results');
        results = memories;
        break;
      }

      const facts = await extractFactsFromConversations(query, conversationIds, {
        ...convDeps,
        loadConversation: opts.loadConversation,
      });

      results = [...memories, ...facts];
      break;
    }

    default:
      logger.warn(`Unknown retrieval method "${method}", falling back to bm25`);
      results = await memoryClient.search(query, {
        stage,
        size: size * 2,
        status: DEFAULT_STATUSES,
      });
      break;
  }

  // Apply reranking
  if (opts.config) {
    const rerankMethod = opts.config.memory.retrieval.reranking;
    results = rerank(results, query, rerankMethod, { stage, logger });
  }

  // Graph closure expansion: follow links from seed results to pull in related memories
  if (opts.config?.memory.retrieval.graphClosure?.enabled) {
    results = await expandWithGraphClosure(
      results,
      memoryClient,
      opts.config.memory.retrieval.graphClosure,
      logger
    );
  }

  // Apply post-retrieval steps
  if (opts.config) {
    results = applyPostRetrieval(results, query, opts.config.memory.retrieval.postRetrieval, {
      method,
      logger,
    });
  }

  // Cap to requested size
  const finalResults = results.slice(0, size);

  // Access tracking: bump access_count, recency, and last_used_at for all returned memories.
  // Fire-and-forget — must not slow down retrieval.
  if (finalResults.length > 0) {
    const now = new Date().toISOString();
    for (const node of finalResults) {
      memoryClient
        .update({
          id: node.id,
          access_count: (node.access_count ?? 0) + 1,
          recency: now,
          last_used_at: now,
        })
        .catch(() => {
          // non-fatal, swallow errors
        });
    }
  }

  return finalResults;
};

/**
 * Semantic retrieval using the semantic_text field (kNN via ES).
 */
const runSemanticRetrieval = async (
  query: string,
  opts: RetrievalContext,
  logger: Logger
): Promise<MemoryNode[]> => {
  const { esClient, space, userName, size = 10 } = opts;

  if (!esClient) {
    logger.warn('semantic retrieval: esClient not available');
    return [];
  }

  const filters: Array<Record<string, unknown>> = [];
  if (space) filters.push(createSpaceDslFilter(space));
  if (userName) filters.push({ term: { user_name: userName } });
  filters.push({ terms: { status: DEFAULT_STATUSES } });

  try {
    const response = await esClient.search({
      index: memoryIndexName,
      size: size * 2,
      query: {
        bool: {
          must: [
            {
              semantic: {
                field: 'full_semantic',
                query,
              },
            },
          ],
          filter: filters,
        },
      },
    });

    const hits = response.hits.hits as any[];
    const maxScore = hits.length > 0 ? Math.max(...hits.map((h) => h._score ?? 0)) : 1;
    return hits.map((hit) => {
      const node = docToNode(hit);
      node._relevance_score = maxScore > 0 ? (hit._score ?? 0) / maxScore : 0;
      return node;
    });
  } catch (err) {
    logger.warn(`semantic retrieval failed: ${(err as Error).message}`);
    return [];
  }
};

/**
 * Hybrid retrieval: combine BM25 and semantic results, deduplicate by ID,
 * and merge scores.
 */
const runHybridRetrieval = async (
  query: string,
  memoryClient: MemoryClient,
  opts: RetrievalContext,
  logger: Logger
): Promise<MemoryNode[]> => {
  const { size = 10, stage } = opts;
  const fetchSize = size * 2;

  const [bm25Results, semanticResults] = await Promise.all([
    memoryClient.search(query, {
      stage,
      size: fetchSize,
      status: DEFAULT_STATUSES,
    }).catch((err: Error) => {
      logger.warn(`hybrid retrieval (bm25 leg) failed: ${err.message}`);
      return [] as MemoryNode[];
    }),
    runSemanticRetrieval(query, opts, logger),
  ]);

  // Merge: deduplicate by ID, prefer semantic result when both exist
  const merged = new Map<string, MemoryNode & { _bm25Rank?: number; _semanticRank?: number }>();

  bm25Results.forEach((node, idx) => {
    merged.set(node.id, { ...node, _bm25Rank: idx });
  });

  semanticResults.forEach((node, idx) => {
    const existing = merged.get(node.id);
    if (existing) {
      existing._semanticRank = idx;
    } else {
      merged.set(node.id, { ...node, _semanticRank: idx });
    }
  });

  // Reciprocal Rank Fusion (RRF) scoring
  const k = 60;
  const scored = Array.from(merged.values()).map((node) => {
    const bm25Score = node._bm25Rank !== undefined ? 1 / (k + node._bm25Rank) : 0;
    const semScore = node._semanticRank !== undefined ? 1 / (k + node._semanticRank) : 0;
    return { node, rrfScore: bm25Score + semScore };
  });

  scored.sort((a, b) => b.rrfScore - a.rrfScore);

  // Normalize RRF scores to [0, 1] relative to the top result
  const maxRrf = scored.length > 0 ? scored[0].rrfScore : 1;

  return scored.map(({ node, rrfScore }) => {
    const { _bm25Rank, _semanticRank, ...clean } = node;
    return { ...clean, _relevance_score: maxRrf > 0 ? rrfScore / maxRrf : 0 };
  });
};

const docToNode = (hit: any): MemoryNode => {
  const src = hit._source;
  return {
    id: hit._id,
    type: src.type ?? 'semantic',
    subtype: src.subtype,
    summary: src.summary ?? '',
    full: src.full ?? '',
    confidence: src.confidence ?? 0.5,
    salience: src.salience ?? 0.5,
    recency: src.recency ?? src.updated_at ?? '',
    utility: src.utility ?? 0.5,
    stability: src.stability ?? 0.1,
    access_count: src.access_count ?? 0,
    reinforcement_score: src.reinforcement_score ?? 0,
    status: src.status ?? 'candidate',
    source_refs: src.source_refs ?? [],
    links: src.links ?? [],
    created_at: src.created_at ?? '',
    updated_at: src.updated_at ?? '',
    space: src.space ?? '',
    user_id: src.user_id,
    user_name: src.user_name ?? '',
    _relevance_score: hit._score ?? undefined,
  };
};

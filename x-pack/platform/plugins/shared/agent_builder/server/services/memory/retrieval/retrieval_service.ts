/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { MemoryNode, MemoryStatus, RetrievalStage } from '@kbn/agent-builder-common';
import type { QueryDslQueryContainer, KnnSearch } from '@elastic/elasticsearch/lib/api/types';
import { ActiveMemorySet } from '../active_memory_set';
import { memoryIndexName } from '../client';
import type { EmbeddingService } from '../embeddings';
import { rankMemoryNodes, scoreMemoryNode, DEFAULT_RETRIEVAL_CONFIG } from './scoring';
import type { ScoredMemoryNode, MemoryRetrievalConfig } from './scoring';
import { createSpaceDslFilter } from '../../../utils/spaces';

// ---------------------------------------------------------------------------
// Token budgets per retrieval stage
// ---------------------------------------------------------------------------

/**
 * Maximum token budget (approximate) for memory injection at each stage.
 * Based on ~4 chars/token for the summary text.
 */
const TOKEN_BUDGET_BY_STAGE: Record<RetrievalStage, number> = {
  round_start: 2000,
  tool_checkpoint: 500,
  final_answer: 1000,
  memory_expand: 300,
};

// ---------------------------------------------------------------------------
// Statuses to include in retrieval
// ---------------------------------------------------------------------------

/** Only retrieve memories in these statuses (not candidates, suspects, or deprecated). */
const RETRIEVABLE_STATUSES: MemoryStatus[] = ['provisional', 'established', 'consolidated'];

// ---------------------------------------------------------------------------
// Retrieval options
// ---------------------------------------------------------------------------

/**
 * Options for a single retrieve() call.
 */
export interface RetrieveOptions {
  /** User's query text (used for BM25 and kNN). */
  query: string;
  /** Retrieval stage (determines type weights and token budget). */
  stage: RetrievalStage;
  /** Space ID for multi-tenancy isolation. */
  space: string;
  /** Username for per-user memory isolation. */
  userName: string;
  /** Maximum number of candidates from each search path. Defaults to 20. */
  candidateSize?: number;
  /** Maximum number of results after re-ranking. Defaults to 10. */
  maxResults?: number;
  /** Optional override for the token budget. Defaults to TOKEN_BUDGET_BY_STAGE[stage]. */
  tokenBudget?: number;
  /** Optional scoring config override. */
  config?: MemoryRetrievalConfig;
  /** Current timestamp in ms. Defaults to Date.now(). */
  now?: number;
}

// ---------------------------------------------------------------------------
// Retrieval service
// ---------------------------------------------------------------------------

/**
 * Deps for constructing a RetrievalService.
 */
export interface RetrievalServiceDeps {
  esClient: ElasticsearchClient;
  embeddingService: EmbeddingService;
  logger: Logger;
}

/**
 * Retrieves and ranks memory nodes using hybrid BM25 + kNN search.
 *
 * Responsibilities:
 * - BM25 full-text search over summary and full fields
 * - kNN vector search when embeddings are available
 * - Apply composite scoring formula to re-rank results
 * - Enforce per-stage token budget limits
 * - Format ranked memories into a text bundle for prompt injection
 */
export class RetrievalService {
  private readonly esClient: ElasticsearchClient;
  private readonly embeddingService: EmbeddingService;
  private readonly logger: Logger;

  constructor({ esClient, embeddingService, logger }: RetrievalServiceDeps) {
    this.esClient = esClient;
    this.embeddingService = embeddingService;
    this.logger = logger;
  }

  /**
   * Retrieve and rank memory nodes relevant to the given query and stage.
   *
   * Performs hybrid search (BM25 + optional kNN) and applies the composite
   * scoring formula to re-rank candidates. Results are trimmed to fit the
   * per-stage token budget.
   *
   * @returns Ranked ScoredMemoryNode[] from most to least relevant.
   */
  async retrieve(opts: RetrieveOptions): Promise<ScoredMemoryNode[]> {
    const {
      query,
      stage,
      space,
      userName,
      candidateSize = 20,
      maxResults = 10,
      tokenBudget = TOKEN_BUDGET_BY_STAGE[stage],
      config = DEFAULT_RETRIEVAL_CONFIG,
      now = Date.now(),
    } = opts;

    // Build base filters
    const filters: QueryDslQueryContainer[] = [
      createSpaceDslFilter(space),
      { term: { user_name: userName } },
      { terms: { status: RETRIEVABLE_STATUSES } },
    ];

    // 1. BM25 full-text search
    const bm25Nodes = await this.runBm25Search(query, filters, candidateSize);

    // 2. kNN vector search (if embedding model is available)
    let knnNodes: Array<{ node: MemoryNode; relevanceScore: number }> = [];
    if (this.embeddingService.isAvailable()) {
      knnNodes = await this.runKnnSearch(query, filters, candidateSize);
    }

    // 3. Merge candidates, deduplicate by id (prefer kNN for same id)
    const candidateMap = new Map<
      string,
      { node: MemoryNode; relevanceScore: number; graphProximityBonus: number }
    >();

    for (const { node, relevanceScore } of bm25Nodes) {
      candidateMap.set(node.id, { node, relevanceScore, graphProximityBonus: 0 });
    }

    // kNN results may have different scores; use max relevance when same node appears in both
    for (const { node, relevanceScore } of knnNodes) {
      const existing = candidateMap.get(node.id);
      if (existing) {
        // Take the higher relevance score from either search path
        if (relevanceScore > existing.relevanceScore) {
          candidateMap.set(node.id, { ...existing, relevanceScore });
        }
      } else {
        candidateMap.set(node.id, { node, relevanceScore, graphProximityBonus: 0 });
      }
    }

    const candidates = [...candidateMap.values()];

    if (candidates.length === 0) {
      this.logger.debug(`RetrievalService.retrieve: no candidates for stage=${stage}`);
      return [];
    }

    // 4. Re-rank using composite scoring
    const ranked = rankMemoryNodes(candidates, stage, { now, config });

    // 5. Apply token budget — trim results to fit budget
    return this.applyTokenBudget(ranked, maxResults, tokenBudget);
  }

  /**
   * Format a ranked list of scored memory nodes into a human-readable text bundle
   * suitable for injection into a system prompt.
   *
   * Format:
   * ```
   * ## Active Memories
   * [mem_001] (semantic) User prefers TypeScript over JavaScript. [confidence: 0.9]
   * [mem_002] (procedural) Always add tests for new API endpoints. [confidence: 0.8]
   * ```
   *
   * @param nodes - Ranked ScoredMemoryNode[] to format.
   * @param stage - Current retrieval stage (included in header for debugging).
   * @returns Formatted string for prompt injection.
   */
  toMemoryBundle(nodes: ScoredMemoryNode[], stage: RetrievalStage): string {
    if (nodes.length === 0) {
      return '';
    }

    const lines: string[] = ['## Active Memories'];

    for (const { node } of nodes) {
      const idStr = `[${node.id.slice(0, 7)}]`;
      const typeStr = `(${node.type})`;
      const confidenceStr = `[confidence: ${node.confidence.toFixed(1)}]`;
      lines.push(`${idStr} ${typeStr} ${node.summary} ${confidenceStr}`);
    }

    this.logger.debug(
      `RetrievalService.toMemoryBundle: formatted ${nodes.length} memories for stage=${stage}`
    );

    return lines.join('\n');
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Run BM25 full-text search over summary and full fields.
   */
  private async runBm25Search(
    query: string,
    filters: QueryDslQueryContainer[],
    size: number
  ): Promise<Array<{ node: MemoryNode; relevanceScore: number }>> {
    try {
      const response = await this.esClient.search<Record<string, unknown>>({
        index: memoryIndexName,
        track_total_hits: false,
        size,
        query: {
          bool: {
            should: [
              {
                multi_match: {
                  query,
                  fields: ['summary^2', 'full'],
                  type: 'best_fields',
                },
              },
            ],
            filter: filters,
          },
        },
      });

      const maxScore = response.hits.max_score ?? 1;

      return (
        response.hits.hits as Array<{
          _id: string;
          _source: Record<string, unknown>;
          _score?: number | null;
        }>
      ).map((hit) => ({
        node: this.hitToMemoryNode(hit),
        relevanceScore: maxScore > 0 ? (hit._score ?? 0) / maxScore : 0,
      }));
    } catch (err) {
      this.logger.warn(`RetrievalService.runBm25Search: failed — ${(err as Error).message}`);
      return [];
    }
  }

  /**
   * Run kNN vector search using the embedding field.
   * Returns empty array if the embedding field is not mapped in the index.
   */
  private async runKnnSearch(
    query: string,
    filters: QueryDslQueryContainer[],
    size: number
  ): Promise<Array<{ node: MemoryNode; relevanceScore: number }>> {
    const embedding = await this.embeddingService.embed(query);
    if (embedding.length === 0) {
      return [];
    }

    try {
      const knnParam: KnnSearch = {
        field: 'embedding',
        query_vector: embedding,
        k: size,
        num_candidates: Math.min(size * 5, 100),
        filter: filters,
      };

      const response = await this.esClient.search<Record<string, unknown>>({
        index: memoryIndexName,
        track_total_hits: false,
        size,
        knn: knnParam,
      });

      return (
        response.hits.hits as Array<{
          _id: string;
          _source: Record<string, unknown>;
          _score?: number | null;
        }>
      ).map((hit) => ({
        node: this.hitToMemoryNode(hit),
        // kNN scores are cosine similarities in [0, 1]
        relevanceScore: Math.min(1, Math.max(0, hit._score ?? 0)),
      }));
    } catch (err) {
      // kNN may fail if the embedding field is not mapped; treat as non-fatal
      this.logger.debug(
        `RetrievalService.runKnnSearch: failed (non-fatal) — ${(err as Error).message}`
      );
      return [];
    }
  }

  /**
   * Apply token budget: take at most maxResults nodes that fit within the budget.
   */
  private applyTokenBudget(
    ranked: ScoredMemoryNode[],
    maxResults: number,
    tokenBudget: number
  ): ScoredMemoryNode[] {
    const result: ScoredMemoryNode[] = [];
    let usedTokens = 0;

    for (const scored of ranked) {
      if (result.length >= maxResults) {
        break;
      }
      const tokens = ActiveMemorySet.estimateTokens(scored.node.summary);
      if (usedTokens + tokens > tokenBudget) {
        // Skip this node if it would exceed the budget (continue to check smaller nodes)
        continue;
      }
      result.push(scored);
      usedTokens += tokens;
    }

    this.logger.debug(
      `RetrievalService.applyTokenBudget: ${result.length}/${ranked.length} nodes selected, ${usedTokens} tokens used (budget=${tokenBudget})`
    );

    return result;
  }

  /**
   * Convert an Elasticsearch hit to a MemoryNode.
   */
  private hitToMemoryNode(hit: { _id: string; _source: Record<string, unknown> }): MemoryNode {
    const s = hit._source;
    return {
      id: hit._id,
      type: (s.type as MemoryNode['type']) ?? 'semantic',
      subtype: s.subtype as string | undefined,
      summary: (s.summary as string) ?? '',
      full: (s.full as string) ?? '',
      confidence: (s.confidence as number) ?? 0.5,
      salience: (s.salience as number) ?? 0.5,
      recency: (s.recency as string) ?? new Date().toISOString(),
      utility: (s.utility as number) ?? 0.5,
      stability: (s.stability as number) ?? 0.1,
      access_count: (s.access_count as number) ?? 0,
      reinforcement_score: (s.reinforcement_score as number) ?? 0,
      status: (s.status as MemoryNode['status']) ?? 'provisional',
      source_refs: (s.source_refs as MemoryNode['source_refs']) ?? [],
      links: (s.links as MemoryNode['links']) ?? [],
      created_at: (s.created_at as string) ?? new Date().toISOString(),
      updated_at: (s.updated_at as string) ?? new Date().toISOString(),
      space: (s.space as string) ?? '',
      user_id: s.user_id as string | undefined,
      user_name: (s.user_name as string) ?? '',
      last_used_at: s.last_used_at as string | undefined,
      last_reinforced_at: s.last_reinforced_at as string | undefined,
      conflict_refs: s.conflict_refs as string[] | undefined,
      retrieval_stats_by_stage: s.retrieval_stats_by_stage as
        | MemoryNode['retrieval_stats_by_stage']
        | undefined,
    };
  }
}

/**
 * Score a single memory node outside of a full retrieval call.
 * Useful for re-scoring graph neighbors fetched separately.
 *
 * @param node - The memory node to score.
 * @param relevanceScore - Raw relevance score (from BM25 or kNN).
 * @param stage - Retrieval stage.
 * @param opts - Optional scoring overrides.
 */
export const scoreNode = (
  node: MemoryNode,
  relevanceScore: number,
  stage: RetrievalStage,
  opts: {
    now?: number;
    selectedSummaries?: string[];
    graphProximityBonus?: number;
    config?: MemoryRetrievalConfig;
  } = {}
): ScoredMemoryNode =>
  scoreMemoryNode({
    node,
    relevanceScore,
    stage,
    ...opts,
  });

/**
 * Token budget lookup by stage.
 */
export const getTokenBudgetForStage = (stage: RetrievalStage): number =>
  TOKEN_BUDGET_BY_STAGE[stage];

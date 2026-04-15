/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { MemoryNode } from '@kbn/agent-builder-common';
import { memoryIndexName } from '../client';
import type { EmbeddingService } from '../embeddings';

// ---------------------------------------------------------------------------
// Similarity thresholds
// ---------------------------------------------------------------------------

/**
 * Cosine similarity above which a candidate is considered a near-duplicate.
 * Near-duplicates are skipped entirely (not persisted).
 */
export const NEAR_DUPLICATE_THRESHOLD = 0.92;

/**
 * Cosine similarity range [RELATED_THRESHOLD, NEAR_DUPLICATE_THRESHOLD) indicates
 * a related but distinct memory. The candidate is created with a 'derived_from' link.
 */
export const RELATED_THRESHOLD = 0.8;

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

/** The disposition determined by the dedup checker for a candidate */
export type DedupDisposition =
  | 'skip' // near-duplicate of established memory — do not persist
  | 'derived' // related to an existing memory — persist with derived_from link
  | 'fresh'; // no close match — persist as new candidate

/** Result of checking a single candidate */
export interface DedupCheckResult {
  disposition: DedupDisposition;
  /** The most similar existing memory found (if any) */
  closestMatch?: MemoryNode;
  /** The similarity score to the closest match */
  similarityScore?: number;
}

// ---------------------------------------------------------------------------
// Deps
// ---------------------------------------------------------------------------

export interface DedupCheckerDeps {
  esClient: ElasticsearchClient;
  embeddingService: EmbeddingService;
  space: string;
  userName: string;
  logger: Logger;
}

// ---------------------------------------------------------------------------
// DedupChecker
// ---------------------------------------------------------------------------

/**
 * Checks a candidate memory summary against existing memories to determine
 * whether to skip, link, or create fresh.
 *
 * When an embedding service is available, performs kNN vector search.
 * When no embedding service is configured (BM25-only mode), always returns 'fresh'
 * since we cannot compute meaningful cosine similarity without vectors.
 */
export class DedupChecker {
  private readonly esClient: ElasticsearchClient;
  private readonly embeddingService: EmbeddingService;
  private readonly space: string;
  private readonly userName: string;
  private readonly logger: Logger;

  constructor({ esClient, embeddingService, space, userName, logger }: DedupCheckerDeps) {
    this.esClient = esClient;
    this.embeddingService = embeddingService;
    this.space = space;
    this.userName = userName;
    this.logger = logger;
  }

  /**
   * Check a candidate summary against existing memories.
   *
   * @param summary - Summary text of the candidate memory to check
   * @returns DedupCheckResult indicating how to handle this candidate
   */
  async check(summary: string): Promise<DedupCheckResult> {
    if (!this.embeddingService.isAvailable()) {
      // No embedding model — skip dedup, treat everything as fresh
      return { disposition: 'fresh' };
    }

    const embedding = await this.embeddingService.embed(summary);
    if (embedding.length === 0) {
      return { disposition: 'fresh' };
    }

    const closest = await this.findClosestMatch(embedding);
    if (!closest) {
      return { disposition: 'fresh' };
    }

    const { node, similarity } = closest;

    if (similarity >= NEAR_DUPLICATE_THRESHOLD) {
      this.logger.debug(
        `DedupChecker: near-duplicate (similarity=${similarity.toFixed(3)}) of memory ${node.id}: "${summary.slice(0, 60)}"`
      );
      return { disposition: 'skip', closestMatch: node, similarityScore: similarity };
    }

    if (similarity >= RELATED_THRESHOLD) {
      this.logger.debug(
        `DedupChecker: related memory (similarity=${similarity.toFixed(3)}) to ${node.id}: "${summary.slice(0, 60)}"`
      );
      return { disposition: 'derived', closestMatch: node, similarityScore: similarity };
    }

    return { disposition: 'fresh' };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Find the single closest memory via kNN search.
   * Returns null if no match is found or kNN fails.
   */
  private async findClosestMatch(
    embedding: number[]
  ): Promise<{ node: MemoryNode; similarity: number } | null> {
    try {
      const response = await this.esClient.search<Record<string, unknown>>({
        index: memoryIndexName,
        size: 1,
        knn: {
          field: 'embedding',
          query_vector: embedding,
          k: 1,
          num_candidates: 10,
          filter: [
            { term: { space: this.space } },
            { term: { user_name: this.userName } },
            // Only check against established-or-better memories for dedup
            { terms: { status: ['provisional', 'established', 'consolidated'] } },
          ],
        },
        _source: true,
      });

      const hits = response.hits.hits as Array<{
        _id: string;
        _source: Record<string, unknown>;
        _score?: number | null;
      }>;

      if (hits.length === 0) {
        return null;
      }

      const hit = hits[0];
      const score = hit._score ?? 0;

      // kNN cosine similarity scores from ES are already in [0, 1] for cosine
      const similarity = Math.min(1, Math.max(0, score));

      const node = this.hitToMemoryNode(hit);
      return { node, similarity };
    } catch (err) {
      // kNN may fail if embedding field is not mapped — non-fatal
      this.logger.debug(
        `DedupChecker: kNN search failed (non-fatal) — ${(err as Error).message}`
      );
      return null;
    }
  }

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
      status: (s.status as MemoryNode['status']) ?? 'candidate',
      source_refs: (s.source_refs as MemoryNode['source_refs']) ?? [],
      links: (s.links as MemoryNode['links']) ?? [],
      created_at: (s.created_at as string) ?? new Date().toISOString(),
      updated_at: (s.updated_at as string) ?? new Date().toISOString(),
      space: (s.space as string) ?? this.space,
      user_id: s.user_id as string | undefined,
      user_name: (s.user_name as string) ?? this.userName,
      last_used_at: s.last_used_at as string | undefined,
      last_reinforced_at: s.last_reinforced_at as string | undefined,
    };
  }
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { MemoryNode, MemoryStatus } from '@kbn/agent-builder-common';
import type { MemoryClient } from '../client';

/**
 * A conflict candidate identified by the contradiction detector.
 * The consolidation task or fast-extraction pipeline can decide how to handle it.
 */
export interface ConflictCandidate {
  /** The candidate (newer / unconfirmed) memory node */
  candidate: MemoryNode;

  /** The established memory node that contradicts the candidate */
  established: MemoryNode;

  /**
   * Why this pair was flagged.
   * - `explicit_edge` — the two nodes are connected by a `contradicts` edge
   * - `high_similarity` — embedding cosine similarity > threshold with no explicit edge
   * - `both` — both conditions are satisfied
   */
  reason: 'explicit_edge' | 'high_similarity' | 'both';

  /**
   * Embedding cosine similarity between candidate and established (0.0 – 1.0).
   * Undefined when embeddings are not available.
   */
  similarity?: number;
}

/**
 * Configuration for contradiction detection thresholds.
 */
export interface ContradictionDetectorConfig {
  /**
   * Cosine similarity threshold above which two nodes are considered potentially contradictory.
   * Defaults to 0.85.
   */
  similarityThreshold?: number;

  /**
   * Statuses of "established" memories to check against.
   * Defaults to ['established', 'consolidated'].
   */
  establishedStatuses?: MemoryStatus[];

  /**
   * Maximum number of established memories to scan per candidate.
   * Prevents unbounded queries. Defaults to 200.
   */
  scanLimit?: number;
}

/**
 * ContradictionDetector checks candidate memory nodes against the existing knowledge graph
 * to find contradictions. It is used by both:
 *   - Fast extraction (post-round): quick sanity check before writing new memories
 *   - Slow consolidation (nightly task): thorough conflict resolution pass
 *
 * Two contradiction signals are used:
 * 1. Explicit `contradicts` graph edge between the candidate and an established node.
 * 2. High embedding cosine similarity (> threshold) — indicates semantic overlap that may
 *    represent a contradiction rather than a reinforcement.
 *
 * Note: embeddings are optional. If a node has no embedding, only explicit edge detection
 * is applied for that pair.
 */
export class ContradictionDetector {
  private readonly client: MemoryClient;
  private readonly logger: Logger;
  private readonly similarityThreshold: number;
  private readonly establishedStatuses: MemoryStatus[];
  private readonly scanLimit: number;

  constructor({
    client,
    logger,
    config = {},
  }: {
    client: MemoryClient;
    logger: Logger;
    config?: ContradictionDetectorConfig;
  }) {
    this.client = client;
    this.logger = logger;
    this.similarityThreshold = config.similarityThreshold ?? 0.85;
    this.establishedStatuses = config.establishedStatuses ?? ['established', 'consolidated'];
    this.scanLimit = config.scanLimit ?? 200;
  }

  /**
   * Check a set of candidate memory nodes against established memories.
   *
   * For each candidate:
   * 1. Fetch established memories (up to `scanLimit`).
   * 2. Check for explicit `contradicts` edges (in either direction).
   * 3. If the candidate has an embedding, compute cosine similarity against each established node
   *    that also has an embedding; flag pairs above the threshold.
   *
   * Returns all conflict candidates found, deduplicated by (candidate.id, established.id) pair.
   */
  async detect(candidates: MemoryNode[]): Promise<ConflictCandidate[]> {
    if (candidates.length === 0) {
      return [];
    }

    // Fetch established memories once (shared across all candidates)
    let established: MemoryNode[];
    try {
      established = await this.client.list({
        status: this.establishedStatuses as MemoryStatus[],
        size: this.scanLimit,
      });
    } catch (err) {
      this.logger.warn(
        `ContradictionDetector: failed to fetch established memories — ${(err as Error).message}`
      );
      return [];
    }

    const conflicts: ConflictCandidate[] = [];
    const seen = new Set<string>(); // "candidateId:establishedId"

    for (const candidate of candidates) {
      for (const est of established) {
        // Skip self-comparison (can happen if the candidate was already written)
        if (candidate.id === est.id) {
          continue;
        }

        const pairKey = `${candidate.id}:${est.id}`;
        if (seen.has(pairKey)) {
          continue;
        }
        seen.add(pairKey);

        const hasExplicitEdge = this.hasContradictEdge(candidate, est);
        const similarity = this.computeCosineSimilarity(candidate, est);
        const highSimilarity =
          similarity !== undefined && similarity > this.similarityThreshold;

        if (hasExplicitEdge && highSimilarity) {
          conflicts.push({ candidate, established: est, reason: 'both', similarity });
        } else if (hasExplicitEdge) {
          conflicts.push({ candidate, established: est, reason: 'explicit_edge', similarity });
        } else if (highSimilarity) {
          conflicts.push({
            candidate,
            established: est,
            reason: 'high_similarity',
            similarity,
          });
        }
      }
    }

    return conflicts;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Check whether there is an explicit `contradicts` edge between two nodes
   * in either direction (candidate→established or established→candidate).
   */
  private hasContradictEdge(candidate: MemoryNode, established: MemoryNode): boolean {
    const candidateContradicts = candidate.links.some(
      (l) => l.target_id === established.id && l.type === 'contradicts'
    );
    const establishedContradicts = established.links.some(
      (l) => l.target_id === candidate.id && l.type === 'contradicts'
    );
    return candidateContradicts || establishedContradicts;
  }

  /**
   * Compute cosine similarity between the embeddings of two nodes.
   *
   * Returns undefined if either node lacks an embedding.
   * Embeddings are stored on the raw source document; MemoryNode does not expose them
   * in its typed interface (they are stored in ES only). This method therefore always
   * returns undefined at the typed layer — the actual embedding comparison happens in
   * the retrieval service which has access to the raw ES kNN scoring.
   *
   * This stub is intentionally left extensible: when the retrieval layer provides
   * pre-computed similarity scores or embedded vectors are surfaced to the node type,
   * this method can be upgraded without changing the public API.
   */
  private computeCosineSimilarity(_a: MemoryNode, _b: MemoryNode): number | undefined {
    // Embeddings are not currently exposed on MemoryNode (they live in ES source only).
    // Contradiction detection at this layer relies primarily on explicit `contradicts` edges.
    // High-similarity detection via embeddings is delegated to the retrieval service (Epic 4).
    return undefined;
  }
}

/**
 * Factory function for dependency injection.
 */
export const createContradictionDetector = ({
  client,
  logger,
  config,
}: {
  client: MemoryClient;
  logger: Logger;
  config?: ContradictionDetectorConfig;
}): ContradictionDetector => new ContradictionDetector({ client, logger, config });

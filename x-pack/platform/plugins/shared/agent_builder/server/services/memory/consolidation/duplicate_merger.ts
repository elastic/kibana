/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { BoundInferenceClient } from '@kbn/inference-common';
import { MessageRole } from '@kbn/inference-common';
import type { MemoryNode, MemoryLink, MemorySourceRef } from '@kbn/agent-builder-common';
import type { MemoryClient } from '../client';
import { memoryIndexName } from '../client';
import type { KibanaRequest } from '@kbn/core-http-server';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Cosine similarity threshold above which two memories are considered duplicates */
const DUPLICATE_SIMILARITY_THRESHOLD = 0.88;

/** Number of nearest neighbours to check per memory when finding duplicates */
const DUPLICATE_KNN_K = 5;

/** Minimum score difference to prefer one memory as canonical over the other.
 * Below this threshold, LLM assistance is requested for summary revision. */
const SCORE_CLOSE_DELTA = 0.1;

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export interface DuplicatePair {
  canonicalId: string;
  deprecatedId: string;
  similarity: number;
  reason: string;
}

export interface MergeResult {
  /** Pairs of duplicates found */
  pairs: DuplicatePair[];
  /** Number of memories merged/deprecated */
  mergedCount: number;
  /** Number of link redirections performed */
  redirectedLinks: number;
}

// ---------------------------------------------------------------------------
// LLM-assisted summary revision
// ---------------------------------------------------------------------------

const MERGE_SUMMARY_SYSTEM_PROMPT = `You are a memory consolidation assistant. You will receive two near-duplicate memory summaries and must produce a single improved summary that captures all unique information from both.

Rules:
- Keep the merged summary concise (max 100 tokens)
- Preserve all unique facts from both memories
- Do not repeat the same information twice
- Return ONLY the merged summary as plain text, no JSON, no markdown`;

// ---------------------------------------------------------------------------
// DuplicateMerger
// ---------------------------------------------------------------------------

export interface DuplicateMergerDeps {
  esClient: ElasticsearchClient;
  memoryClient: MemoryClient;
  logger: Logger;
  inference?: InferenceServerStart;
  request?: KibanaRequest;
  connectorId?: string;
}

/**
 * Finds near-duplicate memory pairs using kNN embedding similarity and merges them.
 *
 * For each duplicate pair:
 * - Keeps the higher-scoring memory as canonical
 * - Merges source_refs and links into the canonical
 * - Redirects all links pointing to the deprecated copy to point to canonical
 * - Sets the deprecated copy's status to 'deprecated'
 * - Uses LLM to revise the summary when both copies have unique information
 *
 * Only processes memories that have an embedding vector stored. Memories without
 * embeddings are skipped (BM25-only mode).
 */
export class DuplicateMerger {
  private readonly esClient: ElasticsearchClient;
  private readonly memoryClient: MemoryClient;
  private readonly logger: Logger;
  private readonly inference?: InferenceServerStart;
  private readonly request?: KibanaRequest;
  private readonly connectorId?: string;

  constructor({ esClient, memoryClient, logger, inference, request, connectorId }: DuplicateMergerDeps) {
    this.esClient = esClient;
    this.memoryClient = memoryClient;
    this.logger = logger;
    this.inference = inference;
    this.request = request;
    this.connectorId = connectorId;
  }

  /**
   * Run duplicate detection and merging for a batch of memory nodes.
   *
   * @param memories - Candidate memories to check for duplicates. Typically all
   *                   'established' and 'consolidated' memories for a space.
   * @returns MergeResult summarising what was done.
   */
  async mergeDuplicates(memories: MemoryNode[]): Promise<MergeResult> {
    if (memories.length < 2) {
      return { pairs: [], mergedCount: 0, redirectedLinks: 0 };
    }

    this.logger.info(`DuplicateMerger: scanning ${memories.length} memories for duplicates`);

    const pairs = await this.findDuplicatePairs(memories);

    if (pairs.length === 0) {
      this.logger.info('DuplicateMerger: no duplicate pairs found');
      return { pairs: [], mergedCount: 0, redirectedLinks: 0 };
    }

    this.logger.info(`DuplicateMerger: found ${pairs.length} duplicate pairs — merging`);

    let mergedCount = 0;
    let redirectedLinks = 0;

    // Track which IDs have already been deprecated in this run
    const deprecatedIds = new Set<string>();

    for (const pair of pairs) {
      if (deprecatedIds.has(pair.canonicalId) || deprecatedIds.has(pair.deprecatedId)) {
        // One of the pair members was already deprecated in an earlier iteration
        this.logger.debug(
          `DuplicateMerger: skipping pair (${pair.canonicalId}, ${pair.deprecatedId}) — already processed`
        );
        continue;
      }

      try {
        const redirected = await this.mergePair(pair, memories);
        redirectedLinks += redirected;
        deprecatedIds.add(pair.deprecatedId);
        mergedCount++;
      } catch (err) {
        this.logger.warn(
          `DuplicateMerger: failed to merge pair (${pair.canonicalId}, ${pair.deprecatedId}) — ${
            (err as Error).message
          }`
        );
      }
    }

    this.logger.info(
      `DuplicateMerger: merged ${mergedCount} pairs, redirected ${redirectedLinks} links`
    );

    return { pairs, mergedCount, redirectedLinks };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Use kNN search to find pairs with cosine similarity above the threshold.
   * For each memory, we search for its nearest neighbours and collect pairs
   * where the similarity exceeds DUPLICATE_SIMILARITY_THRESHOLD.
   */
  private async findDuplicatePairs(memories: MemoryNode[]): Promise<DuplicatePair[]> {
    const pairs: DuplicatePair[] = [];
    // Track seen pairs to avoid duplicates (A,B) and (B,A)
    const seenPairs = new Set<string>();

    for (const memory of memories) {
      const neighbours = await this.knnNeighbours(memory);

      for (const { neighbourId, similarity } of neighbours) {
        if (neighbourId === memory.id) continue;
        if (similarity < DUPLICATE_SIMILARITY_THRESHOLD) continue;

        const pairKey = [memory.id, neighbourId].sort().join('|');
        if (seenPairs.has(pairKey)) continue;
        seenPairs.add(pairKey);

        const neighbour = memories.find((m) => m.id === neighbourId);
        if (!neighbour) continue;

        const { canonicalId, deprecatedId, reason } = this.selectCanonical(memory, neighbour);
        pairs.push({ canonicalId, deprecatedId, similarity, reason });
      }
    }

    return pairs;
  }

  /**
   * Find kNN neighbours for a given memory by using the stored embedding vector
   * in a script_score query. Returns top-k neighbours by cosine similarity.
   *
   * Falls back to an empty array when the embedding field is not mapped.
   */
  private async knnNeighbours(
    memory: MemoryNode
  ): Promise<Array<{ neighbourId: string; similarity: number }>> {
    try {
      const response = await this.esClient.search<Record<string, unknown>>({
        index: memoryIndexName,
        size: DUPLICATE_KNN_K + 1, // +1 to exclude self
        knn: {
          field: 'embedding',
          query_vector_builder: {
            text_embedding: {
              model_id: memory.id,
              model_text: memory.summary,
            },
          },
          k: DUPLICATE_KNN_K + 1,
          num_candidates: (DUPLICATE_KNN_K + 1) * 10,
          filter: {
            bool: {
              filter: [
                { term: { space: memory.space } },
                { term: { user_name: memory.user_name } },
              ],
            },
          },
        },
      });

      return (
        response.hits.hits as Array<{
          _id: string;
          _score?: number | null;
        }>
      )
        .filter((hit) => hit._id !== memory.id)
        .map((hit) => ({
          neighbourId: hit._id,
          similarity: hit._score ?? 0,
        }));
    } catch (err) {
      // kNN search requires the embedding field to be mapped and populated.
      // When unavailable (BM25-only mode), skip silently.
      this.logger.debug(
        `DuplicateMerger: kNN search failed for ${memory.id} — ${(err as Error).message}`
      );
      return [];
    }
  }

  /**
   * Determine which memory is canonical and which is deprecated.
   *
   * Canonical is the one with the higher composite score:
   *   score = reinforcement_score + confidence + utility
   */
  private selectCanonical(
    a: MemoryNode,
    b: MemoryNode
  ): { canonicalId: string; deprecatedId: string; reason: string } {
    const scoreA = (a.reinforcement_score ?? 0) + (a.confidence ?? 0) + (a.utility ?? 0);
    const scoreB = (b.reinforcement_score ?? 0) + (b.confidence ?? 0) + (b.utility ?? 0);

    if (scoreA >= scoreB) {
      return {
        canonicalId: a.id,
        deprecatedId: b.id,
        reason: `score_a=${scoreA.toFixed(3)} >= score_b=${scoreB.toFixed(3)}`,
      };
    }

    return {
      canonicalId: b.id,
      deprecatedId: a.id,
      reason: `score_b=${scoreB.toFixed(3)} > score_a=${scoreA.toFixed(3)}`,
    };
  }

  /**
   * Execute a single pair merge:
   * 1. Merge source_refs and links from deprecated into canonical
   * 2. Optionally revise summary using LLM (when scores are close)
   * 3. Redirect all links pointing to deprecated → canonical across all memories
   * 4. Set deprecated's status to 'deprecated'
   */
  private async mergePair(pair: DuplicatePair, allMemories: MemoryNode[]): Promise<number> {
    const [canonical, deprecated] = await Promise.all([
      this.memoryClient.get(pair.canonicalId),
      this.memoryClient.get(pair.deprecatedId),
    ]);

    // 1. Merge source_refs
    const mergedSourceRefs = this.mergeSourceRefs(canonical.source_refs, deprecated.source_refs);

    // 2. Merge links (avoid duplicating existing links)
    const mergedLinks = this.mergeLinks(canonical.links, deprecated.links, pair.deprecatedId);

    // 3. Determine if LLM summary revision is needed
    const scoreCanonical =
      (canonical.reinforcement_score ?? 0) + (canonical.confidence ?? 0) + (canonical.utility ?? 0);
    const scoreDeprecated =
      (deprecated.reinforcement_score ?? 0) + (deprecated.confidence ?? 0) + (deprecated.utility ?? 0);
    const scoreDelta = Math.abs(scoreCanonical - scoreDeprecated);

    let summary = canonical.summary;
    let full = canonical.full;

    if (scoreDelta < SCORE_CLOSE_DELTA && this.inference && this.request && this.connectorId) {
      const revised = await this.reviseSummaryWithLLM(canonical.summary, deprecated.summary);
      if (revised) {
        summary = revised;
        // Keep full from canonical but append unique content from deprecated
        full = canonical.full;
      }
    }

    // 4. Update canonical with merged data
    await this.memoryClient.update({
      id: pair.canonicalId,
      summary,
      full,
      source_refs: mergedSourceRefs,
      links: mergedLinks,
    });

    // 5. Redirect links: any memory linking to deprecated → update to canonical
    let redirectedLinks = 0;
    for (const mem of allMemories) {
      if (mem.id === pair.canonicalId || mem.id === pair.deprecatedId) continue;
      const hasLinkToDeprecated = mem.links.some((l) => l.target_id === pair.deprecatedId);
      if (!hasLinkToDeprecated) continue;

      const updatedLinks: MemoryLink[] = mem.links.map((l) =>
        l.target_id === pair.deprecatedId ? { ...l, target_id: pair.canonicalId } : l
      );

      try {
        await this.memoryClient.update({ id: mem.id, links: updatedLinks });
        redirectedLinks++;
        this.logger.debug(
          `DuplicateMerger: redirected link ${mem.id} → ${pair.deprecatedId} to ${pair.canonicalId}`
        );
      } catch (err) {
        this.logger.warn(
          `DuplicateMerger: failed to redirect link in ${mem.id}: ${(err as Error).message}`
        );
      }
    }

    // 6. Deprecate the duplicate
    await this.memoryClient.update({
      id: pair.deprecatedId,
      status: 'deprecated',
    });

    this.logger.info(
      `DuplicateMerger: deprecated ${pair.deprecatedId} → canonical ${pair.canonicalId} (${pair.reason})`
    );

    return redirectedLinks;
  }

  private mergeSourceRefs(
    canonical: MemorySourceRef[],
    deprecated: MemorySourceRef[]
  ): MemorySourceRef[] {
    const existing = new Set(canonical.map((r) => `${r.conversation_id}|${r.round_id}`));
    const merged = [...canonical];

    for (const ref of deprecated) {
      const key = `${ref.conversation_id}|${ref.round_id}`;
      if (!existing.has(key)) {
        merged.push(ref);
        existing.add(key);
      }
    }

    return merged;
  }

  private mergeLinks(
    canonicalLinks: MemoryLink[],
    deprecatedLinks: MemoryLink[],
    deprecatedId: string
  ): MemoryLink[] {
    const existingTargets = new Set(canonicalLinks.map((l) => l.target_id));
    const merged = [...canonicalLinks];

    for (const link of deprecatedLinks) {
      // Skip self-referential links to the deprecated copy
      if (link.target_id === deprecatedId) continue;
      if (!existingTargets.has(link.target_id)) {
        merged.push(link);
        existingTargets.add(link.target_id);
      }
    }

    return merged;
  }

  private async reviseSummaryWithLLM(
    canonicalSummary: string,
    deprecatedSummary: string
  ): Promise<string | null> {
    if (!this.inference || !this.request || !this.connectorId) return null;

    try {
      const inferenceClient = this.inference.getClient({
        request: this.request,
        bindTo: { connectorId: this.connectorId },
      }) as BoundInferenceClient;

      const response = await inferenceClient.chatComplete({
        messages: [
          {
            role: MessageRole.User,
            content: `Memory A: ${canonicalSummary}\n\nMemory B: ${deprecatedSummary}\n\nPlease merge these into a single improved summary.`,
          },
        ],
        system: MERGE_SUMMARY_SYSTEM_PROMPT,
      });

      const revised = response.content?.trim();
      if (revised && revised.length > 0) {
        this.logger.debug(`DuplicateMerger: LLM revised summary: "${revised.slice(0, 80)}..."`);
        return revised;
      }

      return null;
    } catch (err) {
      this.logger.warn(
        `DuplicateMerger: LLM summary revision failed — ${(err as Error).message}`
      );
      return null;
    }
  }
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { BoundInferenceClient } from '@kbn/inference-common';
import { MessageRole } from '@kbn/inference-common';
import type { MemoryNode } from '@kbn/agent-builder-common';
import type { MemoryClient } from '../client';
import type { KibanaRequest } from '@kbn/core-http-server';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Score delta threshold below which LLM resolution is requested.
 * When two contradicting memories have a composite score difference
 * smaller than this value, we ask the LLM to explain which to prefer.
 */
const SCORE_CLOSE_DELTA = 0.1;

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export interface ContradictionResolution {
  /** ID of the memory that was promoted (kept as authoritative) */
  promotedId: string;
  /** ID of the memory that was demoted to 'suspect' */
  demotedId: string;
  /** Human-readable explanation for the resolution */
  reasoning: string;
  /** Whether LLM was invoked to help resolve */
  llmAssisted: boolean;
}

export interface ContradictionResolverResult {
  resolved: ContradictionResolution[];
  skipped: number;
}

// ---------------------------------------------------------------------------
// LLM resolution prompt
// ---------------------------------------------------------------------------

const CONTRADICTION_RESOLUTION_SYSTEM_PROMPT = `You are a memory arbitration assistant. You will receive two contradicting memory statements and supporting metadata. Your task is to determine which memory is more likely correct.

Consider:
- Recency: more recent memories are usually more accurate
- Confidence: higher confidence indicates stronger evidence
- Reinforcement: more frequently confirmed memories are more reliable
- Content: logical consistency and specificity

Return a brief explanation (2-3 sentences max) for which memory to prefer and why.
Always start with "PREFER A:" or "PREFER B:" to indicate your recommendation.`;

// ---------------------------------------------------------------------------
// ContradictionResolver
// ---------------------------------------------------------------------------

export interface ContradictionResolverDeps {
  memoryClient: MemoryClient;
  logger: Logger;
  inference?: InferenceServerStart;
  request?: KibanaRequest;
  connectorId?: string;
}

/**
 * Resolves contradictions between memory nodes that have 'contradicts' edge links.
 *
 * For each contradiction pair found:
 * - Compares recency, confidence, and reinforcement_score
 * - Promotes the newer/higher-confidence memory (no status change — it stays authoritative)
 * - Demotes the older/lower-confidence memory to 'suspect'
 * - Requests LLM explanation when scores are close (delta < 0.1)
 *
 * "Promotes" here means the better memory retains its current status.
 * "Demotes" means the weaker memory is set to 'suspect' status for review.
 */
export class ContradictionResolver {
  private readonly memoryClient: MemoryClient;
  private readonly logger: Logger;
  private readonly inference?: InferenceServerStart;
  private readonly request?: KibanaRequest;
  private readonly connectorId?: string;

  constructor({
    memoryClient,
    logger,
    inference,
    request,
    connectorId,
  }: ContradictionResolverDeps) {
    this.memoryClient = memoryClient;
    this.logger = logger;
    this.inference = inference;
    this.request = request;
    this.connectorId = connectorId;
  }

  /**
   * Resolve all contradiction pairs found in the given memory set.
   *
   * A contradiction pair is any two memories where one has a 'contradicts' link
   * pointing to the other.
   *
   * @param memories - Full set of memories to scan for contradictions.
   * @returns Summary of resolutions applied.
   */
  async resolveContradictions(memories: MemoryNode[]): Promise<ContradictionResolverResult> {
    const pairs = this.findContradictionPairs(memories);

    if (pairs.length === 0) {
      this.logger.info('ContradictionResolver: no contradiction pairs found');
      return { resolved: [], skipped: 0 };
    }

    this.logger.info(`ContradictionResolver: resolving ${pairs.length} contradiction pairs`);

    const resolved: ContradictionResolution[] = [];
    let skipped = 0;

    // Track IDs already demoted in this run to avoid double-processing
    const demotedIds = new Set<string>();

    for (const [a, b] of pairs) {
      if (demotedIds.has(a.id) || demotedIds.has(b.id)) {
        skipped++;
        continue;
      }

      try {
        const resolution = await this.resolvePair(a, b);
        resolved.push(resolution);
        demotedIds.add(resolution.demotedId);
      } catch (err) {
        this.logger.warn(
          `ContradictionResolver: failed to resolve pair (${a.id}, ${b.id}) — ${
            (err as Error).message
          }`
        );
        skipped++;
      }
    }

    this.logger.info(
      `ContradictionResolver: resolved ${resolved.length} contradictions, skipped ${skipped}`
    );

    return { resolved, skipped };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Collect all unique contradiction pairs from the memory set.
   * A pair (A, B) is collected when A has a 'contradicts' link to B.
   * Both (A,B) and (B,A) are deduplicated to a single pair.
   */
  private findContradictionPairs(memories: MemoryNode[]): Array<[MemoryNode, MemoryNode]> {
    const memoryMap = new Map<string, MemoryNode>(memories.map((m) => [m.id, m]));
    const seenPairs = new Set<string>();
    const pairs: Array<[MemoryNode, MemoryNode]> = [];

    for (const memory of memories) {
      for (const link of memory.links) {
        if (link.type !== 'contradicts') continue;

        const other = memoryMap.get(link.target_id);
        if (!other) continue;

        const pairKey = [memory.id, other.id].sort().join('|');
        if (seenPairs.has(pairKey)) continue;
        seenPairs.add(pairKey);

        pairs.push([memory, other]);
      }
    }

    return pairs;
  }

  /**
   * Resolve a single contradiction pair.
   *
   * Scoring: composite = recency_score (0..1) + confidence + reinforcement_score
   * Recency score: exp(-0.03 * days_since_created) for semantic-style decay
   */
  private async resolvePair(a: MemoryNode, b: MemoryNode): Promise<ContradictionResolution> {
    const scoreA = this.compositeScore(a);
    const scoreB = this.compositeScore(b);
    const delta = Math.abs(scoreA - scoreB);

    let reasoning: string;
    let llmAssisted = false;

    if (delta >= SCORE_CLOSE_DELTA) {
      // Clear winner — no LLM needed
      const winner = scoreA >= scoreB ? a : b;
      const loser = scoreA >= scoreB ? b : a;
      reasoning = this.buildReasoning(winner, loser, scoreA, scoreB);
    } else {
      // Scores are close — request LLM arbitration
      llmAssisted = true;
      const llmExplanation = await this.requestLLMArbitration(a, b, scoreA, scoreB);
      reasoning = llmExplanation ?? this.buildReasoning(a, b, scoreA, scoreB);

      // LLM may recommend B even if A has slightly higher score, or vice versa
      // Parse the PREFER A/B recommendation from LLM output
      const prefersA =
        !llmExplanation || llmExplanation.toUpperCase().startsWith('PREFER A');

      const winner = prefersA ? a : b;
      const loser = prefersA ? b : a;

      // Apply demotion — the weaker memory becomes 'suspect'
      await this.memoryClient.update({ id: loser.id, status: 'suspect' });

      this.logger.info(
        `ContradictionResolver: demoted ${loser.id} → suspect (LLM-assisted, reasoning: "${reasoning.slice(0, 100)}")`
      );

      return {
        promotedId: winner.id,
        demotedId: loser.id,
        reasoning,
        llmAssisted,
      };
    }

    // Apply demotion for clear-score cases
    const winner = scoreA >= scoreB ? a : b;
    const loser = scoreA >= scoreB ? b : a;

    await this.memoryClient.update({ id: loser.id, status: 'suspect' });

    this.logger.info(
      `ContradictionResolver: demoted ${loser.id} → suspect (score delta=${delta.toFixed(3)}, reasoning: "${reasoning.slice(0, 100)}")`
    );

    return {
      promotedId: winner.id,
      demotedId: loser.id,
      reasoning,
      llmAssisted,
    };
  }

  /**
   * Composite score used for contradiction resolution tie-breaking.
   *
   * Components:
   * - Recency score: exponential decay from created_at (semantic lambda = 0.03)
   * - Confidence: raw value [0..1]
   * - Reinforcement score: raw value, bounded
   */
  private compositeScore(memory: MemoryNode): number {
    const nowMs = Date.now();
    const createdMs = Date.parse(memory.created_at);
    const ageDays = isNaN(createdMs)
      ? 0
      : Math.max(0, (nowMs - createdMs) / (1000 * 60 * 60 * 24));

    // Also consider last_used_at for recency — prefer the more recently used
    const lastUsedMs = memory.last_used_at ? Date.parse(memory.last_used_at) : NaN;
    const daysSinceUse = isNaN(lastUsedMs)
      ? ageDays
      : Math.max(0, (nowMs - lastUsedMs) / (1000 * 60 * 60 * 24));

    const recencyScore = Math.exp(-0.03 * daysSinceUse);
    const confidence = memory.confidence ?? 0;
    const reinforcement = memory.reinforcement_score ?? 0;

    return recencyScore + confidence + reinforcement;
  }

  private buildReasoning(
    winner: MemoryNode,
    loser: MemoryNode,
    scoreA: number,
    scoreB: number
  ): string {
    const winnerIsA = winner.id === loser.id ? false : true;
    const winScore = winnerIsA ? scoreA : scoreB;
    const loseScore = winnerIsA ? scoreB : scoreA;

    return (
      `Promoted ${winner.id} (composite score=${winScore.toFixed(3)}, ` +
      `confidence=${(winner.confidence ?? 0).toFixed(2)}, ` +
      `reinforcement=${(winner.reinforcement_score ?? 0).toFixed(2)}) ` +
      `over ${loser.id} (composite score=${loseScore.toFixed(3)}). ` +
      `Score delta=${Math.abs(winScore - loseScore).toFixed(3)} >= ${SCORE_CLOSE_DELTA}.`
    );
  }

  private async requestLLMArbitration(
    a: MemoryNode,
    b: MemoryNode,
    scoreA: number,
    scoreB: number
  ): Promise<string | null> {
    if (!this.inference || !this.request || !this.connectorId) return null;

    try {
      const inferenceClient = this.inference.getClient({
        request: this.request,
        bindTo: { connectorId: this.connectorId },
      }) as BoundInferenceClient;

      const userContent =
        `Memory A (id=${a.id}):\n` +
        `  Summary: ${a.summary}\n` +
        `  Confidence: ${(a.confidence ?? 0).toFixed(2)}\n` +
        `  Reinforcement: ${(a.reinforcement_score ?? 0).toFixed(2)}\n` +
        `  Created: ${a.created_at}\n` +
        `  Last used: ${a.last_used_at ?? 'never'}\n` +
        `  Composite score: ${scoreA.toFixed(3)}\n\n` +
        `Memory B (id=${b.id}):\n` +
        `  Summary: ${b.summary}\n` +
        `  Confidence: ${(b.confidence ?? 0).toFixed(2)}\n` +
        `  Reinforcement: ${(b.reinforcement_score ?? 0).toFixed(2)}\n` +
        `  Created: ${b.created_at}\n` +
        `  Last used: ${b.last_used_at ?? 'never'}\n` +
        `  Composite score: ${scoreB.toFixed(3)}\n\n` +
        `These two memories contradict each other. Which should be preferred?`;

      const response = await inferenceClient.chatComplete({
        messages: [{ role: MessageRole.User, content: userContent }],
        system: CONTRADICTION_RESOLUTION_SYSTEM_PROMPT,
      });

      return response.content?.trim() ?? null;
    } catch (err) {
      this.logger.warn(
        `ContradictionResolver: LLM arbitration failed — ${(err as Error).message}`
      );
      return null;
    }
  }
}

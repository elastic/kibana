/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { MemoryNode, RetrievalStage } from '@kbn/agent-builder-common';

interface RerankContext {
  stage?: RetrievalStage;
  logger: Logger;
}

/**
 * Rerank retrieved memories using the configured method.
 *
 * - 'nothing': pass through unchanged
 * - 'memx': four-factor scoring (semantic position, recency, frequency, importance)
 * - 'ab': multi-factor formula from plan 020 (relevance, type_weight, utility, recency,
 *          reinforcement, confidence, redundancy penalty)
 */
export const rerank = (
  nodes: MemoryNode[],
  _query: string,
  method: string,
  ctx: RerankContext
): MemoryNode[] => {
  if (nodes.length <= 1) return nodes;

  switch (method) {
    case 'nothing':
      return nodes;
    case 'memx':
      return rerankMemx(nodes, ctx);
    case 'ab':
      return rerankAb(nodes, ctx);
    default:
      ctx.logger.warn(`Unknown reranking method "${method}", skipping`);
      return nodes;
  }
};

/**
 * MemX reranking: four-factor scoring.
 *
 * score = 0.45·position + 0.25·recency + 0.05·frequency + 0.10·importance
 *
 * - position: normalized position from original retrieval (1.0 for first, decays)
 * - recency: exponential half-life decay (default 30 days)
 * - frequency: log-normalized retrieval count (access_count)
 * - importance: salience score from the memory node
 */
const rerankMemx = (nodes: MemoryNode[], ctx: RerankContext): MemoryNode[] => {
  const now = Date.now();
  const halfLifeMs = 30 * 24 * 60 * 60 * 1000;
  const ln2 = Math.LN2;

  const scored = nodes.map((node, idx) => {
    const position = 1.0 / (1 + idx * 0.1);

    const lastUsed = node.recency ? new Date(node.recency).getTime() : node.created_at ? new Date(node.created_at).getTime() : now;
    const ageDays = Math.max(0, (now - lastUsed) / (24 * 60 * 60 * 1000));
    const recency = Math.exp((-ln2 / 30) * ageDays);

    const frequency = Math.log1p(node.access_count ?? 0) / Math.log1p(100);

    const importance = node.salience ?? 0.5;

    const score = 0.45 * position + 0.25 * recency + 0.05 * frequency + 0.10 * importance;

    return { node, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.node);
};

/**
 * AB reranking: multi-factor formula from plan 020.
 *
 * score = relevance + type_weight + utility + recency + freshness
 *       + reinforcement + confidence + salience + frequency + stability
 *       - redundancy
 *
 * - relevance: position-based proxy from original retrieval order
 * - type_weight: stage-dependent weight for memory type
 * - utility: how useful this memory has proven across its history
 * - recency: exponential decay from recency timestamp (type-specific rates)
 * - freshness: exponential decay from last_used_at (rewards recently accessed memories)
 * - reinforcement: normalized reinforcement_score
 * - confidence: how accurate we believe this memory is
 * - salience: how important/prominent relative to others
 * - frequency: log-normalized access count
 * - stability: how stable this memory is over time
 * - redundancy: penalize if summary overlaps with already-scored nodes
 */
const rerankAb = (nodes: MemoryNode[], ctx: RerankContext): MemoryNode[] => {
  const now = Date.now();
  const seenSummaries: string[] = [];

  const scored = nodes.map((node, idx) => {
    const relevance = Math.max(0, 1 - idx * 0.05);

    const typeWeight = getTypeWeight(ctx.stage, node.type);

    const utility = node.utility ?? 0.5;

    // Recency: decay from the recency timestamp (when memory was last relevant)
    const recencyTs = node.recency ? new Date(node.recency).getTime() : now;
    const recencyAgeDays = Math.max(0, (now - recencyTs) / (24 * 60 * 60 * 1000));
    const decayRate = node.type === 'episodic' ? 0.1 : node.type === 'procedural' ? 0.01 : 0.03;
    const recency = Math.exp(-decayRate * recencyAgeDays);

    // Freshness: decay from last_used_at (rewards recently accessed memories)
    const lastUsedTs = node.last_used_at ? new Date(node.last_used_at).getTime() : (node.created_at ? new Date(node.created_at).getTime() : now);
    const freshnessDays = Math.max(0, (now - lastUsedTs) / (24 * 60 * 60 * 1000));
    const freshness = Math.exp(-0.05 * freshnessDays);

    const reinforcement = Math.min(1, node.reinforcement_score ?? 0);

    const confidence = node.confidence ?? 0.5;

    const salience = node.salience ?? 0.5;

    const frequency = Math.log1p(node.access_count ?? 0) / Math.log1p(100);

    const stability = node.stability ?? 0.1;

    const redundancy = computeRedundancy(node.summary, seenSummaries);
    seenSummaries.push(node.summary);

    const score =
      0.20 * relevance +
      0.10 * typeWeight +
      0.10 * utility +
      0.15 * recency +
      0.05 * freshness +
      0.10 * reinforcement +
      0.10 * confidence +
      0.05 * salience +
      0.03 * frequency +
      0.05 * stability -
      0.07 * redundancy;

    return { node, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.node);
};

/**
 * Stage-dependent type weight from plan 020 retrieval matrix.
 */
const getTypeWeight = (stage: RetrievalStage | undefined, type: string): number => {
  const weights: Record<string, Record<string, number>> = {
    round_start:     { semantic: 0.4, procedural: 0.3, episodic: 0.2 },
    tool_checkpoint: { semantic: 0.3, procedural: 0.5, episodic: 0.25 },
    final_answer:    { semantic: 0.4, procedural: 0.3, episodic: 0.1 },
    memory_expand:   { semantic: 0.2, procedural: 0.2, episodic: 0.2 },
  };

  const stageWeights = stage ? weights[stage] : undefined;
  return stageWeights?.[type] ?? 0.2;
};

/**
 * Naive redundancy penalty: Jaccard similarity of word sets.
 * Returns a value 0-1, where 1 = completely redundant.
 */
const computeRedundancy = (summary: string, seenSummaries: string[]): number => {
  if (seenSummaries.length === 0) return 0;

  const words = new Set(summary.toLowerCase().split(/\s+/));
  let maxSimilarity = 0;

  for (const seen of seenSummaries) {
    const seenWords = new Set(seen.toLowerCase().split(/\s+/));
    const intersection = new Set([...words].filter((w) => seenWords.has(w)));
    const union = new Set([...words, ...seenWords]);
    const jaccard = union.size > 0 ? intersection.size / union.size : 0;
    maxSimilarity = Math.max(maxSimilarity, jaccard);
  }

  return maxSimilarity > 0.7 ? maxSimilarity * 0.5 : 0;
};

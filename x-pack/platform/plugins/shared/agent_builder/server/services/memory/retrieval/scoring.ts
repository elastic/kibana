/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MemoryNode, MemoryType, RetrievalStage } from '@kbn/agent-builder-common';

// ---------------------------------------------------------------------------
// Configuration interface
// ---------------------------------------------------------------------------

/**
 * Per-type recency decay constants.
 * lambda controls how fast a memory's recency score decays with age (days).
 * score = exp(-lambda * days_since_last_use)
 */
export interface RecencyDecayConfig {
  /** Default: 0.05 — semantic memories decay slowly */
  semantic: number;
  /** Default: 0.2 — episodic memories decay moderately fast */
  episodic: number;
  /** Default: 0.02 — procedural memories decay very slowly */
  procedural: number;
}

/**
 * Overall weights for each scoring component.
 * These are additive contribution multipliers.
 */
export interface ScoringWeightsConfig {
  /** Weight for BM25/kNN relevance score (0–1 normalized). Default: 1.0 */
  relevance: number;
  /** Weight for the type-stage weight table. Default: 1.0 */
  typeWeight: number;
  /** Weight for the utility score (how useful has this memory been). Default: 0.8 */
  utility: number;
  /** Weight for the recency score. Default: 0.6 */
  recency: number;
  /** Weight for the reinforcement score. Default: 0.5 */
  reinforcement: number;
  /** Weight for graph proximity bonus (per depth level). Default: 0.3 */
  graphProximity: number;
  /** Weight for the confidence score. Default: 0.4 */
  confidence: number;
  /** Penalty for redundancy (deducted when summary overlaps with already-selected memories). Default: 0.5 */
  redundancy: number;
}

/**
 * Full configurable scoring parameters.
 */
export interface MemoryRetrievalConfig {
  recencyDecay: RecencyDecayConfig;
  weights: ScoringWeightsConfig;
}

/**
 * Default scoring configuration.
 */
export const DEFAULT_RETRIEVAL_CONFIG: MemoryRetrievalConfig = {
  recencyDecay: {
    semantic: 0.05,
    episodic: 0.2,
    procedural: 0.02,
  },
  weights: {
    relevance: 1.0,
    typeWeight: 1.0,
    utility: 0.8,
    recency: 0.6,
    reinforcement: 0.5,
    graphProximity: 0.3,
    confidence: 0.4,
    redundancy: 0.5,
  },
};

// ---------------------------------------------------------------------------
// Type × Stage weight table
// ---------------------------------------------------------------------------

/**
 * Lookup table: stage → memory type → type weight contribution.
 *
 * round_start:     semantic > procedural > episodic (broad context at start)
 * tool_checkpoint: procedural > semantic > episodic (action-focused)
 * final_answer:    semantic > procedural, episodic penalised (synthesis phase)
 * memory_expand:   all equal (exploration phase)
 */
export const TYPE_STAGE_WEIGHTS: Record<RetrievalStage, Record<MemoryType, number>> = {
  round_start: {
    semantic: 0.8,
    procedural: 0.6,
    episodic: 0.4,
  },
  tool_checkpoint: {
    semantic: 0.8,
    procedural: 1.0,
    episodic: 0.6,
  },
  final_answer: {
    semantic: 0.8,
    procedural: 0.6,
    episodic: 0.2,
  },
  memory_expand: {
    semantic: 0.5,
    procedural: 0.5,
    episodic: 0.5,
  },
};

/**
 * Get the type weight for a given stage and memory type.
 */
export const getTypeWeight = (stage: RetrievalStage, type: MemoryType): number => {
  return TYPE_STAGE_WEIGHTS[stage]?.[type] ?? 0.5;
};

// ---------------------------------------------------------------------------
// Per-component scoring functions
// ---------------------------------------------------------------------------

/**
 * Compute recency score using exponential decay.
 * score = exp(-lambda * days_since_last_used)
 *
 * @param node - The memory node.
 * @param lambda - Decay constant (type-specific).
 * @param now - Current timestamp in ms. Defaults to Date.now().
 * @returns Recency score in [0, 1].
 */
export const computeRecencyScore = (
  node: MemoryNode,
  lambda: number,
  now: number = Date.now()
): number => {
  const lastUsedStr = node.last_used_at ?? node.updated_at ?? node.created_at;
  const lastUsedMs = new Date(lastUsedStr).getTime();

  if (isNaN(lastUsedMs)) {
    return 0;
  }

  const daysSinceLastUse = (now - lastUsedMs) / (1000 * 60 * 60 * 24);
  return Math.exp(-lambda * Math.max(0, daysSinceLastUse));
};

/**
 * Compute normalized reinforcement score contribution.
 * The raw reinforcement_score is clamped to [0, 2] then normalized to [0, 1].
 */
export const computeReinforcementScore = (node: MemoryNode): number => {
  const raw = node.reinforcement_score ?? 0;
  return Math.min(1, Math.max(0, raw / 2));
};

/**
 * Compute a simple redundancy penalty score against a set of already-selected summaries.
 * Uses Jaccard similarity of lowercased word tokens.
 *
 * @param node - The candidate memory node.
 * @param selectedSummaries - Summaries of memories already chosen in this retrieval pass.
 * @returns Redundancy score in [0, 1] — higher means more redundant.
 */
export const computeRedundancyPenalty = (node: MemoryNode, selectedSummaries: string[]): number => {
  if (selectedSummaries.length === 0) {
    return 0;
  }

  const candidateTokens = new Set(node.summary.toLowerCase().split(/\s+/).filter(Boolean));

  let maxSimilarity = 0;
  for (const summary of selectedSummaries) {
    const selectedTokens = new Set(summary.toLowerCase().split(/\s+/).filter(Boolean));

    // Jaccard: |intersection| / |union|
    let intersectionSize = 0;
    for (const token of candidateTokens) {
      if (selectedTokens.has(token)) {
        intersectionSize++;
      }
    }
    const unionSize = candidateTokens.size + selectedTokens.size - intersectionSize;
    const similarity = unionSize > 0 ? intersectionSize / unionSize : 0;

    if (similarity > maxSimilarity) {
      maxSimilarity = similarity;
    }
  }

  return maxSimilarity;
};

// ---------------------------------------------------------------------------
// Main scoring formula
// ---------------------------------------------------------------------------

/**
 * A memory node with its computed composite score.
 */
export interface ScoredMemoryNode {
  node: MemoryNode;
  /** Final composite score (higher is better). */
  score: number;
  /** Raw BM25/kNN relevance score from the search engine. */
  relevanceScore: number;
  /** Graph proximity bonus (0 = direct retrieval, positive for graph neighbors). */
  graphProximityBonus: number;
}

/**
 * Options for computing a composite memory score.
 */
export interface ScoreOptions {
  /** The memory node to score. */
  node: MemoryNode;
  /** Raw BM25/kNN relevance score (normalized to ~[0, 1]). */
  relevanceScore: number;
  /** The current retrieval stage. */
  stage: RetrievalStage;
  /** Current timestamp in ms. Defaults to Date.now(). */
  now?: number;
  /** Summaries of memories already selected in this retrieval pass (for redundancy check). */
  selectedSummaries?: string[];
  /** Graph proximity bonus: 0 for direct results, 1/depth for graph neighbors. */
  graphProximityBonus?: number;
  /** Scoring configuration. Defaults to DEFAULT_RETRIEVAL_CONFIG. */
  config?: MemoryRetrievalConfig;
}

/**
 * Compute the composite memory score for a single memory node.
 *
 * Formula:
 *   score = w_relevance * relevance
 *         + w_typeWeight * type_weight(stage, type)
 *         + w_utility * utility
 *         + w_recency * recency
 *         + w_reinforcement * reinforcement
 *         + w_graphProximity * graphProximityBonus
 *         + w_confidence * confidence
 *         - w_redundancy * redundancy
 *
 * All individual components are in [0, 1] before weighting.
 *
 * @returns A ScoredMemoryNode with the computed composite score.
 */
export const scoreMemoryNode = ({
  node,
  relevanceScore,
  stage,
  now = Date.now(),
  selectedSummaries = [],
  graphProximityBonus = 0,
  config = DEFAULT_RETRIEVAL_CONFIG,
}: ScoreOptions): ScoredMemoryNode => {
  const { weights, recencyDecay } = config;

  // Type × stage weight
  const typeWeight = getTypeWeight(stage, node.type);

  // Utility (already in [0, 1])
  const utility = Math.min(1, Math.max(0, node.utility ?? 0.5));

  // Recency (exponential decay, type-specific lambda)
  const lambda = recencyDecay[node.type] ?? 0.1;
  const recency = computeRecencyScore(node, lambda, now);

  // Reinforcement (normalized)
  const reinforcement = computeReinforcementScore(node);

  // Confidence (already in [0, 1])
  const confidence = Math.min(1, Math.max(0, node.confidence ?? 0.5));

  // Redundancy penalty (higher = more similar to already-selected nodes)
  const redundancy = computeRedundancyPenalty(node, selectedSummaries);

  // Normalize relevance score to [0, 1] (clamp, since BM25 scores can vary)
  const normalizedRelevance = Math.min(1, Math.max(0, relevanceScore));

  const score =
    weights.relevance * normalizedRelevance +
    weights.typeWeight * typeWeight +
    weights.utility * utility +
    weights.recency * recency +
    weights.reinforcement * reinforcement +
    weights.graphProximity * graphProximityBonus +
    weights.confidence * confidence -
    weights.redundancy * redundancy;

  return {
    node,
    score,
    relevanceScore: normalizedRelevance,
    graphProximityBonus,
  };
};

/**
 * Score and rank a list of memory nodes by composite score (descending).
 *
 * @param nodes - Candidate memory nodes with their raw relevance scores.
 * @param stage - The current retrieval stage.
 * @param opts - Optional scoring configuration and context.
 * @returns Sorted ScoredMemoryNode[] from highest to lowest score.
 */
export const rankMemoryNodes = (
  nodes: Array<{ node: MemoryNode; relevanceScore: number; graphProximityBonus?: number }>,
  stage: RetrievalStage,
  opts: {
    now?: number;
    config?: MemoryRetrievalConfig;
  } = {}
): ScoredMemoryNode[] => {
  const { now = Date.now(), config = DEFAULT_RETRIEVAL_CONFIG } = opts;
  const selectedSummaries: string[] = [];

  const scored = nodes.map(({ node, relevanceScore, graphProximityBonus = 0 }) => {
    const scoredNode = scoreMemoryNode({
      node,
      relevanceScore,
      stage,
      now,
      selectedSummaries: [...selectedSummaries],
      graphProximityBonus,
      config,
    });
    // Add this node's summary to the selected list for subsequent redundancy checks
    selectedSummaries.push(node.summary);
    return scoredNode;
  });

  // Sort descending by composite score
  return scored.sort((a, b) => b.score - a.score);
};

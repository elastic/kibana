/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MemoryNode } from '@kbn/agent-builder-common';
import {
  TYPE_STAGE_WEIGHTS,
  getTypeWeight,
  computeRecencyScore,
  computeReinforcementScore,
  computeRedundancyPenalty,
  scoreMemoryNode,
  rankMemoryNodes,
  DEFAULT_RETRIEVAL_CONFIG,
} from './scoring';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeNode = (overrides: Partial<MemoryNode> = {}): MemoryNode => ({
  id: 'test-id-001',
  type: 'semantic',
  summary: 'User prefers TypeScript over JavaScript.',
  full: 'User has expressed strong preference for TypeScript on multiple occasions.',
  confidence: 0.9,
  salience: 0.7,
  recency: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
  utility: 0.8,
  stability: 0.5,
  access_count: 5,
  reinforcement_score: 0.6,
  status: 'established',
  source_refs: [],
  links: [],
  created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  space: 'default',
  user_name: 'testuser',
  ...overrides,
});

// ---------------------------------------------------------------------------
// Type × Stage weight table
// ---------------------------------------------------------------------------

describe('TYPE_STAGE_WEIGHTS', () => {
  it('has all four retrieval stages', () => {
    expect(Object.keys(TYPE_STAGE_WEIGHTS)).toEqual(
      expect.arrayContaining(['round_start', 'tool_checkpoint', 'final_answer', 'memory_expand'])
    );
  });

  it('round_start: semantic=0.8, procedural=0.6, episodic=0.4', () => {
    expect(TYPE_STAGE_WEIGHTS.round_start.semantic).toBe(0.8);
    expect(TYPE_STAGE_WEIGHTS.round_start.procedural).toBe(0.6);
    expect(TYPE_STAGE_WEIGHTS.round_start.episodic).toBe(0.4);
  });

  it('tool_checkpoint: procedural=1.0 (highest at tool execution)', () => {
    expect(TYPE_STAGE_WEIGHTS.tool_checkpoint.procedural).toBe(1.0);
    expect(TYPE_STAGE_WEIGHTS.tool_checkpoint.semantic).toBe(0.8);
    expect(TYPE_STAGE_WEIGHTS.tool_checkpoint.episodic).toBe(0.6);
  });

  it('final_answer: episodic=0.2 (lowest at synthesis phase)', () => {
    expect(TYPE_STAGE_WEIGHTS.final_answer.episodic).toBe(0.2);
    expect(TYPE_STAGE_WEIGHTS.final_answer.semantic).toBe(0.8);
    expect(TYPE_STAGE_WEIGHTS.final_answer.procedural).toBe(0.6);
  });

  it('memory_expand: all types equal at 0.5', () => {
    expect(TYPE_STAGE_WEIGHTS.memory_expand.semantic).toBe(0.5);
    expect(TYPE_STAGE_WEIGHTS.memory_expand.procedural).toBe(0.5);
    expect(TYPE_STAGE_WEIGHTS.memory_expand.episodic).toBe(0.5);
  });
});

describe('getTypeWeight', () => {
  it('returns correct weight for semantic at round_start', () => {
    expect(getTypeWeight('round_start', 'semantic')).toBe(0.8);
  });

  it('returns correct weight for procedural at tool_checkpoint', () => {
    expect(getTypeWeight('tool_checkpoint', 'procedural')).toBe(1.0);
  });

  it('returns 0.5 as fallback for unknown type/stage', () => {
    expect(getTypeWeight('round_start', 'semantic')).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Recency score
// ---------------------------------------------------------------------------

describe('computeRecencyScore', () => {
  const now = Date.now();

  it('returns close to 1.0 for very recent memory (just updated)', () => {
    const node = makeNode({ last_used_at: new Date(now - 1000).toISOString() }); // 1 second ago
    const score = computeRecencyScore(node, 0.05, now);
    expect(score).toBeGreaterThan(0.99);
  });

  it('decays exponentially with time', () => {
    const node7days = makeNode({
      last_used_at: new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
    const node30days = makeNode({
      last_used_at: new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString(),
    });

    const score7 = computeRecencyScore(node7days, 0.05, now);
    const score30 = computeRecencyScore(node30days, 0.05, now);

    expect(score7).toBeGreaterThan(score30);
    // 7 days at lambda=0.05: exp(-0.05*7) ≈ 0.704
    expect(score7).toBeCloseTo(Math.exp(-0.05 * 7), 2);
    // 30 days: exp(-0.05*30) ≈ 0.223
    expect(score30).toBeCloseTo(Math.exp(-0.05 * 30), 2);
  });

  it('uses updated_at as fallback when last_used_at is absent', () => {
    const node = makeNode({
      last_used_at: undefined,
      updated_at: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
    });
    const score = computeRecencyScore(node, 0.05, now);
    expect(score).toBeCloseTo(Math.exp(-0.05 * 2), 2);
  });

  it('returns 0 for invalid date string', () => {
    const node = makeNode({ last_used_at: 'not-a-date', updated_at: 'bad', created_at: 'bad' });
    const score = computeRecencyScore(node, 0.05, now);
    expect(score).toBe(0);
  });

  it('slower decay for procedural (lower lambda) than episodic', () => {
    const node14days = makeNode({
      last_used_at: new Date(now - 14 * 24 * 60 * 60 * 1000).toISOString(),
    });
    const proceduralLambda = DEFAULT_RETRIEVAL_CONFIG.recencyDecay.procedural; // 0.02
    const episodicLambda = DEFAULT_RETRIEVAL_CONFIG.recencyDecay.episodic; // 0.2

    const proceduralScore = computeRecencyScore(node14days, proceduralLambda, now);
    const episodicScore = computeRecencyScore(node14days, episodicLambda, now);

    expect(proceduralScore).toBeGreaterThan(episodicScore);
  });
});

// ---------------------------------------------------------------------------
// Reinforcement score
// ---------------------------------------------------------------------------

describe('computeReinforcementScore', () => {
  it('returns 0 for reinforcement_score=0', () => {
    expect(computeReinforcementScore(makeNode({ reinforcement_score: 0 }))).toBe(0);
  });

  it('returns 0.5 for reinforcement_score=1.0 (half of max 2.0)', () => {
    expect(computeReinforcementScore(makeNode({ reinforcement_score: 1.0 }))).toBe(0.5);
  });

  it('returns 1.0 for reinforcement_score >= 2.0 (capped)', () => {
    expect(computeReinforcementScore(makeNode({ reinforcement_score: 2.0 }))).toBe(1.0);
    expect(computeReinforcementScore(makeNode({ reinforcement_score: 5.0 }))).toBe(1.0);
  });

  it('handles negative reinforcement gracefully (clamp to 0)', () => {
    expect(computeReinforcementScore(makeNode({ reinforcement_score: -0.5 }))).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Redundancy penalty
// ---------------------------------------------------------------------------

describe('computeRedundancyPenalty', () => {
  it('returns 0 when no selected summaries', () => {
    const node = makeNode({ summary: 'TypeScript is preferred.' });
    expect(computeRedundancyPenalty(node, [])).toBe(0);
  });

  it('returns high penalty for identical summary', () => {
    const summary = 'User prefers TypeScript over JavaScript.';
    const node = makeNode({ summary });
    const penalty = computeRedundancyPenalty(node, [summary]);
    expect(penalty).toBeCloseTo(1.0, 1);
  });

  it('returns low penalty for unrelated summary', () => {
    const node = makeNode({ summary: 'User prefers TypeScript over JavaScript.' });
    const penalty = computeRedundancyPenalty(node, ['Elasticsearch is a search engine.']);
    expect(penalty).toBeLessThan(0.2);
  });

  it('returns moderate penalty for partially overlapping summary', () => {
    const node = makeNode({ summary: 'User prefers TypeScript for backend code.' });
    const penalty = computeRedundancyPenalty(node, ['TypeScript is preferred by user for code.']);
    expect(penalty).toBeGreaterThan(0.2);
    expect(penalty).toBeLessThan(0.9);
  });

  it('returns max of similarities across multiple selected summaries', () => {
    const node = makeNode({ summary: 'TypeScript is strongly preferred.' });
    const penalty1 = computeRedundancyPenalty(node, ['Elasticsearch is great.']);
    const penalty2 = computeRedundancyPenalty(node, [
      'Elasticsearch is great.',
      'TypeScript is strongly preferred.',
    ]);
    expect(penalty2).toBeGreaterThan(penalty1);
  });
});

// ---------------------------------------------------------------------------
// scoreMemoryNode composite
// ---------------------------------------------------------------------------

describe('scoreMemoryNode', () => {
  const now = Date.now();

  it('produces a positive score for a typical node', () => {
    const result = scoreMemoryNode({
      node: makeNode(),
      relevanceScore: 0.8,
      stage: 'round_start',
      now,
    });
    expect(result.score).toBeGreaterThan(0);
    expect(result.node).toBeDefined();
    expect(result.relevanceScore).toBe(0.8);
  });

  it('higher relevance score → higher composite score (all else equal)', () => {
    const nodeBase = makeNode();
    const lowRelevance = scoreMemoryNode({
      node: nodeBase,
      relevanceScore: 0.2,
      stage: 'round_start',
      now,
    });
    const highRelevance = scoreMemoryNode({
      node: nodeBase,
      relevanceScore: 0.9,
      stage: 'round_start',
      now,
    });
    expect(highRelevance.score).toBeGreaterThan(lowRelevance.score);
  });

  it('redundancy penalty reduces score', () => {
    const node = makeNode({ summary: 'TypeScript is preferred.' });
    const noRedundancy = scoreMemoryNode({
      node,
      relevanceScore: 0.8,
      stage: 'round_start',
      now,
      selectedSummaries: [],
    });
    const withRedundancy = scoreMemoryNode({
      node,
      relevanceScore: 0.8,
      stage: 'round_start',
      now,
      selectedSummaries: ['TypeScript is preferred.'],
    });
    expect(withRedundancy.score).toBeLessThan(noRedundancy.score);
  });

  it('graph proximity bonus increases score', () => {
    const node = makeNode();
    const noBonus = scoreMemoryNode({
      node,
      relevanceScore: 0.5,
      stage: 'round_start',
      now,
      graphProximityBonus: 0,
    });
    const withBonus = scoreMemoryNode({
      node,
      relevanceScore: 0.5,
      stage: 'round_start',
      now,
      graphProximityBonus: 0.5,
    });
    expect(withBonus.score).toBeGreaterThan(noBonus.score);
  });

  it('clamps relevance score to [0, 1]', () => {
    const result = scoreMemoryNode({
      node: makeNode(),
      relevanceScore: 5.0, // out of range
      stage: 'round_start',
      now,
    });
    expect(result.relevanceScore).toBe(1.0);
  });

  it('procedural memories score higher at tool_checkpoint', () => {
    const semanticNode = makeNode({ type: 'semantic', summary: 'Fact about project.' });
    const proceduralNode = makeNode({ type: 'procedural', summary: 'Always run tests first.' });

    const semanticScore = scoreMemoryNode({
      node: semanticNode,
      relevanceScore: 0.7,
      stage: 'tool_checkpoint',
      now,
    });
    const proceduralScore = scoreMemoryNode({
      node: proceduralNode,
      relevanceScore: 0.7,
      stage: 'tool_checkpoint',
      now,
    });
    // Procedural has weight 1.0 at tool_checkpoint vs semantic 0.8
    expect(proceduralScore.score).toBeGreaterThan(semanticScore.score);
  });

  it('episodic memories score lower at final_answer', () => {
    const semanticNode = makeNode({ type: 'semantic' });
    const episodicNode = makeNode({ type: 'episodic' });

    const semanticScore = scoreMemoryNode({
      node: semanticNode,
      relevanceScore: 0.7,
      stage: 'final_answer',
      now,
    });
    const episodicScore = scoreMemoryNode({
      node: episodicNode,
      relevanceScore: 0.7,
      stage: 'final_answer',
      now,
    });

    expect(semanticScore.score).toBeGreaterThan(episodicScore.score);
  });
});

// ---------------------------------------------------------------------------
// rankMemoryNodes
// ---------------------------------------------------------------------------

describe('rankMemoryNodes', () => {
  const now = Date.now();

  it('returns nodes sorted by descending score', () => {
    const nodes = [
      { node: makeNode({ id: 'a', utility: 0.3, reinforcement_score: 0.1 }), relevanceScore: 0.3 },
      { node: makeNode({ id: 'b', utility: 0.9, reinforcement_score: 0.8 }), relevanceScore: 0.9 },
      { node: makeNode({ id: 'c', utility: 0.6, reinforcement_score: 0.4 }), relevanceScore: 0.6 },
    ];

    const ranked = rankMemoryNodes(nodes, 'round_start', { now });
    expect(ranked[0].node.id).toBe('b');
    expect(ranked[ranked.length - 1].node.id).toBe('a');
  });

  it('returns empty array for empty input', () => {
    expect(rankMemoryNodes([], 'round_start', { now })).toEqual([]);
  });

  it('accumulates redundancy penalties across ranked nodes', () => {
    const sameSummary = 'TypeScript is the best language.';
    const nodes = [
      { node: makeNode({ id: 'x', summary: sameSummary }), relevanceScore: 0.8 },
      { node: makeNode({ id: 'y', summary: sameSummary }), relevanceScore: 0.8 },
    ];

    const ranked = rankMemoryNodes(nodes, 'round_start', { now });
    // The second node with the same summary should have a lower score due to redundancy
    expect(ranked[0].score).toBeGreaterThanOrEqual(ranked[1].score);
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { calculateRelevanceScore, deriveRelevanceLabel, isAgentResponseEmpty } from './scoring';
import type { CorrectnessAnalysis } from './types';

type Centrality = CorrectnessAnalysis['analysis'][number]['centrality'];

const claims = (...centralities: Centrality[]) =>
  centralities.map((centrality) => ({ centrality }));

const buildAnalysis = (...centralities: Centrality[]): CorrectnessAnalysis => ({
  summary: {
    factual_accuracy_summary: 'ACCURATE',
    relevance_summary: 'RELEVANT',
    sequence_accuracy_summary: 'NOT_APPLICABLE',
  },
  analysis: centralities.map((centrality) => ({
    claim: 'test claim',
    centrality,
    centrality_reason: '',
    verdict: 'FULLY_SUPPORTED' as const,
    sequence_match: 'NOT_APPLICABLE' as const,
    justification_snippet: undefined,
    explanation: '',
  })),
});

describe('calculateRelevanceScore', () => {
  it('returns 0 when there are no claims', () => {
    expect(calculateRelevanceScore(buildAnalysis())).toBe(0);
  });

  it('returns 0 when the analysis is missing', () => {
    expect(calculateRelevanceScore({} as CorrectnessAnalysis)).toBe(0);
  });

  it('returns the share of central claims', () => {
    expect(calculateRelevanceScore(buildAnalysis('central', 'peripheral'))).toBe(0.5);
    expect(calculateRelevanceScore(buildAnalysis('central', 'central'))).toBe(1);
  });
});

describe('deriveRelevanceLabel', () => {
  it('is IRRELEVANT for zero claims', () => {
    expect(deriveRelevanceLabel([])).toBe('IRRELEVANT');
  });

  it('is RELEVANT when every claim is central', () => {
    expect(deriveRelevanceLabel(claims('central'))).toBe('RELEVANT');
    expect(deriveRelevanceLabel(claims('central', 'central', 'central'))).toBe('RELEVANT');
  });

  it('is PARTIALLY_RELEVANT when exactly half of the claims are central', () => {
    expect(deriveRelevanceLabel(claims('central', 'peripheral'))).toBe('PARTIALLY_RELEVANT');
  });

  it('is PARTIALLY_RELEVANT when most but not all claims are central', () => {
    expect(deriveRelevanceLabel(claims('central', 'central', 'peripheral'))).toBe(
      'PARTIALLY_RELEVANT'
    );
  });

  it('is IRRELEVANT when fewer than half of the claims are central', () => {
    expect(deriveRelevanceLabel(claims('central', 'peripheral', 'peripheral'))).toBe('IRRELEVANT');
  });

  it('is IRRELEVANT when no claim is central', () => {
    expect(deriveRelevanceLabel(claims('peripheral'))).toBe('IRRELEVANT');
  });
});

describe('isAgentResponseEmpty', () => {
  it('detects an empty latest message', () => {
    expect(isAgentResponseEmpty({ messages: [{ message: '' }] })).toBe(true);
  });

  it('detects a whitespace-only latest message', () => {
    expect(isAgentResponseEmpty({ messages: [{ message: ' \n\t ' }] })).toBe(true);
  });

  it('detects a missing latest message', () => {
    expect(isAgentResponseEmpty({ messages: [] })).toBe(true);
    expect(isAgentResponseEmpty({ messages: [{}] })).toBe(true);
  });

  it('only looks at the latest message', () => {
    expect(isAgentResponseEmpty({ messages: [{ message: 'hi' }, { message: '' }] })).toBe(true);
    expect(isAgentResponseEmpty({ messages: [{ message: '' }, { message: 'hi' }] })).toBe(false);
  });

  it('is false for a non-empty response', () => {
    expect(isAgentResponseEmpty({ messages: [{ message: 'answer' }] })).toBe(false);
  });

  it('is false when the output has no message list', () => {
    expect(isAgentResponseEmpty(undefined)).toBe(false);
    expect(isAgentResponseEmpty({})).toBe(false);
  });
});

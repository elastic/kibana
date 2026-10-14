/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createQuantitativeCorrectnessEvaluators } from '.';
import type { CorrectnessAnalysis } from './types';

type Claim = CorrectnessAnalysis['analysis'][number];

const buildAnalysis = (
  relevanceSummary: string,
  centralities: Array<Claim['centrality']>
): CorrectnessAnalysis => ({
  summary: {
    factual_accuracy_summary: 'ACCURATE',
    relevance_summary: relevanceSummary,
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

const evaluateRelevance = async ({
  message,
  correctnessAnalysis,
}: {
  message: string;
  correctnessAnalysis: CorrectnessAnalysis;
}) => {
  const relevance = createQuantitativeCorrectnessEvaluators().find((e) => e.name === 'Relevance')!;
  return relevance.evaluate({
    input: {},
    expected: {},
    output: { messages: [{ message }], correctnessAnalysis },
    metadata: {},
  } as any);
};

describe('Relevance quantitative evaluator', () => {
  describe('empty agent response', () => {
    it.each(['', '   \n '])(
      'scores 0 and labels IRRELEVANT even when the judge emitted one central meta-claim (%j)',
      async (message) => {
        const result = await evaluateRelevance({
          message,
          correctnessAnalysis: buildAnalysis('RELEVANT', ['central']),
        });

        expect(result.score).toBe(0);
        expect(result.label).toBe('IRRELEVANT');
      }
    );

    it('scores 0 when the judge emitted no claims', async () => {
      const result = await evaluateRelevance({
        message: '',
        correctnessAnalysis: buildAnalysis('IRRELEVANT', []),
      });

      expect(result.score).toBe(0);
      expect(result.label).toBe('IRRELEVANT');
      expect(result.metadata?.relevanceLabelConsistent).toBe(true);
    });

    it('flags the judge label as inconsistent when it was not IRRELEVANT', async () => {
      const result = await evaluateRelevance({
        message: '',
        correctnessAnalysis: buildAnalysis('RELEVANT', ['central']),
      });

      expect(result.metadata?.relevanceLabelConsistent).toBe(false);
    });
  });

  describe('non-empty agent response', () => {
    it('keeps the share-of-central-claims score and the judge label', async () => {
      const result = await evaluateRelevance({
        message: 'answer',
        correctnessAnalysis: buildAnalysis('PARTIALLY_RELEVANT', ['central', 'peripheral']),
      });

      expect(result.score).toBe(0.5);
      expect(result.label).toBe('PARTIALLY_RELEVANT');
    });

    it.each([
      ['RELEVANT', ['central', 'central'], true],
      ['PARTIALLY_RELEVANT', ['central', 'central'], false],
      ['PARTIALLY_RELEVANT', ['central', 'peripheral'], true],
      ['IRRELEVANT', ['central', 'peripheral'], false],
      ['IRRELEVANT', ['central', 'peripheral', 'peripheral'], true],
      ['PARTIALLY_RELEVANT', ['central', 'peripheral', 'peripheral'], false],
      ['IRRELEVANT', [], true],
    ] as Array<[string, Array<Claim['centrality']>, boolean]>)(
      'relevanceLabelConsistent for judge label %s with claims %j is %s',
      async (judgeLabel, centralities, consistent) => {
        const result = await evaluateRelevance({
          message: 'answer',
          correctnessAnalysis: buildAnalysis(judgeLabel, centralities),
        });

        expect(result.label).toBe(judgeLabel);
        expect(result.metadata?.relevanceLabelConsistent).toBe(consistent);
      }
    );

    it('does not override an inconsistent judge label', async () => {
      const result = await evaluateRelevance({
        message: 'answer',
        correctnessAnalysis: buildAnalysis('PARTIALLY_RELEVANT', [
          'central',
          'peripheral',
          'peripheral',
        ]),
      });

      expect(result.label).toBe('PARTIALLY_RELEVANT');
    });
  });

  it('does not touch Factuality or Sequence Accuracy metadata', async () => {
    const evaluators = createQuantitativeCorrectnessEvaluators();
    const factuality = evaluators.find((e) => e.name === 'Factuality')!;
    const result = await factuality.evaluate({
      input: {},
      expected: {},
      output: {
        messages: [{ message: '' }],
        correctnessAnalysis: buildAnalysis('RELEVANT', ['central']),
      },
      metadata: {},
    } as any);

    expect(result.metadata).not.toHaveProperty('relevanceLabelConsistent');
  });
});

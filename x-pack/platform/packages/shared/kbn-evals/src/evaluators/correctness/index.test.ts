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

      expect(result.metadata?.judgeRelevanceLabel).toBe('RELEVANT');
      expect(result.metadata?.relevanceLabelConsistent).toBe(false);
    });
  });

  describe('non-empty agent response', () => {
    it.each([
      ['RELEVANT', ['central']],
      ['RELEVANT', ['central', 'central', 'central']],
      ['PARTIALLY_RELEVANT', ['central', 'peripheral']],
      ['PARTIALLY_RELEVANT', ['central', 'central', 'peripheral']],
      ['IRRELEVANT', ['central', 'peripheral', 'peripheral']],
      ['IRRELEVANT', ['peripheral', 'peripheral']],
      ['IRRELEVANT', []],
    ] as Array<[string, Array<Claim['centrality']>]>)(
      'labels %s for claims %j regardless of the judge label',
      async (expectedLabel, centralities) => {
        for (const judgeLabel of ['RELEVANT', 'PARTIALLY_RELEVANT', 'IRRELEVANT']) {
          const result = await evaluateRelevance({
            message: 'answer',
            correctnessAnalysis: buildAnalysis(judgeLabel, centralities),
          });

          expect(result.label).toBe(expectedLabel);
          expect(result.metadata?.judgeRelevanceLabel).toBe(judgeLabel);
          expect(result.metadata?.relevanceLabelConsistent).toBe(judgeLabel === expectedLabel);
        }
      }
    );

    it('uses the claims, not the judge, when the judge says PARTIALLY_RELEVANT for all-central claims', async () => {
      const result = await evaluateRelevance({
        message: 'answer',
        correctnessAnalysis: buildAnalysis('PARTIALLY_RELEVANT', ['central', 'central']),
      });

      expect(result.label).toBe('RELEVANT');
      expect(result.metadata?.judgeRelevanceLabel).toBe('PARTIALLY_RELEVANT');
      expect(result.metadata?.relevanceLabelConsistent).toBe(false);
    });

    it('labels exactly 50% central claims PARTIALLY_RELEVANT', async () => {
      const result = await evaluateRelevance({
        message: 'answer',
        correctnessAnalysis: buildAnalysis('IRRELEVANT', [
          'central',
          'peripheral',
          'central',
          'peripheral',
        ]),
      });

      expect(result.label).toBe('PARTIALLY_RELEVANT');
    });

    it.each([
      ['RELEVANT', ['central', 'central']],
      ['PARTIALLY_RELEVANT', ['central', 'central']],
      ['IRRELEVANT', ['central', 'peripheral', 'peripheral']],
    ] as Array<[string, Array<Claim['centrality']>]>)(
      'keeps the share-of-central-claims score independent of the judge label %s',
      async (judgeLabel, centralities) => {
        const result = await evaluateRelevance({
          message: 'answer',
          correctnessAnalysis: buildAnalysis(judgeLabel, centralities),
        });

        expect(result.score).toBe(
          centralities.filter((c) => c === 'central').length / centralities.length
        );
      }
    );
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { runLlmJudge } from '../llm_judge';
import type { EvaluatorDefinition, EvaluatorResult } from '../types';
import { LlmCorrectnessEvaluationPrompt } from './prompt';
import {
  calculateFactualScore,
  calculateProceduralFidelityScore,
  calculateRelevanceScore,
} from './scoring';
import type { CorrectnessAnalysis } from './types';

const referenceDataSchema = z.object({
  expected: z
    .string()
    .trim()
    .min(1)
    .max(131072)
    .describe('The expected ground truth response to compare against.'),
});

const correctnessEvidenceSchema = z.object({
  input: z.object({
    message: z.string().trim().min(1),
  }),
  response: z.object({
    message: z.string().trim().min(1),
  }),
});

export const correctnessEvaluator: EvaluatorDefinition<z.infer<typeof referenceDataSchema>> = {
  name: 'correctness',
  version: '1.0.0',
  kind: 'llm',
  origin: 'built_in',
  direction: 'maximize',
  description: 'Measures factuality, relevance, and sequence accuracy against expected output.',
  referenceDataSchema,
  evidenceSchema: correctnessEvidenceSchema,
  async evaluate({ round, referenceData, inferenceClient }) {
    if (!inferenceClient) {
      throw new Error('Inference client is required for correctness evaluator');
    }

    const analysis = await runLlmJudge<CorrectnessAnalysis>({
      inferenceClient,
      prompt: LlmCorrectnessEvaluationPrompt,
      toolName: 'analyze',
      input: {
        user_query: round.input.message,
        agent_response: round.response.message,
        ground_truth_response: referenceData!.expected,
      },
    });

    const scoreEntry = (
      name: string,
      score: number | null,
      summary: string
    ): EvaluatorResult['scores'][number] =>
      score === null
        ? {
            name,
            score: null,
            label: 'error',
            explanation: 'Judge output has no claim analysis to score',
            metadata: { ...analysis },
          }
        : { name, score, label: summary, explanation: summary, metadata: { ...analysis } };

    return {
      scores: [
        scoreEntry(
          'factuality',
          calculateFactualScore(analysis),
          analysis.summary.factual_accuracy_summary
        ),
        scoreEntry(
          'relevance',
          calculateRelevanceScore(analysis),
          analysis.summary.relevance_summary
        ),
        scoreEntry(
          'sequence_accuracy',
          calculateProceduralFidelityScore(analysis),
          analysis.summary.sequence_accuracy_summary
        ),
      ],
    };
  },
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { extractChatEvidence } from '../chat_evidence';
import { runLlmJudge } from '../llm_judge';
import type { EvaluatorDefinition } from '../types';
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

export const correctnessEvaluator: EvaluatorDefinition<z.infer<typeof referenceDataSchema>> = {
  name: 'correctness',
  version: '1.0.0',
  kind: 'llm',
  description: 'Measures factuality, relevance, and sequence accuracy against expected output.',
  referenceDataSchema,
  async evaluate({ trace, referenceData, inferenceClient }) {
    if (!inferenceClient) {
      throw new Error('Inference client is required for correctness evaluator');
    }

    const chatEvidence = await extractChatEvidence(trace);

    const analysis = await runLlmJudge<CorrectnessAnalysis>({
      inferenceClient,
      prompt: LlmCorrectnessEvaluationPrompt,
      toolName: 'analyze',
      input: {
        user_query: chatEvidence.user_query,
        agent_response: chatEvidence.agent_response,
        ground_truth_response: referenceData!.expected,
      },
    });

    return {
      scores: [
        {
          name: 'factuality',
          score: calculateFactualScore(analysis),
          label: analysis.summary.factual_accuracy_summary,
          explanation: analysis.summary.factual_accuracy_summary,
          metadata: { ...analysis },
        },
        {
          name: 'relevance',
          score: calculateRelevanceScore(analysis),
          label: analysis.summary.relevance_summary,
          explanation: analysis.summary.relevance_summary,
          metadata: { ...analysis },
        },
        {
          name: 'sequence_accuracy',
          score: calculateProceduralFidelityScore(analysis),
          label: analysis.summary.sequence_accuracy_summary,
          explanation: analysis.summary.sequence_accuracy_summary,
          metadata: { ...analysis },
        },
      ],
    };
  },
};

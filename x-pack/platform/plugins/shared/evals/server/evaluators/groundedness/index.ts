/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { runLlmJudge } from '../llm_judge';
import type { EvaluatorDefinition } from '../types';
import { LlmGroundednessEvaluationPrompt } from './prompt';
import { calculateGroundednessScore } from './scoring';
import type { GroundednessAnalysis } from './types';

const groundednessEvidenceSchema = z.object({
  input: z.object({
    message: z.string().trim().min(1),
  }),
  response: z.object({
    message: z.string().trim().min(1),
  }),
  steps: z.array(z.object({}).catchall(z.unknown())),
});

export const groundednessEvaluator: EvaluatorDefinition = {
  name: 'groundedness',
  version: '1.0.0',
  kind: 'llm',
  description: 'Measures whether the response is grounded in tool-call outputs from the trace.',
  evidenceSchema: groundednessEvidenceSchema,
  async evaluate({ round, inferenceClient }) {
    if (!inferenceClient) {
      throw new Error('Inference client is required for groundedness evaluator');
    }

    const analysis = await runLlmJudge<GroundednessAnalysis>({
      inferenceClient,
      prompt: LlmGroundednessEvaluationPrompt,
      toolName: 'analyze',
      input: {
        user_query: round.input.message,
        agent_response: round.response.message,
        tool_call_history: JSON.stringify(round.steps),
      },
    });

    return {
      scores: [
        {
          name: 'groundedness',
          score: calculateGroundednessScore(analysis),
          label: analysis.summary_verdict,
          explanation: analysis.summary_verdict,
          metadata: {
            ...analysis,
          },
        },
      ],
    };
  },
};

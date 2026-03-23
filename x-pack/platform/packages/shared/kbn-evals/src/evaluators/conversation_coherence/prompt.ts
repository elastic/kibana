/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPrompt } from '@kbn/inference-common';
import { z } from '@kbn/zod/v4';
import systemPromptText from './system_prompt.text';
import userPromptText from './user_prompt.text';

export const LlmCoherenceEvaluationPrompt = createPrompt({
  name: 'llm_coherence_evaluation',
  description: 'Prompt for evaluating the coherence of multi-turn conversations',
  input: z.object({
    conversation: z.string(),
  }),
})
  .version({
    system: {
      mustache: {
        template: systemPromptText,
      },
    },
    template: {
      mustache: {
        template: userPromptText,
      },
    },
    tools: {
      score_coherence: {
        description:
          'Return coherence scores across four dimensions: topic consistency, context retention, contradiction detection, and resolution quality.',
        schema: {
          type: 'object',
          properties: {
            topic_consistency: {
              type: 'number',
              description: 'Score from 0 to 1 indicating how well the conversation stays on topic.',
            },
            context_retention: {
              type: 'number',
              description:
                'Score from 0 to 1 indicating how well the agent remembers and uses information from prior turns.',
            },
            contradiction_score: {
              type: 'number',
              description:
                'Score from 0 to 1 where 1 means no contradictions detected and 0 means severe contradictions.',
            },
            resolution_quality: {
              type: 'number',
              description:
                "Score from 0 to 1 indicating how well the user's question is ultimately resolved.",
            },
            reasoning: {
              type: 'string',
              description: 'Brief explanation of the scores across all dimensions.',
            },
          },
          required: [
            'topic_consistency',
            'context_retention',
            'contradiction_score',
            'resolution_quality',
            'reasoning',
          ],
        },
      },
    },
  } as const)
  .get();

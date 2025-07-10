/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPrompt } from '@kbn/inference-common';
import { z } from '@kbn/zod';
import systemPromptText from './system_prompt.text';
import userPromptText from './user_prompt.text';

export const LlmCriteriaEvaluationPrompt = createPrompt({
  name: 'llm_criteria_evaluation',
  description: 'Prompt for evaluation the LLM with a set of criteria',
  input: z.object({
    input: z.string(),
    output: z.string(),
    metadata: z.string().optional(),
    criteria: z.array(z.string()),
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
    toolChoice: {
      function: 'score',
    },
    tools: {
      score: {
        description: 'Return PASS, FAIL, or N/A for every evaluation criterion.',
        schema: {
          type: 'object',
          properties: {
            criteria: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: {
                    type: 'string',
                    description: 'The unique identifier of the criterion.',
                  },
                  result: {
                    type: 'string',
                    description: 'Outcome of evaluating the criterion.',
                    enum: ['PASS', 'FAIL', 'N/A'],
                  },
                },
                required: ['id', 'result'],
              },
              description: 'A verdict for every criterion.',
            },
          },
          required: ['criteria'],
        },
      },
    },
  } as const)
  .get();

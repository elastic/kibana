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

export const EsqlEquivalencePrompt = createPrompt({
  name: 'esql_equivalence_evaluation',
  description: 'Evaluate ES|QL query equivalence between gold and generated queries',
  input: z.object({
    ground_truth: z.string(),
    prediction: z.string(),
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
      function: 'evaluate',
    },
    tools: {
      evaluate: {
        description:
          'Assess the functional equivalence of the generated ES|QL query to the gold query.',
        schema: {
          type: 'object',
          properties: {
            equivalent: {
              type: 'string',
              enum: ['Yes', 'No'],
              description:
                'Whether the generated ES|QL query is functionally equivalent to the gold query.',
            },
            reason: {
              type: 'string',
              description: 'Briefly explain the reasoning behind your judgement.',
            },
          },
          required: ['equivalent', 'reason'],
        },
      },
    },
  } as const)
  .get();

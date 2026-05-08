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

const SEMANTIC_UNIQUENESS_OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    k: {
      type: 'number',
      description:
        'Number of semantic clusters you formed — each cluster = one unique real-world concept. K is always <= N (the total number of unique-by-id KIs provided in the input). (integer)',
    },
    explanation: {
      type: 'string',
      description:
        'Your reasoning: list confirmed duplicate clusters with their one-sentence identity statements, and briefly note what drives duplication (id naming instability, overly generic ids, etc.)',
    },
    duplicate_clusters: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          ids: {
            type: 'array',
            items: { type: 'string' },
            description: 'KI ids that form the duplicate cluster',
          },
          identity_statement: {
            type: 'string',
            description:
              'One sentence naming the single real-world component or process all members refer to',
          },
        },
        required: ['ids', 'identity_statement'],
      },
      description: 'Up to 5 of the largest confirmed duplicate clusters',
    },
  },
  required: ['k', 'explanation', 'duplicate_clusters'],
} as const;

export const SemanticUniquenessPrompt = createPrompt({
  name: 'semantic_uniqueness_analysis',
  description: 'Evaluate semantic uniqueness of extracted KIs',
  input: z.object({
    stream_name: z.string(),
    totals: z.string(),
    unique_kis_by_id: z.string(),
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
      function: 'analyze',
    },
    tools: {
      analyze: {
        description: 'Return semantic uniqueness analysis',
        schema: SEMANTIC_UNIQUENESS_OUTPUT_SCHEMA,
      },
    },
  } as const)
  .get();

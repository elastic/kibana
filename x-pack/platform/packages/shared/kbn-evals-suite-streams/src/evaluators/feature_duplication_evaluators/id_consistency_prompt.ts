/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPrompt } from '@kbn/inference-common';
import { z } from '@kbn/zod/v4';
import systemPromptText from './id_consistency_system_prompt.text';
import userPromptText from './id_consistency_user_prompt.text';

const ID_CONSISTENCY_OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    collision_groups: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'The feature id that is a collision',
          },
          reason: {
            type: 'string',
            description:
              'One sentence explaining why the variants conflict (e.g. "variant A describes X while variant B describes Y")',
          },
        },
        required: ['id', 'reason'],
      },
      description:
        'Id groups you judge as INCONSISTENT (genuine collisions). Omit groups where variants clearly refer to the same underlying concept, even if wording differs.',
    },
    explanation: {
      type: 'string',
      description:
        'Brief summary: note what drives collisions (overly generic ids, type confusion, unstable naming, etc.)',
    },
  },
  required: ['collision_groups', 'explanation'],
} as const;

export const IdConsistencyPrompt = createPrompt({
  name: 'id_consistency_analysis',
  description: 'Evaluate id consistency of extracted features across runs',
  input: z.object({
    stream_name: z.string(),
    context: z.string(),
    id_groups: z.string(),
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
        description: 'Return id consistency evaluation',
        schema: ID_CONSISTENCY_OUTPUT_SCHEMA,
      },
    },
  } as const)
  .get();

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPrompt } from '@kbn/inference-common';
import { z } from '@kbn/zod/v4';
import systemPromptText from './soft_delete_evaluator_system_prompt.text';
import userPromptText from './soft_delete_evaluator_user_prompt.text';

export const SoftDeleteCompliancePrompt = createPrompt({
  name: 'soft_delete_compliance_analysis',
  description:
    'Evaluate whether soft-deleted features were incorrectly regenerated in follow-up identification runs',
  input: z.object({
    deleted_features: z.string(),
    follow_up_runs: z.string(),
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
      analyze: {
        description:
          'Return the list of soft-delete compliance violations found across follow-up runs',
        schema: {
          type: 'object',
          properties: {
            violations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  run_index: {
                    type: 'number',
                    description:
                      'The zero-based index of the follow-up run where the violation occurred',
                  },
                  deleted_feature: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', description: 'The id of the deleted feature' },
                      title: { type: 'string', description: 'The title of the deleted feature' },
                      type: { type: 'string', description: 'The type of the deleted feature' },
                      subtype: {
                        type: 'string',
                        description: 'The subtype of the deleted feature',
                      },
                    },
                    required: ['id', 'title', 'type', 'subtype'],
                  },
                  regenerated_feature: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', description: 'The id of the regenerated feature' },
                      title: {
                        type: 'string',
                        description: 'The title of the regenerated feature',
                      },
                      type: { type: 'string', description: 'The type of the regenerated feature' },
                      subtype: {
                        type: 'string',
                        description: 'The subtype of the regenerated feature',
                      },
                    },
                    required: ['id', 'title', 'type', 'subtype'],
                  },
                  reason: {
                    type: 'string',
                    description:
                      'One sentence explaining why the regenerated feature is semantically the same as the deleted one',
                  },
                },
                required: ['run_index', 'deleted_feature', 'regenerated_feature', 'reason'],
              },
              description:
                'Features from follow-up runs that semantically match a deleted feature. Empty if the LLM fully respected the soft-delete list.',
            },
            explanation: {
              type: 'string',
              description: 'Brief summary of your analysis',
            },
          },
          required: ['violations', 'explanation'],
        },
      },
    },
  } as const)
  .get();

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

export const ExcludeCompliancePrompt = createPrompt({
  name: 'exclude_compliance_analysis',
  description:
    'Evaluate whether excluded features were incorrectly regenerated in follow-up identification runs',
  input: z.object({
    excluded_features: z.string(),
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
          'Return the list of exclusion compliance violations found across follow-up runs',
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
                  excluded_feature: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', description: 'The id of the excluded feature' },
                      title: { type: 'string', description: 'The title of the excluded feature' },
                      type: { type: 'string', description: 'The type of the excluded feature' },
                      subtype: {
                        type: 'string',
                        description: 'The subtype of the excluded feature',
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
                      'One sentence explaining why the regenerated feature is semantically the same as the excluded one',
                  },
                },
                required: ['run_index', 'excluded_feature', 'regenerated_feature', 'reason'],
              },
              description:
                'Features from follow-up runs that semantically match an excluded feature. Empty if the LLM fully respected the exclusion list.',
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

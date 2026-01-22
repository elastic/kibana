/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { createPrompt } from '@kbn/inference-common';
import significantEventsSystemPrompt from './system_prompt.text';
import significantEventsUserPrompt from './user_prompt.text';
import {
  SIGNIFICANT_EVENT_TYPE_CONFIGURATION,
  SIGNIFICANT_EVENT_TYPE_ERROR,
  SIGNIFICANT_EVENT_TYPE_OPERATIONAL,
  SIGNIFICANT_EVENT_TYPE_RESOURCE_HEALTH,
  SIGNIFICANT_EVENT_TYPE_SECURITY,
} from './types';

export { significantEventsSystemPrompt as significantEventsPrompt };

export function createGenerateSignificantEventsPrompt({ systemPrompt }: { systemPrompt: string }) {
  return createPrompt({
    name: 'generate_significant_events',
    input: z.object({
      name: z.string(),
      description: z.string(),
      dataset_analysis: z.string(),
    }),
  })
    .version({
      system: {
        mustache: {
          template: systemPrompt,
        },
      },
      template: {
        mustache: {
          template: significantEventsUserPrompt,
        },
      },
      tools: {
        add_queries: {
          description: `Add queries to suggest to the user`,
          schema: {
            type: 'object',
            properties: {
              queries: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    kql: {
                      type: 'string',
                    },
                    title: {
                      type: 'string',
                    },
                    category: {
                      type: 'string',
                      enum: [
                        SIGNIFICANT_EVENT_TYPE_OPERATIONAL,
                        SIGNIFICANT_EVENT_TYPE_CONFIGURATION,
                        SIGNIFICANT_EVENT_TYPE_ERROR,
                        SIGNIFICANT_EVENT_TYPE_RESOURCE_HEALTH,
                        SIGNIFICANT_EVENT_TYPE_SECURITY,
                      ],
                    },
                    severity_score: {
                      type: 'number',
                      minimum: 0,
                      maximum: 100,
                    },
                    evidence: {
                      type: 'array',
                      items: {
                        type: 'string',
                      },
                    },
                  },
                  required: ['kql', 'title', 'category', 'severity_score'],
                },
              },
            },
            required: ['queries'],
          },
        },
      } as const,
    })
    .get();
}

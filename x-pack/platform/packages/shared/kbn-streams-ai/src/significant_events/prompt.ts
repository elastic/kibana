/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { createPrompt, type ToolDefinition } from '@kbn/inference-common';
import significantEventsSystemPrompt from './system_prompt.text';
import significantEventsUserPrompt from './user_prompt.text';
import {
  SIGNIFICANT_EVENT_TYPE_CONFIGURATION,
  SIGNIFICANT_EVENT_TYPE_ERROR,
  SIGNIFICANT_EVENT_TYPE_OPERATIONAL,
  SIGNIFICANT_EVENT_TYPE_RESOURCE_HEALTH,
  SIGNIFICANT_EVENT_TYPE_SECURITY,
} from './types';
import { SIGNIFICANT_EVENTS_FEATURE_TOOL_TYPES } from './tools/features_tool';
import { createGetStreamFeaturesTool } from '../features/tool';

export { significantEventsSystemPrompt as significantEventsPrompt };

export function createGenerateSignificantEventsPrompt({
  systemPrompt,
  additionalTools,
}: {
  systemPrompt: string;
  additionalTools?: Record<string, ToolDefinition>;
}) {
  return createPrompt({
    name: 'generate_significant_events_ki_queries',
    input: z.object({
      name: z.string(),
      description: z.string(),
      available_feature_types: z.string(),
      computed_feature_instructions: z.string(),
      existing_queries: z.string(),
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
        get_stream_features: createGetStreamFeaturesTool(SIGNIFICANT_EVENTS_FEATURE_TOOL_TYPES),
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
                    esql: {
                      type: 'string',
                    },
                    title: {
                      type: 'string',
                    },
                    description: {
                      type: 'string',
                      description:
                        'A semantically searchable description explaining what the query detects and why it matters. Should be 1-2 sentences that help users find this query when searching by concept or intent.',
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
                    type: {
                      type: 'string',
                      enum: ['match', 'stats'],
                      description:
                        'Hint for query type. "match" for WHERE-only filters, "stats" for aggregation queries. The system derives the authoritative type from ES|QL content.',
                    },
                    evidence: {
                      type: 'array',
                      items: {
                        type: 'string',
                      },
                    },
                    replaces: {
                      type: 'string',
                      description:
                        'If this query replaces an existing one (same detection intent but updated ES|QL), set this to the ID of the existing query from `existing_queries`.',
                    },
                    expects_matches: {
                      type: 'boolean',
                      description:
                        'Defaults to true if omitted. true: this query is grounded in evidence currently present and should match documents in the validation window; it is rejected if it matches nothing (a 0-match means the field or literal is wrong - correct it). false: this query deliberately watches for a condition that is genuinely ABSENT from the window (not yet occurring, or grounded only in evidence older than the window), so a 0-match is expected and the query is accepted as a watch. Only set false when you can cite evidence that the condition does not occur in the window.',
                    },
                    feature_ids: {
                      type: 'array',
                      items: {
                        type: 'string',
                      },
                      description:
                        'IDs of the features (from get_stream_features) that informed this query. Each ID must match a feature `id` returned by a previous get_stream_features call.',
                    },
                  },
                  required: [
                    'esql',
                    'title',
                    'description',
                    'category',
                    'severity_score',
                    'feature_ids',
                  ],
                },
              },
            },
            required: ['queries'],
          },
        },
        ...(additionalTools ?? {}),
      } as const,
    })
    .get();
}

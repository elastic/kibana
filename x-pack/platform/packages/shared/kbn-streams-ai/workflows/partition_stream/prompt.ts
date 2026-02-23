/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { createPrompt } from '@kbn/inference-common';
import { Streams } from '@kbn/streams-schema';
import systemPromptTemplate from './system_prompt.text';
import contentPromptTemplate from './content_prompt.text';
import { PARTITION_FEATURE_TOOL_TYPES } from './features_tool';

export const SuggestStreamPartitionsPrompt = createPrompt({
  name: 'suggest_stream_partitions_prompt',
  description: 'Suggest stream partitions based on sample data',
  input: z.object({
    stream: Streams.all.Definition.right,
    condition_schema: z.string(),
    initial_clustering: z.string(),
  }),
})
  .version({
    system: {
      mustache: {
        template: systemPromptTemplate,
      },
    },
    template: {
      mustache: {
        template: contentPromptTemplate,
      },
    },
    tools: {
      get_stream_features: {
        description:
          'Fetches entity features for this stream. Entity features identify services, applications, and logical components detected in the logs (e.g., API gateways, databases, microservices). Use this tool to understand what entities are present before designing partitions. Supports optional filtering by confidence and limit.',
        schema: {
          type: 'object',
          properties: {
            feature_types: {
              type: 'array',
              items: {
                type: 'string',
                enum: PARTITION_FEATURE_TOOL_TYPES,
              },
            },
            min_confidence: {
              type: 'number',
              minimum: 0,
              maximum: 100,
            },
            limit: {
              type: 'number',
              minimum: 1,
            },
          },
        },
      },
      partition_logs: {
        description: `Simulates the partioning conditions specified, and clusters documents within each partition.`,
        schema: {
          type: 'object',
          properties: {
            index: {
              type: 'string',
            },
            partitions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: {
                    type: 'string',
                  },
                  condition: {
                    type: 'object',
                    properties: {},
                  },
                },
                required: ['name', 'condition'],
              },
            },
          },
          required: ['index'],
        },
      } as const,
    },
  })
  .get();

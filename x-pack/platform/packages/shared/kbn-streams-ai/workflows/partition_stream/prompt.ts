/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { createPrompt } from '@kbn/inference-common';
import { Streams } from '@kbn/streams-schema';
import systemPromptTemplate from './system_prompt_template.txt';
import contentPromptTemplate from './content_prompt_template.txt';

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
      cluster_logs: {
        description: `Clusters sample documents based on the partioning conditions specified.`,
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

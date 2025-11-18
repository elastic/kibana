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
import { conditionSchema } from '../../json_schema/condition_schema';

const partitionToolSchema = {
  ...conditionSchema,
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
            description: 'The partitioning condition.',
            properties: {},
            additionalProperties: true,
          },
        },
        required: ['name', 'condition'],
      },
    },
  },
  required: ['index'],
} as const;

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
    temperature: 0.4,
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
      simulate_log_partitions: {
        description: `Simulates the partioning conditions specified, and clusters documents within each partition.`,
        schema: partitionToolSchema,
      },
      finalize_log_partitions: {
        description: `Finalizes the partioning conditions specified and suggests them to the user`,
        schema: partitionToolSchema,
      },
    },
  })
  .get();

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { createPrompt } from '@kbn/inference-common';
import { Streams } from '@kbn/streams-schema';
import promptTemplate from './prompt_template.md';

export const DescribeStreamPrompt = createPrompt({
  name: 'describe_stream_prompt',
  description: 'Describe stream based on sample data',
  input: z.object({
    stream: Streams.all.Definition.right,
    dataset_analysis: z.string(),
  }),
})
  .version({
    template: {
      mustache: {
        template: promptTemplate,
      },
    },
    tools: {
      describe_stream: {
        description: `Describe data in stream based on sampled data.`,
        schema: {
          type: 'object',
          properties: {
            description: {
              type: 'string',
            },
          },
          required: ['description'],
        },
      } as const,
    },
    toolChoice: {
      function: 'describe_stream',
    } as const,
  })
  .get();

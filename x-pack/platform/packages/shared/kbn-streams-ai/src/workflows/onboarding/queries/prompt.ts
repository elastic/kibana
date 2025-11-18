/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { createPrompt } from '@kbn/inference-common';
import systemPromptTemplate from './system_prompt.text';
import contentPromptTemplate from './content_prompt.text';

export const GenerateQueriesPrompt = createPrompt({
  name: 'generate_queries_prompt',
  description: 'Generate natural queries for a stream',
  input: z.object({
    stream: z.object({
      name: z.string(),
      description: z.string(),
    }),
    sample_data: z.string(),
    sample_documents: z.string(),
  }),
})
  .version({
    system: {
      mustache: {
        template: systemPromptTemplate,
      },
    },
    temperature: 0.5,
    template: {
      mustache: {
        template: contentPromptTemplate,
      },
    },
    tools: {
      suggest_queries: {
        description: `Suggest queries for the given Stream`,
        schema: {
          type: 'object',
          properties: {
            queries: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: {
                    type: 'string',
                  },
                  description: {
                    type: 'string',
                  },
                },
                required: ['title', 'description'],
              },
            },
          },
          required: ['queries'],
        },
      } as const,
    },
  })
  .get();

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { createPrompt } from '@kbn/inference-common';
import systemPromptTemplate from './system_prompt_template.md';
import contentPromptTemplate from './content_prompt_template.md';

export const GenerateProcessorsPrompt = createPrompt({
  name: 'generate_processors_prompt',
  description: 'Generate processors for a stream',
  input: z.object({
    stream: z.object({
      name: z.string(),
    }),
    sample_data: z.string(),
    sample_documents: z.string(),
    existing_processors: z.string(),
    processor_schema: z.string(),
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
      suggest_processors: {
        description: 'Suggest processors to append to the existing processors',
        schema: {
          type: 'object',
          properties: {
            processors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: {
                    type: 'string',
                    description: 'a short id to identify the processor',
                  },
                  config: {
                    type: 'object',
                    properties: {},
                  },
                },
                required: ['id', 'config'],
              },
            },
          },
          required: ['processors'],
        },
      } as const,
    },
  })
  .get();

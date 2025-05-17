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

export const GenerateMappingsPrompt = createPrompt({
  name: 'generate_mappings_prompt',
  description: 'Generate mappings based on data in a stream',
  input: z.object({
    stream: z.object({
      name: z.string(),
      description: z.string(),
    }),
    dataset_analysis: z.string(),
    suggested_queries: z.string(),
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
      suggest_mappings: {
        description: `Suggest mappings`,
        schema: {
          type: 'object',
          properties: {
            fields: {
              type: 'array',
              items: {
                type: 'object',
                description: 'refer to namedFieldDefinitionConfigSchema',
                properties: {},
              },
            },
          },
          required: ['fields'],
        },
      } as const,
    },
  })
  .get();

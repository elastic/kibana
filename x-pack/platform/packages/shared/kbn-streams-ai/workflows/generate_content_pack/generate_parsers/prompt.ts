/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { createPrompt } from '@kbn/inference-common';
import systemPromptTemplate from './system_prompt_template.txt';
import contentPromptTemplate from './content_prompt_template.txt';

export const GenerateParsersPrompt = createPrompt({
  name: 'generate_parsers_prompt',
  description: 'Generate parsers for a stream',
  input: z.object({
    stream: z.object({
      // the data stream name
      name: z.string(),
    }),
    // aggregated sample values
    sample_data: z.string(),
    // available GROK patterns
    // available_grok_patterns: z.string(),
    // the schema for the grok/dissect processors
    processor_schema: z.string(),
    // the messages, grouped by message structure, and sample messages per group
    grouped_messages: z.string(),
    // existing processors
    existing_processors: z.string(),
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
      suggest_parsing_rule: {
        description: 'Suggest parsing rules to add to the existing processors',
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
                    description: 'the schema for the processor. see `processor_schema`',
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { createPrompt } from '@kbn/inference-common';
import dedent from 'dedent';
import systemPromptTemplate from './system_prompt_template.txt';
import contentPromptTemplate from './content_prompt_template.txt';

export const DescribeFormatPrompt = createPrompt({
  name: 'describe_format_prompt',
  description: 'Describe the format of log messages',
  input: z.object({
    messages: z.string(),
    // suggested template
    suggested_template: z.string(),
  }),
})
  .version({
    temperature: 0.2,
    system: `Explain A) what system these log messages are from, B) what (standard?) format
        it is.
        
        A suggested template will be included. The template is a bit of a mix between regexes
        and grok. it's not a suggestion to use grok. digits have been replaced by 0 if the
        template part is of fixed length, otherwise you'll see \\d+. variable white-space is
        indicated by the literal string \\s+, otherwise any space is a single space. Describe
        the columns that you see, and separately mention possible columns that can be extracted
        from the details (usually defined as %{GREEDYDATA}). Clearly separate columns that are
        available in the suggested template and columns that you see in the remaining part of
        the message.
        `,
    template: {
      mustache: {
        template: dedent(`

        These are the messages. They're wrapped in backticks, and newline-separated,
        anything else is part of the message, including any characters at the
        or the end.
        
        This is the suggested template:
        \`{{{suggested_template}}}\`
        
        \`\`\`
        {{{messages}}}
        \`\`\`
        
        `),
      },
    },
  })
  .get();

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
    // description of the format
    format_description: z.string(),
    // suggested template
    suggested_template: z.string(),
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
    toolChoice: { function: 'suggest_pipeline' },
    temperature: 0.25,
    tools: {
      get_grok_documentation: {
        description: 'Get documentation and available patterns for Grok',
      },
      get_dissect_documentation: {
        description: 'Get dissect documentation',
      },
      suggest_pipeline: {
        description: 'Simulate pipeline of processors',
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

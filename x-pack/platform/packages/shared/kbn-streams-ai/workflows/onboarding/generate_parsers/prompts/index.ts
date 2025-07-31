/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { createPrompt } from '@kbn/inference-common';
import dedent from 'dedent';
import systemPromptTemplate from './system_prompt_template.text';
import contentPromptTemplate from './content_prompt_template.text';
import reviewFieldsPromptTemplate from './review_fields_prompt_template.text';

const getDescribePrompt = (id: string, system: string) =>
  createPrompt({
    name: id,
    description: 'Describe the format of log messages',
    input: z.object({
      stream: z.object({
        name: z.string(),
        description: z.string(),
      }),
      find_structure: z.object({
        grok_pattern: z.string(),
        timestamp_formats: z.string(),
      }),
      suggested_template: z.object({
        display: z.string(),
        grok: z.string(),
        values: z.string(),
      }),
      patterns: z.string(),
    }),
  })
    .version({
      temperature: 0.2,
      system: dedent(`Explain A) what system these log messages are from, B) what data is in
        these log messages, based on the samples.
        
        An extracted template will be included, with placeholder field names. For each
        placeholder field name, suggested a descriptive field name, with only 
        alphanumerical characters and underscores, ie [a-z0-9_]+, e.g. \`log_level\`. For the
        last GREEDYDATA column use \`message_details\`.
        
        Split up your response in "Description" and "Fields" sections.`),
      template: {
        mustache: {
          template: dedent(`

        ## Stream

        {{stream.name}}

        Description:

        {{{stream.description}}}

        ## Template
        - {{{suggested_template.display}}}

        ## Template as a grok pattern:
        - {{{suggested_template.grok}}}

        ## Example values from template
        {{{suggested_template.values}}}

        ## Results from _find_structure

        Detected grok pattern:
        - {{{find_structure.grok_pattern}}}

        Detected timestamp formats:
        {{{find_structure.timestamp_formats}}}

        ## Messages

        {{{patterns}}}
        
        `),
        },
      },
    })
    .get();

export const DescribeFormatGrokPrompt = getDescribePrompt(
  'describe_format_grok_prompt',
  dedent(`Based on this information, recommend grok patterns for processing the log messages.
    
  Generate one or two simple grok patterns that can be used to parse the main message,
  and separately suggestions for parsing out message_details. If either the template or
  results from _find_structure suggest patterns - use those, preferring the most specific
  ones.

  Swap out enums for their corresponding grok pattern definition, e.g. replace \`(FOO|BAR)\` with
  \`%{WORD}\`.`)
);

export const DescribeFormatDissectPrompt = getDescribePrompt(
  'describe_format_dissect_prompt',
  dedent(`Based on this information, recommend a _dissect_ pattern, as the template contains
  simple delimiters without variable whitespace. Use descriptive field names.`)
);

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

export const ReviewFieldsPrompt = createPrompt({
  name: 'review_fields_prompt',
  description: 'Review and map structured fields to ECS-compliant fields',
  input: z.object({
    /**
     * Raw log messages to pass to LLM
     */
    sample_messages: z.array(z.string()),
    /**
     * Fields to review (as JSON string)
     *
     * ```json
     * {
     *     "field_1": {
     *         "grok_component": "DAY",
     *         "example_values": ["Mon", "Tue", "Wed", "Thu", "Fri"]
     *     },
     *     "field_2": {
     *         "grok_component": "SYSLOGTIMESTAMP",
     *         "example_values": ["Jul 14 13:45:31", "Jul 14 13:45:30", "Jul 14 13:45:22", "Jul 14 13:45:21", "Jul 14 13:45:20"]
     *     },
     *     "field_3": {
     *         "grok_component": "INT",
     *         "example_values": ["2025"]
     *     },
     *     "field_4": {
     *         "grok_component": "LOGLEVEL",
     *         "example_values": ["error", "notice"]
     *     },
     *     "field_5": {
     *         "grok_component": "GREEDYDATA",
     *         "example_values": []
     *     }
     * }
     * ```
     */
    review_fields: z.string(),
  }),
})
  .version({
    template: {
      mustache: {
        template: reviewFieldsPromptTemplate,
      },
    },
    toolChoice: { function: 'validate_response_schema' as const },
    tools: {
      validate_response_schema: {
        description:
          'Validate the response schema to ensure the output adheres to the defined structure.',
        schema: {
          type: 'object',
          properties: {
            log_source: { type: 'string' },
            fields: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  ecs_field: { type: 'string' },
                  columns: { type: 'array', items: { type: 'string' } },
                  grok_components: { type: 'array', items: { type: 'string' } },
                },
                required: ['ecs_field', 'columns', 'grok_components'],
              },
            },
          },
          required: ['log_source', 'fields'],
        },
      } as const,
    },
  })
  .get();

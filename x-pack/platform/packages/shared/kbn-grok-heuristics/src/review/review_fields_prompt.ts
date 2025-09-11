/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { createPrompt } from '@kbn/inference-common';
import reviewFieldsPromptTemplate from './review_fields_prompt_template.text';

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

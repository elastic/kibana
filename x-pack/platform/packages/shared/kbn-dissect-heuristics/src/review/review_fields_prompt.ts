/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { createPrompt } from '@kbn/inference-common';
import reviewFieldsPromptTemplate from './review_fields_prompt_template.text';

export const ReviewDissectFieldsPrompt = createPrompt({
  name: 'review_dissect_fields_prompt',
  description: 'Review and map dissect-extracted fields to ECS-compliant fields',
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
     *         "example_values": ["192.168.1.1", "10.0.0.1", "172.16.0.1"],
     *         "position": 0
     *     },
     *     "field_2": {
     *         "example_values": ["GET", "POST", "PUT"],
     *         "position": 1
     *     },
     *     "field_3": {
     *         "example_values": ["/index.html", "/api/data", "/update"],
     *         "position": 2
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
                  join_strategy: {
                    type: 'string',
                    enum: ['append', 'skip'],
                    description:
                      'How to combine multiple columns: append (join with separator) or skip (discard subsequent fields)',
                  },
                  is_static: {
                    type: 'boolean',
                    description:
                      'If true, this field always has the same value and should be a literal in the pattern, not extracted as a field',
                  },
                  static_value: {
                    type: 'string',
                    description:
                      'The literal value to use in the pattern when is_static is true (e.g., "user" for key=value patterns)',
                  },
                },
                required: ['ecs_field', 'columns', 'join_strategy'],
              },
            },
          },
          required: ['log_source', 'fields'],
        },
      } as const,
    },
  })
  .get();

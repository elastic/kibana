/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPrompt } from '@kbn/inference-common';
import { z } from '@kbn/zod/v4';
import suggestionsSystemPrompt from './system_prompt.text';
import suggestionsUserPrompt from './user_prompt.text';

export const SUBMIT_SUGGESTIONS_TOOL_NAME = 'submit_suggestions';

export const StreamSuggestionsPrompt = createPrompt({
  name: 'stream_suggestions',
  input: z.object({
    name: z.string(),
    description: z.string(),
    stream_type: z.string(),
    already_partitioned: z.string(),
    degraded_docs_pct: z.string(),
    dataset_analysis: z.string(),
    log_patterns: z.string(),
  }),
})
  .version({
    system: {
      mustache: {
        template: suggestionsSystemPrompt,
      },
    },
    template: {
      mustache: {
        template: suggestionsUserPrompt,
      },
    },
    tools: {
      [SUBMIT_SUGGESTIONS_TOOL_NAME]: {
        description: 'Submit operational improvement suggestions for the stream',
        schema: {
          type: 'object',
          properties: {
            suggestions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: {
                    type: 'string',
                    enum: [
                      'improve_parsing',
                      'partition_stream',
                      'attach_dashboard',
                      'reduce_log_volume',
                    ],
                    description: 'The category of this suggestion.',
                  },
                  title: {
                    type: 'string',
                    description: 'Short action-oriented title (≤ 8 words).',
                  },
                  description: {
                    type: 'string',
                    description:
                      'One to three sentences describing the issue and the benefit of acting on it, specific to this stream.',
                  },
                },
                required: ['type', 'title', 'description'],
              },
            },
          },
          required: ['suggestions'],
        },
      },
    },
    toolChoice: { function: SUBMIT_SUGGESTIONS_TOOL_NAME },
  })
  .get();

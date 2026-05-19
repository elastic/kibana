/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { createPrompt } from '@kbn/inference-common';
import { Streams } from '@kbn/streams-schema';
import systemPromptTemplate from './system_prompt.text';
import taskPromptTemplate from './task_prompt.text';

export const SuggestIngestPipelinePrompt = createPrompt({
  name: 'suggest_ingest_pipeline_prompt',
  description: 'Suggest ingest pipeline based on stream analysis',
  input: z.object({
    stream: Streams.all.Definition.right,
    pipeline_schema: z.string(),
    fields_schema: z.string(),
    content_field: z.string(),
    severity_field: z.string(),
    /** JSON summary of sample document structure (fields, example values, schema hints) */
    initial_dataset_analysis: z.string(),
    /**
     * When set, explains an upstream grok/dissect step already applied before these samples.
     * Empty when the agent may propose grok/dissect (full pipeline schema).
     */
    upstream_extraction_context: z.string(),
    /** Conditional field examples for ECS or OTel, injected into system prompt based on stream type */
    field_examples: z.string(),
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
        template: taskPromptTemplate,
      },
    },
    tools: {
      simulate_pipeline: {
        description:
          'Test your pipeline against sample data. Use this iteratively: simulate → read errors → fix → simulate again. Returns validation errors and simulation metrics. Keep calling until errors are resolved.',
        schema: {
          type: 'object',
          properties: {
            pipeline: {
              type: 'object',
              description:
                'The pipeline definition object containing processing steps. Always include `steps` (array of processors). For a first candidate with no processors yet, use { "steps": [] }; never send {}.',
              properties: {
                steps: {
                  type: 'array',
                  description:
                    'Ordered list of processors that transform documents. Shapes must match the Pipeline schema in the system prompt.',
                },
              },
              required: ['steps'],
            },
          },
          required: ['pipeline'],
        },
      },
      commit_pipeline: {
        description:
          'Finalize the pipeline after simulation passes (valid: true) and all temporary fields are cleaned up. Only commit { "steps": [] } after verifying the Inspection checklist in the system prompt—all five checks must pass.',
        schema: {
          type: 'object',
          properties: {
            pipeline: {
              type: 'object',
              description:
                'The pipeline definition object containing processing steps. Use { "steps": [] } if no processing is needed.',
              properties: {
                steps: {
                  type: 'array',
                  description:
                    'Ordered list of processors that transform documents. Shapes must match the Pipeline schema in the system prompt.',
                },
              },
              required: ['steps'],
            },
          },
          required: ['pipeline'],
        },
      },
    } as const,
  })
  .get();

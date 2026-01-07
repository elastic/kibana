/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
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
    parsing_processor: z.string().optional(),
    initial_dataset_analysis: z.string(),
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
          'Simulate a complete ingest pipeline design with processors, stages, and routing rules. The tool first validates structural integrity and schema compliance. If validation passes, it then automatically simulates the pipeline against the entire data stream to validate parsing coverage, field extraction, error rates, and type correctness. Returns validation results and simulation results with detailed metrics.',
        schema: {
          type: 'object',
          properties: {
            pipeline: {
              type: 'object',
              description: 'The pipeline definition object containing processing steps',
              properties: {},
            },
          },
          required: ['pipeline'],
        },
      },
      commit_pipeline: {
        description:
          'Finalize and commit the validated pipeline. Call this after successful validation when the pipeline meets all acceptance criteria.',
        schema: {
          type: 'object',
          properties: {
            pipeline: {
              type: 'object',
              description: 'The pipeline definition object containing processing steps',
              properties: {},
            },
          },
          required: ['pipeline'],
        },
      },
    } as const,
  })
  .get();

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
          'Test your pipeline against sample data. Use this iteratively: simulate → read errors → fix → simulate again. Returns validation errors and simulation metrics. Keep calling until errors are resolved.',
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
          'Finalize the pipeline after simulate_pipeline passes with acceptable metrics. Only call this when your eval/dev loop is complete.',
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

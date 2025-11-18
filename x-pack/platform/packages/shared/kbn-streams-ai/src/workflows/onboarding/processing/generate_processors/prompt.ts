/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { createPrompt } from '@kbn/inference-common';
import systemPromptTemplate from './system_prompt.text';
import contentPromptTemplate from './content_prompt.text';
import { processingTools } from '../tools';

export const GenerateProcessorsPrompt = createPrompt({
  name: 'generate_processors_prompt',
  description: 'Generate processors for a stream',
  input: z.object({
    stream: z.object({
      name: z.string(),
      description: z.string(),
    }),
    pattern_analysis: z.string(),
    sample_data: z.string(),
    sample_documents: z.string(),
    existing_processors: z.string(),
    processor_schema: z.string(),
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
    tools: processingTools,
  })
  .get();

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createPrompt } from '@kbn/inference-common';
import { z } from '@kbn/zod';
import systemPromptTemplate from './data_for_semantic_search_system_prompt.text';
import userPromptTemplate from './data_for_semantic_search_user_prompt.text';

export const GenerateDataForSemanticSearchPrompt = createPrompt({
  name: 'generate_data_for_semantic_search',
  input: z.object({
    stream_name: z.string(),
    dataset_analysis: z.string(),
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
        template: userPromptTemplate,
      },
    },
  })
  .get();

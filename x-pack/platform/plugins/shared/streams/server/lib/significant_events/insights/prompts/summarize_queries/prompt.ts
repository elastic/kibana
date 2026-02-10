/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPrompt } from '@kbn/inference-common';
import { z } from '@kbn/zod';
import systemPromptTemplate from './system_prompt.text';
import userPromptTemplate from './user_prompt.text';
import { insightsSchema, SUBMIT_INSIGHTS_TOOL_NAME } from '../../schema';

export const SummarizeQueriesPrompt = createPrompt({
  name: 'summarize_queries',
  input: z.object({
    streamName: z.string(),
    queries: z.string(),
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
    tools: {
      [SUBMIT_INSIGHTS_TOOL_NAME]: {
        description: 'Submit the identified insights for this stream',
        schema: insightsSchema,
      },
    },
    toolChoice: { function: SUBMIT_INSIGHTS_TOOL_NAME },
  })
  .get();

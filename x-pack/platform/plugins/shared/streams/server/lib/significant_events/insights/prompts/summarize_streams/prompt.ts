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

export const SummarizeStreamsPrompt = createPrompt({
  name: 'summarize_streams',
  input: z.object({
    streamInsights: z.string(),
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
        description: 'Submit system-level insights correlating across streams',
        schema: insightsSchema,
      },
    },
    toolChoice: { function: SUBMIT_INSIGHTS_TOOL_NAME },
  })
  .get();

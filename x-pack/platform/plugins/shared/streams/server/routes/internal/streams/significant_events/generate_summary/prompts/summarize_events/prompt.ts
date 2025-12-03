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

export const SummarizeEventsPrompt = createPrompt({
  name: 'summarize_events',
  input: z.object({
    streamName: z.string(),
    queryTitle: z.string(),
    queryKql: z.string(),
    events: z.string(),
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

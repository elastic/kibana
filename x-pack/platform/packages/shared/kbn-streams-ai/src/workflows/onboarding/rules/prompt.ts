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
import { ruleTools } from './tools';

export const GenerateRulesPrompt = createPrompt({
  name: 'generate_rules_prompt',
  description: 'Generate ES|QL alerting rules for a stream',
  input: z.object({
    stream: z.object({
      name: z.string(),
      description: z.string(),
    }),
    sample_data: z.string(),
    queries: z.string(),
    existing_rules: z.string(),
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
    tools: ruleTools,
  })
  .get();

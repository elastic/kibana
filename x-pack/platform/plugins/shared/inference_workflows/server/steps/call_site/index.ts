/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StepCategory } from '@kbn/workflows';
import { z } from '@kbn/zod/v4';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';

const inputSchema = z.object({
  system: z.string().optional().describe('System prompt to pass to the LLM'),
  messages: z.array(z.unknown()).describe('Messages array to pass to the LLM'),
});

const outputSchema = z.object({
  response: z.string().describe('Assembled LLM response text'),
});

/**
 * Safety-net server handler for call_site.proceed.
 * The executor short-circuits before this handler is ever called — if it is
 * reached, the step is running outside an aroundCompletion hook with a proceedFn
 * capability, which is a configuration error.
 */
export const callSiteProceedStepDefinition = createServerStepDefinition({
  id: 'call_site.proceed',
  label: 'Proceed with LLM call',
  description:
    'Suspends the workflow, performs the wrapped LLM call, and resumes with the response.',
  category: StepCategory.Ai,
  inputSchema,
  outputSchema,
  handler: async () => {
    throw new Error(
      '[call_site.proceed] This step must run inside an inference.aroundCompletion hook ' +
        'with a proceedFn capability. The executor should have short-circuited before reaching this handler.'
    );
  },
});

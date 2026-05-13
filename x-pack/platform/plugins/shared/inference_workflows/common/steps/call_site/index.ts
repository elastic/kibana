/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { StepCategory } from '@kbn/workflows';
import type { BaseStepDefinition } from '@kbn/workflows';
import { z } from '@kbn/zod/v4';

export const CallSiteProceedInputSchema = z.object({
  system: z.string().optional().describe('System prompt to pass to the LLM'),
  messages: z.array(z.unknown()).describe('Messages array to pass to the LLM'),
});

export const CallSiteProceedOutputSchema = z.object({
  response: z.string().describe('Assembled LLM response text'),
});

export type CallSiteProceedInputSchemaType = typeof CallSiteProceedInputSchema;
export type CallSiteProceedOutputSchemaType = typeof CallSiteProceedOutputSchema;

export const CallSiteProceedStepCommonDefinition: BaseStepDefinition<
  CallSiteProceedInputSchemaType,
  CallSiteProceedOutputSchemaType
> = {
  id: 'call_site.proceed',
  category: StepCategory.Ai,
  label: i18n.translate('inferenceWorkflows.steps.callSiteProceed.label', {
    defaultMessage: 'Proceed with LLM call',
  }),
  description: i18n.translate('inferenceWorkflows.steps.callSiteProceed.description', {
    defaultMessage:
      'Suspends the workflow, performs the wrapped LLM call, and resumes with the response.',
  }),
  documentation: {
    details: i18n.translate('inferenceWorkflows.steps.callSiteProceed.documentation.details', {
      defaultMessage:
        'Opt-in step for the inference.aroundCompletion trigger. When present, the workflow suspends here, the LLM call is made (buffered, not streamed), and execution resumes with the response available as steps.<name>.output.response. Post-processing steps (e.g. transform.pii_restore) can then run against the response. Omitting this step preserves the default streaming path where Kibana performs the LLM call and token restoration automatically.',
    }),
    examples: [
      `## Full AOP lifecycle with PII anonymization
\`\`\`yaml
- name: anonymize_messages
  type: ai.pii
  with:
    sessionId: '{{ event.sessionId }}'
    input: '\${{ event.messages }}'
    entities: [IP, EMAIL, HOST_NAME]

- name: proceed
  type: call_site.proceed
  with:
    system: '{{ event.system }}'
    messages: '\${{ steps.anonymize_messages.output.output }}'

- name: restore
  type: transform.pii_restore
  with:
    sessionId: '{{ event.sessionId }}'
    input: '{{ steps.proceed.output.response }}'
\`\`\``,
    ],
  },
  inputSchema: CallSiteProceedInputSchema,
  outputSchema: CallSiteProceedOutputSchema,
};

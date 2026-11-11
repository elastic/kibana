/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { i18n } from '@kbn/i18n';
import { aiIndexIdSchema } from './ki';

export const GET_DREAMING_STATUS_STEP_ID = 'context-engine.getDreamingStatus' as const;

export const getDreamingStatusInputSchema = lazySchema(() =>
  z.object({
    ai_index_id: aiIndexIdSchema,
    source: z
      .enum(['memories', 'traces'])
      .optional()
      .describe(
        'What the run dreams on: memories (the default), or the traces configured on the AI index, which also need a trace source'
      ),
  })
);

export const getDreamingStatusOutputSchema = lazySchema(() =>
  z.object({
    dream: z.boolean().describe('Whether this run should dream'),
    reason: z.string().optional().describe('Why it should not, when `dream` is false'),
  })
);

export type GetDreamingStatusOutput = z.infer<typeof getDreamingStatusOutputSchema>;

export const getDreamingStatusStepCommonDefinition: CommonStepDefinition<
  typeof getDreamingStatusInputSchema,
  typeof getDreamingStatusOutputSchema
> = {
  id: GET_DREAMING_STATUS_STEP_ID,
  label: i18n.translate('xpack.contextEngine.workflows.steps.getDreamingStatus.label', {
    defaultMessage: 'Get dreaming status',
  }),
  description: i18n.translate('xpack.contextEngine.workflows.steps.getDreamingStatus.description', {
    defaultMessage: 'Check whether an AI index should dream now.',
  }),
  category: StepCategory.Kibana,
  stability: 'tech_preview',
  inputSchema: getDreamingStatusInputSchema,
  outputSchema: getDreamingStatusOutputSchema,
  documentation: {
    details: i18n.translate(
      'xpack.contextEngine.workflows.steps.getDreamingStatus.documentation.details',
      {
        defaultMessage:
          'Returns dream: false, with a reason, when Context Engine is off in the space, the ' +
          'global Context Engine memory setting is off, or the AI index no longer has dreaming ' +
          'turned on. With source traces, also when the AI index has no trace sources. A dreaming ' +
          'run checks it first, so turning memory off stops scheduled runs before they read ' +
          'memories or call a model.',
      }
    ),
  },
};

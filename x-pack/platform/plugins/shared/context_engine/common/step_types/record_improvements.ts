/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { i18n } from '@kbn/i18n';
import { MAX_IMPROVEMENTS_PER_RUN } from '../constants';
import { aiIndexIdSchema } from './ki';

export const RECORD_IMPROVEMENTS_STEP_ID = 'context-engine.recordImprovements' as const;

/**
 * Bound on the proposals one step may carry, not the policy. The policy cap is applied per
 * proposal by the handler, which reports a reason per proposal rather than failing the step.
 */
const MAX_IMPROVEMENTS_PER_REQUEST = 200;

export const recordImprovementsInputSchema = z.object({
  ai_index_id: aiIndexIdSchema.describe('The AI index these improvements are proposed for'),
  agent_run_id: z
    .string()
    .min(1)
    .max(1024)
    .describe('The workflow execution that produced these proposals'),
  signal_window: z
    .object({ from: z.string().min(1).max(256), to: z.string().min(1).max(256) })
    .describe('The window the signals were read from, echoed from the context step'),
  signal_spaces: z
    .array(z.string().min(1).max(1024))
    .max(1000)
    .default([])
    .describe('The spaces the signals came from, echoed from the context step'),
  conversation_id: z
    .string()
    .min(1)
    .max(1024)
    .optional()
    .describe(
      "The conversation the run analyzed in, echoed from the context step. Marks the run finished on the AI index. Omit it and the run stays marked as in flight until it ages out, so pass it whenever the context step's value is available."
    ),
  // Validated per item against the agent output contract by the handler, which reports a reason
  // per proposal. Bounded here only so the step input cannot grow without limit.
  improvements: z
    .array(z.unknown())
    .max(MAX_IMPROVEMENTS_PER_REQUEST)
    .default([])
    .describe('What the run proposed, straight off the agent'),
});

export const recordImprovementsOutputSchema = z.object({
  recorded: z
    .array(
      z.object({
        improvement_id: z.string(),
        action: z.string(),
        title: z.string(),
      })
    )
    .describe('The proposals that became revisions, with the ids the server derived for them'),
  skipped: z
    .array(
      z.object({
        action: z.string().optional(),
        title: z.string().optional(),
        reason: z.string(),
        detail: z.string().optional(),
      })
    )
    .describe('The proposals that were not recorded, each with why'),
});

export const recordImprovementsStepCommonDefinition: CommonStepDefinition<
  typeof recordImprovementsInputSchema,
  typeof recordImprovementsOutputSchema
> = {
  id: RECORD_IMPROVEMENTS_STEP_ID,
  label: i18n.translate('xpack.contextEngine.workflows.steps.recordImprovements.label', {
    defaultMessage: 'Record proposed improvements',
  }),
  description: i18n.translate(
    'xpack.contextEngine.workflows.steps.recordImprovements.description',
    {
      defaultMessage: 'Record what a Context Engine feedback analysis run proposed.',
    }
  ),
  category: StepCategory.Kibana,
  stability: 'tech_preview',
  inputSchema: recordImprovementsInputSchema,
  outputSchema: recordImprovementsOutputSchema,
  documentation: {
    details: i18n.translate(
      'xpack.contextEngine.workflows.steps.recordImprovements.documentation.details',
      {
        defaultMessage:
          "Appends a revision per proposal to the improvements store. The server derives each improvement's identity, so re-analyzing the same latent problem appends a revision rather than creating a duplicate. Proposals outside the AI index's allowed_actions are rejected, as are malformed ones — each comes back in skipped with a reason instead of failing the step, because a scheduled run has no one to retry it. A run may record at most {maxImprovements} improvements.",
        values: { maxImprovements: MAX_IMPROVEMENTS_PER_RUN },
      }
    ),
    examples: [
      `## Record what the agent proposed
\`\`\`yaml
- name: record_improvements
  type: ${RECORD_IMPROVEMENTS_STEP_ID}
  with:
    ai_index_id: "my-ai-index"
    agent_run_id: "{{ execution.id }}"
    signal_window: "\${{ steps.fetch_context.output.signal_window }}"
    signal_spaces: "\${{ steps.fetch_context.output.signal_spaces }}"
    improvements: "\${{ steps.run_analysis_agent.output.structured_output.improvements }}"
\`\`\``,
    ],
  },
};

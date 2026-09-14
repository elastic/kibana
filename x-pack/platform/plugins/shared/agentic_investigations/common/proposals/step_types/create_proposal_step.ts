/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { BaseStepDefinition } from '@kbn/workflows';
import { StepCategory } from '@kbn/workflows';
import { z } from '@kbn/zod/v4';
import { proposalConfidenceSchema, proposalImpactSchema, proposalOriginSchema } from '../proposal';
import { optionalStepInput } from './optional_step_input';

export const CreateProposalStepId = 'investigations.createProposal' as const;

export const createProposalStepInputSchema = z.object({
  conversationId: z.string().describe('Conversation this proposal belongs to.'),
  comment: z
    .string()
    .describe(
      'Explains what is being proposed, rendered as markdown. Required: a proposal a human cannot read is not reviewable.'
    ),
  actionWorkflowId: optionalStepInput(z.string()).describe(
    'Managed action workflow to run once approved. Omit for a non-action proposal.'
  ),
  actionInput: optionalStepInput(z.record(z.string(), z.unknown())).describe(
    'Inputs passed to the action workflow.'
  ),
  impact: optionalStepInput(proposalImpactSchema).describe('Impact snapshotted at creation.'),
  confidence: optionalStepInput(proposalConfidenceSchema).describe(
    'Confidence in the recommendation.'
  ),
  origin: optionalStepInput(proposalOriginSchema).describe(
    'Whether a worker or an analyst proposed this.'
  ),
  expiresIn: optionalStepInput(z.string()).describe(
    'How long the analyst has to decide, as a duration like `24h`. Resolved to an absolute deadline at creation.'
  ),
});

export const createProposalStepOutputSchema = z.object({
  proposalId: z.string(),
  status: z.string(),
  /** Comes from the action's metadata, so absent on a proposal with no action. */
  category: z.string().optional(),
  /** True when the proposal still needs a human decision. */
  requiresDecision: z.boolean(),
});

export const createProposalStepCommonDefinition: BaseStepDefinition<
  typeof createProposalStepInputSchema,
  typeof createProposalStepOutputSchema
> = {
  id: CreateProposalStepId,
  label: i18n.translate('xpack.agenticInvestigations.steps.createProposal.label', {
    defaultMessage: 'Create investigation proposal',
  }),
  description: i18n.translate('xpack.agenticInvestigations.steps.createProposal.description', {
    defaultMessage:
      'Creates a proposal record for a human to approve or dismiss, optionally carrying an executable action.',
  }),
  category: StepCategory.Kibana,
  inputSchema: createProposalStepInputSchema,
  outputSchema: createProposalStepOutputSchema,
  documentation: {
    details: i18n.translate(
      'xpack.agenticInvestigations.steps.createProposal.documentation.details',
      {
        defaultMessage:
          'Writes a pending proposal and returns its id. The current workflow execution is recorded on the proposal, so approving it resumes this execution. Category and other display metadata are resolved from the action workflow definition.',
      }
    ),
    examples: [
      `- name: create_proposal
  type: investigations.createProposal
  with:
    conversationId: "{{ inputs.conversationId }}"
    comment: "Tune the noisy rule that produced this alert"
    actionWorkflowId: "{{ inputs.actionWorkflowId }}"
    actionInput: "{{ inputs.actionInput }}"
    impact: low
    confidence: medium`,
    ],
  },
};

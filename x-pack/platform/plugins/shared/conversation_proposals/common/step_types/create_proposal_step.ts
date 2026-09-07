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

export const CreateProposalStepId = 'proposals.create' as const;

export const createProposalStepInputSchema = z.object({
  conversationId: z.string().describe('Conversation this proposal belongs to.'),
  comment: z
    .string()
    .optional()
    .describe('Explains what is being proposed. The only content a non-action proposal carries.'),
  actionWorkflowId: z
    .string()
    .optional()
    .describe('Managed action workflow to run once approved. Omit for a non-action proposal.'),
  actionInput: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Inputs passed to the action workflow.'),
  impact: proposalImpactSchema.optional().describe('Impact snapshotted at creation.'),
  confidence: proposalConfidenceSchema.optional().describe('Confidence in the recommendation.'),
  targetEntities: z
    .array(z.string())
    .optional()
    .describe('Typed entity references, e.g. `host.name:web-01`, used by the queue filter.'),
  origin: proposalOriginSchema.optional().describe('Whether a worker or an analyst proposed this.'),
  expiresAt: z.string().optional().describe('ISO 8601 decision deadline.'),
  supersedesProposalId: z
    .string()
    .optional()
    .describe('Proposal this one replaces, when an action was changed rather than tuned.'),
});

export const createProposalStepOutputSchema = z.object({
  proposalId: z.string(),
  status: z.string(),
  category: z.string(),
  /** True when autonomy is not consulted here — the caller decides whether to gate. */
  requiresDecision: z.boolean(),
});

export const createProposalStepCommonDefinition: BaseStepDefinition<
  typeof createProposalStepInputSchema,
  typeof createProposalStepOutputSchema
> = {
  id: CreateProposalStepId,
  label: i18n.translate('xpack.conversationProposals.steps.createProposal.label', {
    defaultMessage: 'Create conversation proposal',
  }),
  description: i18n.translate('xpack.conversationProposals.steps.createProposal.description', {
    defaultMessage:
      'Creates a proposal record for a human to approve or dismiss, optionally carrying an executable action.',
  }),
  category: StepCategory.Kibana,
  inputSchema: createProposalStepInputSchema,
  outputSchema: createProposalStepOutputSchema,
  documentation: {
    details: i18n.translate(
      'xpack.conversationProposals.steps.createProposal.documentation.details',
      {
        defaultMessage:
          'Writes a pending proposal and returns its id. The current workflow execution is recorded on the proposal, so approving it resumes this execution. Category and other display metadata are resolved from the action workflow definition.',
      }
    ),
    examples: [
      `- name: create_proposal
  type: proposals.create
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

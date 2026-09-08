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
  comment: optionalStepInput(z.string()).describe(
    'Explains what is being proposed. The only content a non-action proposal carries.'
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
  targetEntities: optionalStepInput(z.array(z.string())).describe(
    'Typed entity references, e.g. `host.name:web-01`, used by the queue filter.'
  ),
  origin: optionalStepInput(proposalOriginSchema).describe(
    'Whether a worker or an analyst proposed this.'
  ),
  expiresAt: optionalStepInput(z.string()).describe('ISO 8601 decision deadline.'),
  supersedesProposalId: optionalStepInput(z.string()).describe(
    'Proposal this one replaces, when an action was changed rather than tuned.'
  ),
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

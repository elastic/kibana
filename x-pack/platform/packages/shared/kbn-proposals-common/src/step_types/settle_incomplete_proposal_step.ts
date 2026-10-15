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
import { proposalDecisionSchema, proposalStatusSchema } from '../proposal';
import { optionalStepInput } from './optional_step_input';

export const SettleIncompleteProposalStepId = 'proposals.settleIncompleteProposal' as const;

/**
 * Terminal statuses this step may write. `failed` and `expired` are the only
 * outcomes of an incomplete settle — not a human decision and not an action
 * success.
 */
export const settleIncompleteProposalStatusSchema = proposalStatusSchema.extract([
  'failed',
  'expired',
]);

export const settleIncompleteProposalStepInputSchema = z.object({
  proposalId: z.string().describe('Any proposal in the chain — the live head is resolved first.'),
  status: optionalStepInput(settleIncompleteProposalStatusSchema).describe(
    'Terminal status to write. Omit to choose from the record: failed when already decided, expired when not.'
  ),
  executionError: optionalStepInput(z.string()).describe(
    'Why the proposal is being settled without a completed decision loop.'
  ),
});

export const settleIncompleteProposalStepOutputSchema = z.object({
  proposalId: z.string().describe('The live revision that was settled.'),
  status: settleIncompleteProposalStatusSchema,
  decision: proposalDecisionSchema.optional(),
});

export const settleIncompleteProposalStepCommonDefinition: BaseStepDefinition<
  typeof settleIncompleteProposalStepInputSchema,
  typeof settleIncompleteProposalStepOutputSchema
> = {
  id: SettleIncompleteProposalStepId,
  label: i18n.translate('xpack.proposals.steps.settleIncompleteProposal.label', {
    defaultMessage: 'Settle incomplete proposal',
  }),
  description: i18n.translate('xpack.proposals.steps.settleIncompleteProposal.description', {
    defaultMessage:
      'Settles a proposal that did not complete its decision loop — gate expiry, attempt-budget exhaustion, or a workflow-level failure.',
  }),
  category: StepCategory.Kibana,
  stability: 'beta',
  inputSchema: settleIncompleteProposalStepInputSchema,
  outputSchema: settleIncompleteProposalStepOutputSchema,
  documentation: {
    details: i18n.translate(
      'xpack.proposals.steps.settleIncompleteProposal.documentation.details',
      {
        defaultMessage:
          "Adopts the live revision, then writes a terminal status without checking manage_proposals. Use it from paths that may run under a denied resumer's API key (gate timeout, attempt-budget exhaustion, workflow-level on-failure) where updateProposal would fail the settle. Pass status explicitly when the outcome is known (expired for a timed-out gate); omit it to discriminate — failed when the record already has a decision, expired when it does not. Cross-step Liquid references inside a workflow-level fallback are renamed by the engine, so keep this as a single step rather than a get-then-update chain.",
      }
    ),
    examples: [
      `- name: record_gate_expiry
  type: proposals.settleIncompleteProposal
  with:
    proposalId: "{{ variables.current_proposal_id }}"
    status: expired
    executionError: "{{ variables.gate_error }}"`,
      `- name: settle_on_failure
  type: proposals.settleIncompleteProposal
  if: '\${{ variables.current_proposal_id != blank }}'
  with:
    proposalId: "{{ variables.current_proposal_id }}"
    executionError: "{{ error.message }}"`,
    ],
  },
};

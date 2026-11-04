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
import { dismissReasonSchema, proposalDecisionSchema, proposalStatusSchema } from '../proposal';
import { optionalStepInput } from './optional_step_input';

export const UpdateProposalStepId = 'proposals.updateProposal' as const;

export const updateProposalStepInputSchema = z.object({
  proposalId: z.string().describe('Proposal to update.'),
  // Both vocabularies are extracted from the stored schemas so they cannot
  // drift. `pending` is absent because nothing ever moves a proposal back to
  // awaiting.
  status: optionalStepInput(
    proposalStatusSchema.extract(['executing', 'succeeded', 'failed', 'expired', 'no_action'])
  ).describe('Terminal or in-flight outcome to record against the proposal.'),
  decision: optionalStepInput(proposalDecisionSchema).describe(
    'What the human concluded. Write-once: a proposal that already carries a decision rejects another.'
  ),
  decidedBy: optionalStepInput(z.string()).describe(
    'Username of the approver, used only when the execution itself yields no identity.'
  ),
  dismissReason: optionalStepInput(dismissReasonSchema).describe(
    'Structured reason, when the decision is a dismissal.'
  ),
  rationale: optionalStepInput(z.string()).describe('Free-text explanation of the decision.'),
  executionError: optionalStepInput(z.string()).describe('Failure detail, when the action failed.'),
});

export const updateProposalStepOutputSchema = z.object({
  proposalId: z.string(),
  // Extracted from the stored schemas for the same reason the inputs are: a
  // bare string would let the two vocabularies drift.
  status: proposalStatusSchema,
  decision: proposalDecisionSchema.optional(),
});

export const updateProposalStepCommonDefinition: BaseStepDefinition<
  typeof updateProposalStepInputSchema,
  typeof updateProposalStepOutputSchema
> = {
  id: UpdateProposalStepId,
  label: i18n.translate('xpack.proposals.steps.updateProposal.label', {
    defaultMessage: 'Update proposal',
  }),
  description: i18n.translate('xpack.proposals.steps.updateProposal.description', {
    defaultMessage: 'Records a decision on a proposal, or advances its status.',
  }),
  category: StepCategory.Kibana,
  stability: 'beta',
  inputSchema: updateProposalStepInputSchema,
  outputSchema: updateProposalStepOutputSchema,
  documentation: {
    details: i18n.translate('xpack.proposals.steps.updateProposal.documentation.details', {
      defaultMessage:
        'The only writer of a proposal decision: placed behind a human gate, it records the approval or dismissal for every resume surface at once. Also advances a proposal through its execution states — call it from an on-failure handler too, otherwise a gate that times out leaves the proposal awaiting forever. A settled status cannot be moved again and a decision cannot be overwritten, so a late handler can never rewrite an outcome.',
    }),
    examples: [
      // The status belongs in the same call: `approved` on its own would leave
      // the record at `pending`, which is not a pair the service accepts.
      `- name: record_approval
  type: proposals.updateProposal
  with:
    proposalId: "{{ variables.current_proposal_id }}"
    decision: approved
    decidedBy: "{{ variables.decided_by }}"
    status: executing`,
      `- name: record_success
  type: proposals.updateProposal
  with:
    proposalId: "{{ variables.current_proposal_id }}"
    status: succeeded`,
    ],
  },
};

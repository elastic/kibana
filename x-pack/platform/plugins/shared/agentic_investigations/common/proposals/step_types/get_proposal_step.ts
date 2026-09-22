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
import {
  dismissReasonSchema,
  MAX_RATIONALE_LENGTH,
  proposalDecisionSchema,
  proposalStatusSchema,
  proposalUserSchema,
} from '../proposal';

export const GetProposalStepId = 'proposals.getProposal' as const;

export const getProposalStepInputSchema = z.object({
  proposalId: z.string().describe('Proposal to read.'),
});

/** Only the fields a gating workflow branches on; not the whole record. */
export const getProposalStepOutputSchema = z.object({
  // Extracted from the stored schemas so the two vocabularies cannot drift.
  status: proposalStatusSchema,
  decision: proposalDecisionSchema.optional(),
  decidedBy: proposalUserSchema.optional(),
  supersededBy: z.string().optional(),
  expiresAt: z.string().optional(),
  actionWorkflowId: z.string().optional(),
  /** Set only when the proposal was dismissed; absent on approved proposals. */
  dismissReason: dismissReasonSchema.optional(),
  /** Analyst-supplied rationale for the dismiss decision. */
  rationale: z.string().max(MAX_RATIONALE_LENGTH).optional(),
});

export const getProposalStepCommonDefinition: BaseStepDefinition<
  typeof getProposalStepInputSchema,
  typeof getProposalStepOutputSchema
> = {
  id: GetProposalStepId,
  label: i18n.translate('xpack.agenticInvestigations.steps.getProposal.label', {
    defaultMessage: 'Read proposal',
  }),
  description: i18n.translate('xpack.agenticInvestigations.steps.getProposal.description', {
    defaultMessage: 'Reads the fields a gating workflow branches on.',
  }),
  category: StepCategory.Kibana,
  stability: 'beta',
  inputSchema: getProposalStepInputSchema,
  outputSchema: getProposalStepOutputSchema,
  documentation: {
    details: i18n.translate('xpack.agenticInvestigations.steps.getProposal.documentation.details', {
      defaultMessage:
        'Re-reads a proposal mid-workflow, for the cases where the record changed under a parked gate: a decision recorded elsewhere, or a supersession pointing at the proposal that replaced this one. On dismissed proposals the output includes dismissReason (a closed enum) and rationale (analyst free text, absent if not supplied).',
    }),
    examples: [
      `- name: read_proposal
  type: proposals.getProposal
  with:
    proposalId: "{{ variables.current_proposal_id }}"`,
      `# Branch on dismissReason after a rejected proposal gate:
- name: map_dismiss_reason_to_tag
  type: data.set
  with:
    dismissed_tag: >-
      {% if steps.read_proposal.output.dismissReason == 'wrong' %}az:true_positive{% else %}az:inconclusive{% endif %}`,
    ],
  },
};

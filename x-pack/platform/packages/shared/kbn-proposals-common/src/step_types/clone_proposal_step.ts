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
import { optionalStepInput } from './optional_step_input';

export const CloneProposalStepId = 'proposals.cloneProposal' as const;

export const cloneProposalStepInputSchema = z.object({
  proposalId: z.string().describe('Proposal to supersede.'),
  executionError: optionalStepInput(z.string()).describe(
    'Why the original failed, recorded on it alongside the supersession.'
  ),
});

export const cloneProposalStepOutputSchema = z.object({
  /** The new proposal. The original now points at it via `supersededBy`. */
  proposalId: z.string(),
});

export const cloneProposalStepCommonDefinition: BaseStepDefinition<
  typeof cloneProposalStepInputSchema,
  typeof cloneProposalStepOutputSchema
> = {
  id: CloneProposalStepId,
  label: i18n.translate('xpack.proposals.steps.cloneProposal.label', {
    defaultMessage: 'Clone proposal',
  }),
  description: i18n.translate('xpack.proposals.steps.cloneProposal.description', {
    defaultMessage: 'Re-offers a failed proposal as a fresh one and supersedes the original.',
  }),
  category: StepCategory.Kibana,
  stability: 'beta',
  inputSchema: cloneProposalStepInputSchema,
  outputSchema: cloneProposalStepOutputSchema,
  documentation: {
    details: i18n.translate('xpack.proposals.steps.cloneProposal.documentation.details', {
      defaultMessage:
        'Creates an undecided copy for the same subject and writes `supersededBy` onto the original, so a failed action can be re-offered without reusing a record that already settled. The deadline and creation time are inherited rather than restarted, so a chain of retries cannot outlive the deadline the queue showed. The clone points at the same still-parked gate execution, so approving it resumes that execution.',
    }),
    examples: [
      `- name: clone_proposal
  type: proposals.cloneProposal
  with:
    proposalId: "{{ variables.current_proposal_id }}"
    executionError: "{{ steps.execute_action.error.message }}"`,
    ],
  },
};

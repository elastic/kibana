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
import { proposalStatusSchema } from '../proposal';
import { optionalStepInput } from './optional_step_input';

export const UpdateProposalStepId = 'investigations.updateProposal' as const;

export const updateProposalStepInputSchema = z.object({
  proposalId: z.string().describe('Proposal to update.'),
  // Extracted from the proposal status vocabulary so the two cannot drift.
  status: proposalStatusSchema
    .extract(['executing', 'succeeded', 'failed', 'dismissed'])
    .describe('Terminal or in-flight outcome to record against the proposal.'),
  executionError: optionalStepInput(z.string()).describe('Failure detail, when the action failed.'),
});

export const updateProposalStepOutputSchema = z.object({
  proposalId: z.string(),
  status: z.string(),
});

export const updateProposalStepCommonDefinition: BaseStepDefinition<
  typeof updateProposalStepInputSchema,
  typeof updateProposalStepOutputSchema
> = {
  id: UpdateProposalStepId,
  label: i18n.translate('xpack.agenticInvestigations.steps.updateProposal.label', {
    defaultMessage: 'Update proposal',
  }),
  description: i18n.translate('xpack.agenticInvestigations.steps.updateProposal.description', {
    defaultMessage: 'Advances a proposal to a new status.',
  }),
  category: StepCategory.Kibana,
  inputSchema: updateProposalStepInputSchema,
  outputSchema: updateProposalStepOutputSchema,
  documentation: {
    details: i18n.translate(
      'xpack.agenticInvestigations.steps.updateProposal.documentation.details',
      {
        defaultMessage:
          'Advances a proposal through its execution states. Call it from an on-failure handler as well, otherwise a gate that times out leaves the proposal pending forever. A proposal that already settled cannot be moved again.',
      }
    ),
    examples: [
      `- name: update_proposal
  type: investigations.updateProposal
  with:
    proposalId: "{{ steps.create_proposal.output.proposalId }}"
    status: succeeded`,
    ],
  },
};

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

export const SaveProposalResultStepId = 'investigations.saveProposalResult' as const;

export const saveProposalResultStepInputSchema = z.object({
  proposalId: z.string().describe('Proposal whose outcome is being recorded.'),
  status: z.enum(['executing', 'succeeded', 'failed']).describe('Outcome of the action execution.'),
  executionError: optionalStepInput(z.string()).describe('Failure detail, when the action failed.'),
});

export const saveProposalResultStepOutputSchema = z.object({
  proposalId: z.string(),
  status: z.string(),
});

export const saveProposalResultStepCommonDefinition: BaseStepDefinition<
  typeof saveProposalResultStepInputSchema,
  typeof saveProposalResultStepOutputSchema
> = {
  id: SaveProposalResultStepId,
  label: i18n.translate('xpack.agenticInvestigations.steps.saveProposalResult.label', {
    defaultMessage: 'Save proposal result',
  }),
  description: i18n.translate('xpack.agenticInvestigations.steps.saveProposalResult.description', {
    defaultMessage: "Records the outcome of a proposal's action execution.",
  }),
  category: StepCategory.Kibana,
  inputSchema: saveProposalResultStepInputSchema,
  outputSchema: saveProposalResultStepOutputSchema,
  documentation: {
    details: i18n.translate(
      'xpack.agenticInvestigations.steps.saveProposalResult.documentation.details',
      {
        defaultMessage:
          'Moves a proposal to a terminal execution state. Call it from an on-failure handler as well, otherwise a gate that times out leaves the proposal pending forever.',
      }
    ),
    examples: [
      `- name: save_proposal_result
  type: investigations.saveProposalResult
  with:
    proposalId: "{{ steps.create_proposal.output.proposalId }}"
    status: succeeded`,
    ],
  },
};

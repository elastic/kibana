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

export const RecordProposalResultStepId = 'proposals.recordResult' as const;

export const recordProposalResultStepInputSchema = z.object({
  proposalId: z.string().describe('Proposal whose outcome is being recorded.'),
  status: z.enum(['executing', 'succeeded', 'failed']).describe('Outcome of the action execution.'),
  executionError: z.string().optional().describe('Failure detail, when the action failed.'),
});

export const recordProposalResultStepOutputSchema = z.object({
  proposalId: z.string(),
  status: z.string(),
});

export const recordProposalResultStepCommonDefinition: BaseStepDefinition<
  typeof recordProposalResultStepInputSchema,
  typeof recordProposalResultStepOutputSchema
> = {
  id: RecordProposalResultStepId,
  label: i18n.translate('xpack.conversationProposals.steps.recordResult.label', {
    defaultMessage: 'Record proposal result',
  }),
  description: i18n.translate('xpack.conversationProposals.steps.recordResult.description', {
    defaultMessage: "Records the outcome of a proposal's action execution.",
  }),
  category: StepCategory.Kibana,
  inputSchema: recordProposalResultStepInputSchema,
  outputSchema: recordProposalResultStepOutputSchema,
  documentation: {
    details: i18n.translate(
      'xpack.conversationProposals.steps.recordResult.documentation.details',
      {
        defaultMessage:
          'Moves a proposal to a terminal execution state. Call it from an on-failure handler as well, otherwise a gate that times out leaves the proposal pending forever.',
      }
    ),
    examples: [
      `- name: record_result
  type: proposals.recordResult
  with:
    proposalId: "{{ steps.create_proposal.output.proposalId }}"
    status: succeeded`,
    ],
  },
};

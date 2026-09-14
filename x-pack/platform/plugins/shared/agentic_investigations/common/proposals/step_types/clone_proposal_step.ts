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

export const CloneProposalStepId = 'investigations.cloneProposal' as const;

export const cloneProposalStepInputSchema = z.object({
  proposalId: z.string().describe('Id of the failed proposal being recovered.'),
  overrides: optionalStepInput(z.record(z.string(), z.unknown())).describe(
    'Field overrides applied to the clone. Only comment, actionInput, impact and confidence are honored; every other key is ignored.'
  ),
});

export const cloneProposalStepOutputSchema = z.object({
  proposalId: z.string(),
  status: z.string(),
  /** Always true today: a clone re-enters through a human gate. */
  requiresDecision: z.boolean(),
});

export const cloneProposalStepCommonDefinition: BaseStepDefinition<
  typeof cloneProposalStepInputSchema,
  typeof cloneProposalStepOutputSchema
> = {
  id: CloneProposalStepId,
  label: i18n.translate('xpack.agenticInvestigations.steps.cloneProposal.label', {
    defaultMessage: 'Clone investigation proposal',
  }),
  description: i18n.translate('xpack.agenticInvestigations.steps.cloneProposal.description', {
    defaultMessage:
      'Clones a failed proposal into a fresh pending record parked on this execution as its new gate, marking the original superseded. Recovery flow only.',
  }),
  category: StepCategory.Kibana,
  inputSchema: cloneProposalStepInputSchema,
  outputSchema: cloneProposalStepOutputSchema,
  documentation: {
    details: i18n.translate(
      'xpack.agenticInvestigations.steps.cloneProposal.documentation.details',
      {
        defaultMessage:
          'Only a failed, non-superseded, unexpired proposal can be cloned. The clone carries the original createdAt and expiresAt — the deadline does not reset — and its workflowExecutionId points at the recovery execution, so approving the clone resumes that execution.',
      }
    ),
    examples: [
      `- name: recover
  type: investigations.cloneProposal
  with:
    proposalId: "\${{ inputs.recoveryOf }}"`,
    ],
  },
};

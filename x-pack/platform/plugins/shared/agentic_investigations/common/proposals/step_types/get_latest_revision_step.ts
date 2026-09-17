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

export const GetLatestRevisionStepId = 'proposals.getLatestRevision' as const;

export const getLatestRevisionStepInputSchema = z.object({
  proposalId: z
    .string()
    .describe('Any proposal in the revision chain to resolve — not necessarily the root.'),
});

export const getLatestRevisionStepOutputSchema = z.object({
  proposalId: z.string().describe('The live revision — the input id if it was already live.'),
  revision: z.number().int().min(1),
  status: proposalStatusSchema,
  decision: proposalDecisionSchema.optional(),
});

/**
 * Resolves the live revision of a chain, per
 * https://github.com/elastic/security-team/issues/19289. The gate workflow's
 * loop carries a proposal id in a variable that a revision inserted while the
 * gate is parked invalidates; resolving through this step before writing a
 * decision keeps the write from landing on a stale, already-superseded
 * pointer.
 */
export const getLatestRevisionStepCommonDefinition: BaseStepDefinition<
  typeof getLatestRevisionStepInputSchema,
  typeof getLatestRevisionStepOutputSchema
> = {
  id: GetLatestRevisionStepId,
  label: i18n.translate('xpack.agenticInvestigations.steps.getLatestRevision.label', {
    defaultMessage: 'Get latest revision',
  }),
  description: i18n.translate('xpack.agenticInvestigations.steps.getLatestRevision.description', {
    defaultMessage: 'Resolves the current live revision of a proposal chain.',
  }),
  category: StepCategory.Kibana,
  stability: 'beta',
  inputSchema: getLatestRevisionStepInputSchema,
  outputSchema: getLatestRevisionStepOutputSchema,
  documentation: {
    details: i18n.translate(
      'xpack.agenticInvestigations.steps.getLatestRevision.documentation.details',
      {
        defaultMessage:
          'Given any proposal in a revision chain, returns the id, revision number, status and decision of whichever revision is currently live — the one with no supersededBy pointer. Use before writing a decision after a gate resumes, so the decision lands on the current revision rather than one an analyst has since revised away.',
      }
    ),
    examples: [
      `- name: resolve_latest_revision
  type: proposals.getLatestRevision
  with:
    proposalId: "{{ variables.root_proposal_id }}"`,
    ],
  },
};

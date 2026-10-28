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

export const CheckDecidePrivilegesStepId = 'proposals.checkDecidePrivileges' as const;

/**
 * Marks a principal the execution's own credentials cannot speak for.
 *
 * An external resume carries no request, so the engine wakes the pre-scheduled
 * task under the *workflow runner's* API key rather than the clicker's. The
 * execution identity is then the Worker, which necessarily holds
 * `manage_proposals` — it had to, to create the proposal — so checking it would
 * authorize every external click.
 */
const EXTERNAL_RESUME_PRINCIPAL_PREFIX = 'external_resume:' as const;

/**
 * Whether the gate was released through an external token link rather than by a
 * person. `hitl.respondedBy` is stamped as `external_resume:<stepExecutionId>`
 * on that path, and it is the only signal available: the request the step sees
 * belongs to the workflow runner either way.
 */
export const isExternalResumePrincipal = (respondedBy: string | undefined): boolean =>
  respondedBy?.startsWith(EXTERNAL_RESUME_PRINCIPAL_PREFIX) ?? false;

export const checkDecidePrivilegesStepInputSchema = z.object({
  proposalId: z.string().describe('Proposal the decision would apply to.'),
  respondedBy: optionalStepInput(z.string()).describe(
    'Who answered the gate, from its own output. Required to tell an authenticated resume apart from an external one, whose execution identity says nothing about the human.'
  ),
});

export const checkDecidePrivilegesStepOutputSchema = z.object({
  /** False for a refusal. The step does not fail, so the caller can re-park. */
  canDecide: z.boolean(),
});

export const checkDecidePrivilegesStepCommonDefinition: BaseStepDefinition<
  typeof checkDecidePrivilegesStepInputSchema,
  typeof checkDecidePrivilegesStepOutputSchema
> = {
  id: CheckDecidePrivilegesStepId,
  label: i18n.translate('xpack.proposals.steps.checkDecidePrivileges.label', {
    defaultMessage: 'Check proposal decide privileges',
  }),
  description: i18n.translate('xpack.proposals.steps.checkDecidePrivileges.description', {
    defaultMessage:
      'Reports whether whoever resumed this execution is allowed to decide the proposal.',
  }),
  category: StepCategory.Kibana,
  stability: 'beta',
  inputSchema: checkDecidePrivilegesStepInputSchema,
  outputSchema: checkDecidePrivilegesStepOutputSchema,
  documentation: {
    details: i18n.translate('xpack.proposals.steps.checkDecidePrivileges.documentation.details', {
      defaultMessage:
        'Returns false rather than failing, so a gate released by someone who cannot decide can be re-parked for someone who can. An unexpected error still fails the step, so a service fault stays distinguishable from a refusal. Call it after the gate and before any write: if the first write failed instead, the gate would already be spent and the proposal would strand with no way for a privileged approver to retry. Pass the gate\u2019s own `respondedBy`, or an external resume — whose execution identity is the workflow runner rather than the person who clicked — would be authorized as that runner.',
    }),
    examples: [
      `- name: check_privileges
  type: proposals.checkDecidePrivileges
  with:
    proposalId: "{{ variables.current_proposal_id }}"
    respondedBy: "{{ variables.decided_by }}"`,
    ],
  },
};

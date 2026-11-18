/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { StepCategory } from '@kbn/workflows';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { z, lazySchema } from '@kbn/zod/v4';

export const AwsOnboardingListIdentitiesStepTypeId = 'fleet.awsOnboardingListIdentities';

/** The render call's integration shape: one entry per package with its policy templates. */
export const awsOnboardingIacIntegrationSchema = lazySchema(() =>
  z.object({
    name: z.string(),
    policyTemplates: z.array(z.object({ name: z.string(), enabledInputs: z.array(z.string()) })),
  })
);

export const awsOnboardingIdentitySchema = lazySchema(() =>
  z.object({
    id: z.string(),
    name: z.string(),
    stack_id: z.string().optional(),
    stack_region: z.string().optional(),
    /** Digest of the template the stack was last rendered from; sent back on the next render. */
    template_sha: z.string().optional(),
    created_at: z.string(),
    /** Whether the run can update the identity's CloudFormation stack. */
    updatable: z.boolean(),
    not_updatable_reason: z.enum(['no_stack', 'other_region', 'not_managed_prefix']).optional(),
    /** What the identity's role serves today: every package policy attached to it. */
    covered_integrations: z.array(awsOnboardingIacIntegrationSchema),
    covered_policy_templates: z.array(z.string()),
  })
);

export const awsOnboardingListIdentitiesInputSchema = lazySchema(() =>
  z.object({
    /** Only identities whose role belongs to this account are listed; all when absent. */
    account_id: z.string().optional(),
  })
);

export const awsOnboardingListIdentitiesOutputSchema = lazySchema(() =>
  z.object({
    identities: z.array(awsOnboardingIdentitySchema),
  })
);

export type AwsOnboardingIdentity = z.infer<typeof awsOnboardingIdentitySchema>;
export type AwsOnboardingListIdentitiesInput = z.infer<
  typeof awsOnboardingListIdentitiesInputSchema
>;
export type AwsOnboardingListIdentitiesOutput = z.infer<
  typeof awsOnboardingListIdentitiesOutputSchema
>;

export const awsOnboardingListIdentitiesCommonDefinition: CommonStepDefinition<
  typeof awsOnboardingListIdentitiesInputSchema,
  typeof awsOnboardingListIdentitiesOutputSchema
> = {
  id: AwsOnboardingListIdentitiesStepTypeId,
  label: i18n.translate('xpack.fleet.workflows.steps.awsOnboardingListIdentities.label', {
    defaultMessage: 'List AWS Federated Identities',
  }),
  description: i18n.translate(
    'xpack.fleet.workflows.steps.awsOnboardingListIdentities.description',
    {
      defaultMessage:
        'List the AWS cloud connectors of the account with what each one covers and whether its CloudFormation stack can be updated.',
    }
  ),
  category: StepCategory.Kibana,
  inputSchema: awsOnboardingListIdentitiesInputSchema,
  outputSchema: awsOnboardingListIdentitiesOutputSchema,
};

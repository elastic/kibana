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

import { awsOnboardingIacIntegrationSchema, awsOnboardingIdentitySchema } from './list_identities';
import { awsOnboardingPlanIdentitySchema, awsOnboardingSettingsAnswerSchema } from './settings';

export const AwsOnboardingResolveStepTypeId = 'fleet.awsOnboardingResolve';

export const awsOnboardingResolveInputSchema = lazySchema(() =>
  z.object({
    /** The services picked in the selection pause; set only when discovery ran. */
    selected_services: z.array(z.string()).optional(),
    /** The services the run was started with; used when there was no selection pause. */
    services: z.array(z.string()).optional(),
    region: z.string(),
    namespace: z.string().optional(),
    account_id: z.string().optional(),
    /** Short per-run suffix that keeps policy and connector names unique across runs. */
    run_suffix: z.string().optional(),
    /** The per-service collection settings the user settled in the plan pause. */
    settings: awsOnboardingSettingsAnswerSchema,
    /** Policy name per service id; a service without one gets the default name. */
    policy_names: z.record(z.string().max(256), z.string().trim().min(1).max(256)).optional(),
    /** The Federated Identity the plan names: a new one, or a listed one to reuse. */
    identity: awsOnboardingPlanIdentitySchema,
    /** The account's existing identities, which a reused one must be among. */
    identities: z.array(awsOnboardingIdentitySchema).optional(),
  })
);

const policyBodySchema = lazySchema(() =>
  z.object({
    name: z.string(),
    namespace: z.string(),
    package: z.object({ name: z.literal('aws'), version: z.string() }),
    policy_template: z.string(),
    inputs: z.record(z.string(), z.unknown()),
    vars: z.record(z.string(), z.unknown()).optional(),
  })
);

export const awsOnboardingResolveOutputSchema = lazySchema(() =>
  z.object({
    package_name: z.literal('aws'),
    package_version: z.string(),
    integrations: z.array(awsOnboardingIacIntegrationSchema),
    policies: z.array(
      z.object({
        service: z.string(),
        name: z.string(),
        body: policyBodySchema,
      })
    ),
    index_patterns: z.array(z.string()),
    /** Policy templates and input types the identity will be granted, one entry per template. */
    permissions_summary: z.array(z.string()),
    suggested_identity_name: z.string(),
    identity_name: z.string(),
    /**
     * What the run does to the Federated Identity stack: create a new one, update the reused
     * identity's stack, or leave a reused identity's stack alone because the run cannot update it.
     */
    stack_action: z.enum(['create', 'update', 'none']),
    /** The reused identity's stack; set on update only. */
    stack_id: z.string().optional(),
    /** The reused identity's connector; set on reuse only. */
    cloud_connector_id: z.string().optional(),
    /** Policy templates and inputs the run adds to what the identity's role covers. */
    added_policy_templates: z.array(z.string()),
    /** What the identity's stack is rendered for: the run's integrations plus what it covers. */
    stack_integrations: z.array(awsOnboardingIacIntegrationSchema),
  })
);

export type AwsOnboardingResolveInput = z.infer<typeof awsOnboardingResolveInputSchema>;
export type AwsOnboardingResolveOutput = z.infer<typeof awsOnboardingResolveOutputSchema>;

export const awsOnboardingResolveCommonDefinition: CommonStepDefinition<
  typeof awsOnboardingResolveInputSchema,
  typeof awsOnboardingResolveOutputSchema
> = {
  id: AwsOnboardingResolveStepTypeId,
  label: i18n.translate('xpack.fleet.workflows.steps.awsOnboardingResolve.label', {
    defaultMessage: 'Resolve AWS onboarding plan',
  }),
  description: i18n.translate('xpack.fleet.workflows.steps.awsOnboardingResolve.description', {
    defaultMessage:
      'Turn the chosen AWS services into the integrations, agentless policy bodies and index patterns needed to onboard them.',
  }),
  category: StepCategory.Kibana,
  inputSchema: awsOnboardingResolveInputSchema,
  outputSchema: awsOnboardingResolveOutputSchema,
};
